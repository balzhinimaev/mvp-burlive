import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppEvent, EventDocument } from '../common/schemas/event.schema';

@Injectable()
export class EventsService {
  constructor(@InjectModel(AppEvent.name) private readonly eventModel: Model<EventDocument>) {}

  async track(userId: number, name: AppEvent['name'], properties?: Record<string, any>) {
    await this.eventModel.create({ userId, name, properties, ts: new Date() });
  }
}


