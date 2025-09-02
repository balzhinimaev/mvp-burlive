import { Body, Controller, Post } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async ingest(
    @Body()
    body: { userId: number; name: 'open_app' | 'start_lesson' | 'complete_lesson_1' | 'paywall_view' | 'purchase_success'; properties?: Record<string, any> },
  ) {
    await this.eventsService.track(body.userId, body.name, body.properties);
    return { ok: true };
  }
}


