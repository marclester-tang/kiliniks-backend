import { SQSEvent } from 'aws-lambda';

export const handler = async (event: SQSEvent) => {
    console.log('Email Worker processing event:', JSON.stringify(event, null, 2));
    for (const record of event.Records) {
        console.log('Message Body:', record.body);
        // TODO: Send email
    }
    return;
};
