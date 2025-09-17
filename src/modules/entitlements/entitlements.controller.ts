import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { OnboardingGuard } from '../auth/onboarding.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('entitlements')
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, OnboardingGuard)
  async get(@Request() req: any) {
    const userId = req.user?.userId; // Get userId from JWT token
    const ent = await this.entitlementsService.getActiveEntitlement(String(userId));
    return { entitlement: ent };
  }
}