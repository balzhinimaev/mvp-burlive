# Миграция на ConfigService

Этот документ описывает процесс миграции кода с прямого использования `process.env` на `ConfigService` из `@nestjs/config`.

## Текущее состояние

Создана конфигурационная система с валидацией переменных окружения:
- ✅ `src/config/configuration.ts` - конфигурация приложения
- ✅ `src/config/validation.schema.ts` - схема валидации с Joi
- ✅ `src/app.module.ts` - обновлен для использования валидации
- ✅ `src/main.ts` - обновлен для использования ConfigService
- ✅ `.env.example` - пример файла с переменными
- ✅ `ENV_VARIABLES.md` - документация по переменным

## Как использовать ConfigService

### В сервисах

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private readonly configService: ConfigService) {}

  someMethod() {
    // Получение значения через конфигурацию
    const dbUri = this.configService.get<string>('app.database.uri');
    const jwtSecret = this.configService.get<string>('app.auth.jwtSecret');
    
    // С значением по умолчанию
    const port = this.configService.get<number>('app.port', 7777);
    
    // Опциональные значения
    const botApiUrl = this.configService.get<string>('app.botApi.url');
  }
}
```

### В модулях

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    SomeModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('app.database.uri'),
        dbName: configService.get<string>('app.database.dbName'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class MyModule {}
```

## Файлы, требующие обновления

Следующие файлы все еще используют `process.env` напрямую и должны быть обновлены:

1. **src/modules/auth/auth.service.ts**
   - `process.env.TELEGRAM_BOT_TOKEN` → `configService.get('app.auth.telegramBotToken')`

2. **src/modules/auth/auth.module.ts**
   - `process.env.JWT_SECRET` → `configService.get('app.auth.jwtSecret')`

3. **src/modules/auth/jwt.strategy.ts**
   - `process.env.JWT_SECRET` → `configService.get('app.auth.jwtSecret')`

4. **src/modules/payments/payments.service.ts**
   - `process.env.YOOKASSA_API_URL` → `configService.get('app.payment.yookassaApiUrl')` (опционально)
   - `process.env.YOOKASSA_SHOP_ID` → `configService.get('app.payment.yookassaShopId')` (опционально)
   - `process.env.YOOKASSA_SECRET_KEY` → `configService.get('app.payment.yookassaSecretKey')` (опционально)
   - `process.env.BOT_API_URL` → `configService.get('app.botApi.url')` (опционально)
   - `process.env.BOT_API_KEY` → `configService.get('app.botApi.key')` (опционально)
   - `process.env.SELF_EMPLOYED_INN` → `configService.get('app.payment.selfEmployedInn')` (опционально)
   
   **Примечание**: Переменные YooKassa теперь опциональны. Если они не настроены, методы создания платежей будут выбрасывать `BadRequestException` с сообщением "YooKassa credentials not configured".

5. **src/modules/auth/auth.controller.ts**
   - `process.env.NODE_ENV` → `configService.get('app.nodeEnv')`

6. **src/modules/common/guards/telegram-auth.guard.ts**
   - `process.env.NODE_ENV` → `configService.get('app.nodeEnv')`

## Преимущества использования ConfigService

1. **Валидация**: Все переменные проверяются при запуске приложения
2. **Типобезопасность**: TypeScript знает структуру конфигурации
3. **Централизация**: Вся конфигурация в одном месте
4. **Документация**: Схема валидации служит документацией
5. **Значения по умолчанию**: Легко задавать дефолтные значения

## Пример миграции

### До:

```typescript
@Injectable()
export class PaymentsService {
  private readonly yookassaApiUrl = process.env.YOOKASSA_API_URL || 'https://api.yookassa.ru/v3';
  private readonly shopId = process.env.YOOKASSA_SHOP_ID;
  private readonly secretKey = process.env.YOOKASSA_SECRET_KEY;
}
```

### После:

```typescript
@Injectable()
export class PaymentsService {
  private readonly yookassaApiUrl: string;
  private readonly shopId: string;
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.yookassaApiUrl = this.configService.get<string>('app.payment.yookassaApiUrl');
    this.shopId = this.configService.get<string>('app.payment.yookassaShopId');
    this.secretKey = this.configService.get<string>('app.payment.yookassaSecretKey');
  }
}
```

## Проверка валидации

При запуске приложения все обязательные переменные проверяются автоматически. Если какая-то переменная отсутствует или имеет неверный формат, приложение не запустится с понятным сообщением об ошибке.

Пример ошибки:
```
Error: Config validation error: "JWT_SECRET" is required
```

