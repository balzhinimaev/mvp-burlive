import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { AppEvent, EventSchema } from '../common/schemas/event.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: AppEvent.name, schema: EventSchema }])],
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}


