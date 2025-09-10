import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

class YooKassaWebhookDto {
  event!: string; // e.g., 'payment.succeeded'
  object!: any;  // full YooKassa payment object
}

@ApiTags('Payments')
@Controller('api/v2/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Generic webhook endpoint; in MVP we trust provider authenticity via shared secret or IP allowlist (to add later)
  @Post('webhook/yookassa')
  @HttpCode(200)
  @ApiOperation({ summary: 'YooKassa webhook endpoint' })
  @ApiBody({ type: YooKassaWebhookDto })
  async yookassaWebhook(
    @Headers('Idempotence-Key') idempotenceKeyHeader: string,
    @Body() payload: YooKassaWebhookDto,
  ): Promise<{ ok: boolean }> {
    return this.paymentsService.processYooKassaWebhook(payload, idempotenceKeyHeader);
  }
}


