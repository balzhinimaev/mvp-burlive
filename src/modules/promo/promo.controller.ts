import { Body, Controller, Post } from '@nestjs/common';
import { PromoService } from './promo.service';

@Controller('promo')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Post('redeem')
  redeem(@Body() body: { userId: number; promoId: string }) {
    return this.promoService.redeem(body.userId, body.promoId);
  }
}


