import { Controller, Get, Param } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';

@Controller('entitlements')
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get(':userId')
  async get(@Param('userId') userId: string) {
    const ent = await this.entitlementsService.getActiveEntitlement(Number(userId));
    return { entitlement: ent };
  }
}


