import { EventPublisher } from "../../core/types";

export class ConsolePublisher implements EventPublisher {
    async publish(eventName: string, data: any): Promise<void> {
        console.log(`[EventPublished] ${eventName}:`, JSON.stringify(data, null, 2));
    }
}
