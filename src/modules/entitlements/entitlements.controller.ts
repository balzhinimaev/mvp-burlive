import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { OnboardingGuard } from '../auth/onboarding.guard';

@Controller('entitlements')
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get(':userId')
  @UseGuards(OnboardingGuard)
  async get(@Param('userId') userId: string) {
    const ent = await this.entitlementsService.getActiveEntitlement(String(userId));
    return { entitlement: ent };
  }
}


