import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { OnboardingGuard } from '../auth/onboarding.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(OnboardingGuard)
  async ingest(
    @Body()
    body: { userId: number; name: 'open_app' | 'start_lesson' | 'complete_lesson_1' | 'paywall_view' | 'purchase_success'; properties?: Record<string, any> },
  ) {
    await this.eventsService.track(body.userId, body.name, body.properties);
    return { ok: true };
  }
}


