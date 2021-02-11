import { StorableEvent } from './interfaces/storable-event';
import * as eventstore from 'eventstore';
import { IEvent } from '@nestjs/cqrs';

export interface EventStoreInterface {
  getFromSnapshot: (query, revMax, callback?) => void;
  getEvents: (query, skip?, limit?, callback?) => void;
  getEventStream: (query, revMin?, revMax?, callback?) => void;
}

interface NodeEventStoreInterface extends EventStoreInterface {
  init: (callback) => void;
}

export interface EventStoreOptions {
  storeImpl?: EventStoreInterface;
  options?: {};
}

export class EventStore {
  private readonly eventstore: EventStoreInterface | NodeEventStoreInterface;
  private eventStoreLaunched = false;

  constructor(private options: EventStoreOptions) {
    this.options = this.options || {};

    // If custom event store implementation provided, assume it is already launched
    if (this.options.storeImpl) {
      this.eventstore = this.options.storeImpl;
      this.eventStoreLaunched = true;
      return;
    }

    this.eventstore = eventstore(this.options);
    this.getNodeEventStore().init(err => {
      if (err) {
        throw err;
      }
      this.eventStoreLaunched = true;
    });
  }

  private getNodeEventStore(): NodeEventStoreInterface {
    return this.eventstore as NodeEventStoreInterface;
  }

  public isInitiated(): boolean {
    return this.eventStoreLaunched;
  }

  public async getEvents(
    aggregate: string,
    id: string,
  ): Promise<StorableEvent[]> {
    return new Promise<StorableEvent[]>(resolve => {
      this.eventstore.getFromSnapshot(
        this.getAgrregateId(aggregate, id),
        (err, snapshot, stream) => {
          // snapshot.data; // Snapshot
          resolve(
            stream.events.map(event =>
              this.getStorableEventFromPayload(event.payload),
            ),
          );
        },
      );
    });
  }

  public async getEvent(index: number): Promise<StorableEvent> {
    return new Promise<StorableEvent>((resolve, reject) => {
      this.eventstore.getEvents(index, 1, (err, events) => {
        if (events.length > 0) {
          resolve(this.getStorableEventFromPayload(events[0].payload));
        } else {
          resolve(null);
        }
      });
    });
  }

  public async storeEvent<T extends IEvent>(event: T): Promise<void> {
    if (!StorableEvent.isStorableEvent(event)) return;
    const storableEvent = event as any as StorableEvent;
    return new Promise<void>((resolve, reject) => {
      if (!this.eventStoreLaunched) {
        reject('Event Store not launched!');
        return;
      }
      this.eventstore.getEventStream(
        {
          aggregateId: this.getAgrregateId(storableEvent.eventAggregate, storableEvent.id),
          aggregate: storableEvent.eventAggregate,
        },
        (err, stream) => {
          if (err) {
            reject(err);
            return;
          }
          stream.addEvent(event);
          stream.commit(commitErr => {
            if (commitErr) {
              reject(commitErr);
            }
            resolve();
          });
        },
      );
    });
  }

  // Monkey patch to obtain event 'instances' from db
  private getStorableEventFromPayload(payload: any): StorableEvent {
    const eventPlain = payload;
    eventPlain.constructor = { name: eventPlain.eventName };

    return Object.assign(Object.create(eventPlain), eventPlain);
  }

  private getAgrregateId(aggregate: string, id: string): string {
    return aggregate + '-' + id;
  }
}
