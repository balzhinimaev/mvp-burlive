import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { PromoService } from './promo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('promo')
@UseGuards(JwtAuthGuard)
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Post('redeem')
  redeem(@Body() body: { promoId: string }, @Request() req: any) {
    const userId = req.user?.userId; // Get userId from JWT token
    return this.promoService.redeem(userId, body.promoId);
  }
}


