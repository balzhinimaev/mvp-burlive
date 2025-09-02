import { Controller, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('verify')
  async verify(
    @Query() query: Record<string, string>,
  ): Promise<{ userId: number; utm?: Record<string, string> }> {
    const params = new URLSearchParams(query as any);
    return this.authService.verifyTelegramInitData(params);
  }
}


