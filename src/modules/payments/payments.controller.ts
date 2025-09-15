import { Body, Controller, Headers, HttpCode, Post, Get, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as ipaddr from 'ipaddr.js';

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
   * Check if IP address is in allowed range using ipaddr.js
   * Supports both IPv4 and IPv6 with proper CIDR notation
   */
  private isIPAllowed(clientIP: string, allowedRanges: string[]): boolean {
    if (clientIP === 'unknown') return false;
    
    // Handle forwarded IP (take first one if multiple)
    const cleanIP = clientIP.split(',')[0].trim();
    
    try {
      // Parse IP address
      const addr = ipaddr.process(cleanIP);
      
      for (const range of allowedRanges) {
        if (range.includes('/')) {
          // CIDR range
          const [network, prefixStr] = range.split('/');
          const prefix = parseInt(prefixStr);
          
          try {
            const networkAddr = ipaddr.process(network);
            
            // Check that IP types match (IPv4 with IPv4, IPv6 with IPv6)
            if (addr.kind() !== networkAddr.kind()) {
              continue;
            }
            
            // Check if IP is in range
            if (addr.match(networkAddr, prefix)) {
              this.logger.log(`✅ IP ${cleanIP} matches range ${range}`);
              return true;
            }
          } catch (error: any) {
            this.logger.warn(`Invalid network range: ${range} - ${error.message}`);
            continue;
          }
        } else {
          // Exact IP match
          try {
            const allowedAddr = ipaddr.process(range);
            if (addr.toString() === allowedAddr.toString()) {
              this.logger.log(`✅ IP ${cleanIP} exactly matches ${range}`);
              return true;
            }
          } catch (error: any) {
            this.logger.warn(`Invalid IP address: ${range} - ${error.message}`);
            continue;
          }
        }
      }
      
      this.logger.warn(`❌ IP ${cleanIP} not in allowed ranges`);
      return false;
      
    } catch (error: any) {
      this.logger.error(`Invalid client IP format: ${cleanIP} - ${error.message}`);
      return false;
    }
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
    
    // Determine IP type using ipaddr.js
    try {
      const cleanIP = clientIP.split(',')[0].trim();
      if (cleanIP !== 'unknown') {
        const addr = ipaddr.process(cleanIP);
        this.logger.log(`🔍 IP Type: ${addr.kind()}`);
      } else {
        this.logger.log(`🔍 IP Type: unknown`);
      }
    } catch (error: any) {
      this.logger.log(`🔍 IP Type: invalid (${error.message})`);
    }
    
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
      return { ok: false };
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


