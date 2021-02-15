import { ViewUpdaters } from '../view-updaters';
import { IEvent } from '@nestjs/cqrs';
import { Type } from '@nestjs/common';
import { StorableEvent } from '../../interfaces';

export function ViewUpdaterHandler(event: Type<IEvent>, eventName?: string) {
    return (target: any) => {
        if (StorableEvent.isStorableEvent(event)) {
            ViewUpdaters.add(eventName || event.constructor.name, target);
        }
    };
}
