import { Body, Controller, Headers, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Generic webhook endpoint; in MVP we trust provider authenticity via shared secret or IP allowlist (to add later)
  @Post('webhook')
  async webhook(
    @Headers('x-idempotency-key') idempotencyKey: string,
    @Body()
    body: {
      provider: string;
      providerId: string;
      userId: number;
      product: 'monthly' | 'quarterly';
      amount: number;
      currency: string;
      status: 'succeeded' | 'pending' | 'failed';
    },
  ): Promise<{ ok: boolean }> {
    return this.paymentsService.processWebhook({ ...body, idempotencyKey });
  }
}


