import { Body, Controller, Headers, HttpCode, Post, Get, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class YooKassaWebhookDto {
  event!: string; // e.g., 'payment.succeeded'
  object!: any;  // full YooKassa payment object
}

class CreatePaymentDto {
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
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Check if IP address is in allowed range
   * Supports both IPv4 and IPv6 CIDR notation
   */
  private isIPAllowed(clientIP: string, allowedRanges: string[]): boolean {
    if (clientIP === 'unknown') return false;
    
    // For now, simple string matching (in production, use proper CIDR library)
    for (const range of allowedRanges) {
      if (range.includes('/')) {
        // CIDR notation - simplified check
        const [network, prefix] = range.split('/');
        if (clientIP.startsWith(network.split('.').slice(0, 2).join('.'))) {
          return true;
        }
      } else {
        // Exact IP match
        if (clientIP === range) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Create payment endpoint
  @Post('create')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard) // 🔒 Require JWT authentication
  @ApiOperation({ summary: 'Create payment via YooKassa' })
  @ApiBody({ type: CreatePaymentDto })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto, @Request() req: any) {
    const userId = req.user?.userId; // Get userId from JWT token
    return this.paymentsService.createPayment({ ...createPaymentDto, userId });
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
  async yookassaWebhook(
    @Headers() headers: Record<string, string>,
    @Body() payload: any, // Accept ANY body structure
  ): Promise<{ ok: boolean }> {
    const idempotenceKeyHeader = headers['idempotence-key'] || headers['Idempotence-Key'];
    const signature = headers['signature'];
    
    // Log incoming webhook request details
    this.logger.log(`🌐 YooKassa Webhook HTTP Request:`);
    this.logger.log(`Headers: ${JSON.stringify(headers, null, 2)}`);
    this.logger.log(`Idempotence Key: ${idempotenceKeyHeader || 'not provided'}`);
    this.logger.log(`Signature: ${signature || 'not provided'}`);
    this.logger.log(`Body: ${JSON.stringify(payload, null, 2)}`);
    this.logger.log(`Body Type: ${typeof payload}`);
    this.logger.log(`Body Keys: ${Object.keys(payload || {}).join(', ')}`);
    
    // Security checks according to YooKassa documentation
    const clientIP = headers['x-real-ip'] || headers['x-forwarded-for'] || 'unknown';
    this.logger.log(`🌐 Client IP: ${clientIP}`);
    
    // Check IP whitelist (YooKassa official IPs)
    const yookassaIPs = [
      '185.71.76.0/27',
      '185.71.77.0/27', 
      '77.75.153.0/25',
      '77.75.156.11',
      '77.75.156.35',
      '77.75.154.128/25',
      '2a02:5180::/32'
    ];
    
    const isIPAllowed = this.isIPAllowed(clientIP, yookassaIPs);
    this.logger.log(`🔒 IP Check: ${isIPAllowed ? '✅ ALLOWED' : '❌ BLOCKED'}`);
    
    if (!isIPAllowed) {
      this.logger.error(`🚨 BLOCKED: Webhook from unauthorized IP: ${clientIP}`);
      // In production, you might want to return 403 here
      // return { ok: false, error: 'Unauthorized IP' };
    }
    
    // Log signature status
    if (signature) {
      this.logger.log(`🔐 Webhook signature present: ${signature}`);
      this.logger.log(`⚠️  Signature verification not implemented yet`);
    } else {
      this.logger.warn(`⚠️  No signature provided - webhook may be from untrusted source`);
    }
    
    return this.paymentsService.processYooKassaWebhook(payload, idempotenceKeyHeader);
  }
}


