import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import { KiliniksStackProps } from './common-types';
import { Networking } from './constructs/networking';
import { Database } from './constructs/database';
import { Auth } from './constructs/auth';
import { Events } from './constructs/events';
import * as path from 'path';

export class KiliniksBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: KiliniksStackProps) {
    super(scope, id, props);

    const networking = new Networking(this, 'Networking', { stage: props.stage });
    
    // const database = new Database(this, 'Database', { 
    //     vpc: networking.vpc, 
    //     stage: props.stage,
    //     clinicName: props.clinicName
    // });

    const auth = new Auth(this, 'Auth', { stage: props.stage, clinicName: props.clinicName });

    const events = new Events(this, 'Events', { clinicName: props.clinicName, stage: props.stage });

    // API Handler
    const apiHandler = new nodejs.NodejsFunction(this, 'AppointmentApiHandler', {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, '../src/adapters/primary/lambda-api.ts'),
        handler: 'handler',
        vpc: networking.vpc,
        environment: {
            EVENT_BUS_NAME: events.bus.eventBusName,
            // DB_SECRET_ARN: database.cluster.secret?.secretArn || '',
            // DB_CLUSTER_ARN: database.cluster.clusterArn,  
            DB_NAME: 'kiliniks',
        },
        bundling: {
            externalModules: ['aws-sdk', 'pg-native'],
        }
    });

    // Grant permissions
    // database.cluster.secret?.grantRead(apiHandler);
    // database.cluster.connections.allowFrom(apiHandler, cdk.aws_ec2.Port.tcp(5432));
    events.bus.grantPutEventsTo(apiHandler);

    // API Gateway
    const api = new apigateway.RestApi(this, 'KiliniksApi', {
        restApiName: `Kiliniks Api-${props.clinicName}-${props.stage}`,
        deployOptions: {
            stageName: props.stage,
        },
        defaultCorsPreflightOptions: {
            allowOrigins: apigateway.Cors.ALL_ORIGINS,
            allowMethods: apigateway.Cors.ALL_METHODS,
        }
    });
    
    // Auth
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'KiliniksAuthorizer', {
        cognitoUserPools: [auth.userPool],
    });

    const appointments = api.root.addResource('appointments');
    appointments.addMethod('POST', new apigateway.LambdaIntegration(apiHandler), {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    appointments.addMethod('GET', new apigateway.LambdaIntegration(apiHandler), { authorizer });

    const appointment = appointments.addResource('{id}');
    appointment.addMethod('GET', new apigateway.LambdaIntegration(apiHandler), { authorizer });
    appointment.addMethod('PUT', new apigateway.LambdaIntegration(apiHandler), { authorizer });
    appointment.addMethod('DELETE', new apigateway.LambdaIntegration(apiHandler), { authorizer });
    
    // Email Worker
    const emailWorker = new nodejs.NodejsFunction(this, 'EmailWorker', {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, '../src/handlers/email-worker.ts'),
        handler: 'handler',
    });

    events.emailQueue.grantConsumeMessages(emailWorker);
    emailWorker.addEventSource(new lambdaEventSources.SqsEventSource(events.emailQueue));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'UserPoolId', { value: auth.userPool.userPoolId });
    new cdk.CfnOutput(this, 'ClientId', { value: auth.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'Region', { value: this.region });
  }
}
