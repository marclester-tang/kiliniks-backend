import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { KiliniksStackProps } from '../common-types';

interface AuthProps {
    stage: KiliniksStackProps['stage'];
    clinicName: string;
}

export class Auth extends Construct {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;

    constructor(scope: Construct, id: string, props: AuthProps) {
        super(scope, id);

        this.userPool = new cognito.UserPool(this, 'KiliniksUserPool', {
            userPoolName: `KiliniksUserPool-${props.clinicName}-${props.stage}`,
            selfSignUpEnabled: true,
            signInAliases: { email: true },
            autoVerify: { email: true },
            removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
            },
        });

        const roles = ['admin', 'staff', 'doctor', 'patient'];
        roles.forEach(role => {
            new cognito.CfnUserPoolGroup(this, `Group${role}`, {
                userPoolId: this.userPool.userPoolId,
                groupName: role,
            });
        });

        this.userPoolClient = this.userPool.addClient('KiliniksAppClient', {
            userPoolClientName: `KiliniksAppClient-${props.clinicName}-${props.stage}`,
            authFlows: {
                userSrp: true,
            },
        });
    }
}
