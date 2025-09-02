import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  ping(): { ok: boolean } {
    return { ok: true };
  }
}


