import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { KiliniksStackProps } from '../common-types';

interface EventsProps {
    clinicName: string;
    stage: KiliniksStackProps['stage'];
}

export class Events extends Construct {
    public readonly bus: events.EventBus;
    public readonly emailQueue: sqs.Queue;

    constructor(scope: Construct, id: string, props: EventsProps) {
        super(scope, id);

        const removalPolicy = props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;

        this.bus = new events.EventBus(this, 'KiliniksEventBus', {
            eventBusName: `KiliniksEventBus-${props.clinicName}-${props.stage}`
        });
        
        // Apply removal policy to the creation of the underlying resource if possible, or use allowCrossAccount? 
        // EventBus construct does not take removalPolicy directly in older versions? 
        // Checking docs (mental): EventBus L2 construct generally doesn't expose removalPolicy easily in all versions, 
        // but we can try applyRemovalPolicy or look for the prop. 
        // Actually EventBus DOES NOT have a removalPolicy prop in the constructor usually. 
        // We have to apply it to the underlying CfnResource.
        this.bus.applyRemovalPolicy(removalPolicy);

        this.emailQueue = new sqs.Queue(this, 'EmailQueue', {
            queueName: `KiliniksEmailQueue-${props.clinicName}-${props.stage}`,
            visibilityTimeout: cdk.Duration.seconds(30),
            removalPolicy: removalPolicy
        });

        // Rule to match appointment events
        new events.Rule(this, 'AppointmentEventsRule', {
            eventBus: this.bus,
            eventPattern: {
                source: ['kiliniks.appointments'],
                detailType: ['AppointmentCreated', 'AppointmentUpdated', 'AppointmentDeleted'],
            },
            targets: [new targets.SqsQueue(this.emailQueue)],
        });
    }
}
