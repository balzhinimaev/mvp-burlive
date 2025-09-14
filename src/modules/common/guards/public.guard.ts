import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * PublicGuard - позволяет доступ без аутентификации
 * Используется для публичных эндпоинтов (auth/verify, webhooks, etc.)
 */
@Injectable()
export class PublicGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Всегда разрешаем доступ
    return true;
  }
}
