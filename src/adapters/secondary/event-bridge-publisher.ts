import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { EventPublisher } from "../../core/types";

export class EventBridgePublisher implements EventPublisher {
    private client = new EventBridgeClient({});

    constructor(private busName: string) {}

    async publish(eventName: string, data: any): Promise<void> {
        console.log(`Publishing event ${eventName} to ${this.busName}`);
        try {
            await this.client.send(new PutEventsCommand({
                Entries: [{
                    EventBusName: this.busName,
                    Source: 'kiliniks.appointments',
                    DetailType: eventName,
                    Detail: JSON.stringify(data),
                }]
            }));
        } catch (error) {
            console.error("Failed to publish event", error);
            // Don't fail the request? Or do? usually non-blocking or retry.
        }
    }
}
