import { Injectable } from '@nestjs/common';
import { IEvent, IEventBus } from '@nestjs/cqrs/dist/interfaces';
import { EventStore } from './eventstore';
import { StorableEvent } from './interfaces/storable-event';
import { ViewEventBus } from './view/view-event-bus';

@Injectable()
export class StoreEventBus implements IEventBus {
  constructor(
    private readonly eventBus: ViewEventBus,
    private readonly eventStore: EventStore,
  ) {}

  publish<T extends IEvent>(event: T): void {
    this.eventStore
      .storeEvent(event)
      .then(() => this.eventBus.publish(event))
      .catch(err => {
        throw err;
      });
  }

  publishAll(events: IEvent[]): void {
    (events || []).forEach(event => this.publish(event));
  }
}
