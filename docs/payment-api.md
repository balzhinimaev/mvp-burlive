# Payment API Documentation

## Создание платежа

### POST /api/v2/payments/create

Создает новый платеж через YooKassa API и возвращает URL для оплаты.

**🔒 Требования безопасности:**
- JWT токен в заголовке Authorization: Bearer <token>
- Токен получается через /auth/verify после Telegram аутентификации
- Максимум 10 незавершенных платежей за 5 минут
- userId берется из JWT токена (защита от IDOR)

#### Запрос

**Заголовки:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "product": "monthly",
  "returnUrl": "https://burlive.ru/payment/success",
  "description": "BurLive - месячная подписка (30 дней) • 299 ₽"
}
```

**Примечание:** `userId` больше не передается в теле запроса - он берется из JWT токена для безопасности.

#### Параметры

- `userId` (string, обязательный) - ID пользователя
- `product` (string, обязательный) - Тип подписки: "monthly", "quarterly", "yearly"
- `returnUrl` (string, обязательный) - URL для возврата после оплаты
- `description` (string, опциональный) - Описание платежа

#### Ответ

```json
{
  "paymentUrl": "https://yoomoney.ru/api-pages/v2/payment-confirm/epl?orderId=23d93cac-000f-5000-8000-126628f15141",
  "paymentId": "23d93cac-000f-5000-8000-126628f15141"
}
```

#### Особенности

- Цена автоматически рассчитывается на основе когорты пользователя
- Поддерживается система скидок для разных типов пользователей
- Генерируется уникальный ключ идемпотентности
- Логируется событие создания платежа
- Автоматически формируется чек с email пользователя (или fallback на userId@burlive.ru)
- Информативное описание платежа с указанием срока подписки и цены

#### Примеры описаний платежей

- **Месячная подписка**: "Инглиш в ТГ - месячная подписка (30 дней) • 299 ₽"
- **Квартальная подписка**: "Инглиш в ТГ - квартальная подписка (90 дней) • 799 ₽"  
- **Годовая подписка**: "Инглиш в ТГ - годовая подписка (365 дней) • 2999 ₽"

#### 🧪 Тестовые платежи (10₽)

Для тестирования на боевом магазине YooKassa используйте userId, содержащий слово "test":

**1. Создайте тестового пользователя:**
```bash
POST /api/v2/auth/test-user
Content-Type: application/json

{
  "userId": "test_user_1272270574",
  "firstName": "Test User",
  "email": "test@example.com"
}
```

**2. Создайте тестовый платеж:**
```bash
POST /api/v2/payments/create
Content-Type: application/json

{
  "userId": "test_user_1272270574",
  "product": "monthly",
  "returnUrl": "https://example.com/success"
}
```

**Примеры тестовых userId:**
- `1272270574` (специальный тестовый ID)
- `test_user_123`
- `user_test_456` 
- `test_payment_789`

**Тестовые цены:**
- Месячная подписка: **10₽**
- Квартальная подписка: **10₽**
- Годовая подписка: **10₽**

**Описание тестового платежа:**
`[ТЕСТ] Инглиш в ТГ - месячная подписка (30 дней) • 10 ₽`

## Получение статуса платежа

### GET /api/v2/payments/status?paymentId={paymentId}

Получает текущий статус платежа из YooKassa.

#### Параметры запроса

- `paymentId` (string, обязательный) - ID платежа в YooKassa

#### Ответ

```json
{
  "status": "succeeded",
  "paid": true
}
```

#### Возможные статусы

- `pending` - Ожидает оплаты
- `succeeded` - Успешно оплачен
- `canceled` - Отменен

## Webhook для обработки уведомлений

### POST /api/v2/payments/webhook/yookassa

Обрабатывает уведомления от YooKassa о статусе платежа.

#### Заголовки

- `Idempotence-Key` - Ключ идемпотентности от YooKassa

#### Тело запроса

```json
{
  "event": "payment.succeeded",
  "object": {
    "id": "23d93cac-000f-5000-8000-126628f15141",
    "amount": {
      "value": "100.00",
      "currency": "RUB"
    },
    "metadata": {
      "userId": "12345",
      "product": "monthly"
    }
  }
}
```

## Настройка окружения

Добавьте в `.env` файл:

```env
YOOKASSA_SHOP_ID=your_shop_id_here
YOOKASSA_SECRET_KEY=your_secret_key_here
YOOKASSA_API_URL=https://api.yookassa.ru/v3
JWT_SECRET=your-super-secret-jwt-key-here
```

## Примеры использования

### 1. Получение JWT токена

```bash
curl -X GET "https://burlive.ru/api/v2/auth/verify?user=%7B%22id%22%3A12345%7D&auth_date=1735862400&hash=REAL_HASH"
```

**Ответ:**
```json
{
  "userId": "12345",
  "isFirstOpen": false,
  "onboardingCompleted": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Создание платежа

```bash
curl -X POST https://burlive.ru/api/v2/payments/create \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "product": "monthly",
    "returnUrl": "https://burlive.ru/payment/success"
  }'
```

### Проверка статуса

```bash
curl -X GET "https://burlive.ru/api/v2/payments/status?paymentId=23d93cac-000f-5000-8000-126628f15141"
```

## Интеграция с фронтендом

1. Получите URL для оплаты через `/api/v2/payments/create`
2. Перенаправьте пользователя на `paymentUrl`
3. После оплаты пользователь вернется на `returnUrl`
4. Проверьте статус платежа через `/api/v2/payments/status`
5. Webhook автоматически обновит подписку пользователя при успешной оплате
