import { Body, Controller, Headers, HttpCode, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { PaymentsService } from './payments.service';
import { TelegramAuthGuard } from '../common/guards/telegram-auth.guard';

class YooKassaWebhookDto {
  event!: string; // e.g., 'payment.succeeded'
  object!: any;  // full YooKassa payment object
}

class CreatePaymentDto {
  @IsString()
  userId!: string;

  @IsString()
  @IsIn(['monthly', 'quarterly', 'yearly'])
  product!: 'monthly' | 'quarterly' | 'yearly';

  @IsString()
  returnUrl!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Create payment endpoint
  @Post('create')
  @HttpCode(201)
  @UseGuards(TelegramAuthGuard) // 🔒 Require authentication
  @ApiOperation({ summary: 'Create payment via YooKassa' })
  @ApiBody({ type: CreatePaymentDto })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPayment(createPaymentDto);
  }

  // Get payment status
  @Get('status')
  @ApiOperation({ summary: 'Get payment status' })
  @ApiQuery({ name: 'paymentId', description: 'YooKassa payment ID' })
  async getPaymentStatus(@Query('paymentId') paymentId: string) {
    return this.paymentsService.getPaymentStatus(paymentId);
  }

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


