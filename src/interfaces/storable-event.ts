import { IEvent } from '@nestjs/cqrs/dist/interfaces';

export abstract class StorableEvent implements IEvent {
    abstract id: string;
    abstract eventAggregate: string;
    abstract eventVersion: number;
    eventName: string;

    constructor() {
        this.eventName = this.eventName || this.constructor.name;
    }

    static isStorableEvent(event: IEvent): boolean {
        const storableEvent = event as any;
        return this.isPrototypeOf(event) || storableEvent.id &&
            storableEvent.eventAggregate &&
            storableEvent.eventVersion;
    }
}
