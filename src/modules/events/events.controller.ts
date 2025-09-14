import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async ingest(
    @Body()
    body: { 
      name: 'open_app' | 'start_lesson' | 'complete_lesson' | 'vocabulary_learned' | 'grammar_practiced' | 'speaking_completed' | 'listening_completed' | 'paywall_view' | 'purchase_success'; 
      properties?: Record<string, any> 
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId; // Get userId from JWT token
    await this.eventsService.track(userId, body.name, body.properties);
    return { ok: true };
  }
}


