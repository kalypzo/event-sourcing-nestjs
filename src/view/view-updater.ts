import { Injectable, Type } from '@nestjs/common';
import { IViewUpdater } from './interfaces/view-updater';
import { IEvent } from '@nestjs/cqrs';
import { ModuleRef } from '@nestjs/core';
import { ViewUpdaters } from './view-updaters';
import { StorableEvent } from '../interfaces/storable-event';

@Injectable()
export class ViewUpdater {

    private instances = new Map<Type<IViewUpdater<IEvent>>, IViewUpdater<IEvent>>();

    constructor(
        private moduleRef: ModuleRef,
    ) {
    }

    async run<T extends IEvent>(event: T): Promise<void> {
        if (!StorableEvent.isStorableEvent(event)) return;
        const storableEvent = (event as any) as StorableEvent;
        const updater = ViewUpdaters.get(storableEvent.eventName);
        if (updater) {
            if (!this.instances.has(updater)) {
                const updaterRef = this.getUpdater(updater.name);
                this.instances.set(updater, updaterRef);
            }
            await this.instances.get(updater)?.handle(event);
        }
        return;
    }

    private getUpdater(name: string): IViewUpdater<StorableEvent> {
        try {
            return this.moduleRef.get(name, { strict: false });
        } catch (err) {
            return null;
        }
    }
}
