# Payment API Documentation

## Создание платежа

### POST /api/v2/payments/create

Создает новый платеж через YooKassa API и возвращает URL для оплаты.

#### Запрос

```json
{
  "userId": "12345",
  "product": "monthly",
  "returnUrl": "https://burlive.ru/payment/success",
  "description": "BurLive - месячная подписка (30 дней) • 299 ₽"
}
```

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

- **Месячная подписка**: "BurLive - месячная подписка (30 дней) • 299 ₽"
- **Квартальная подписка**: "BurLive - квартальная подписка (90 дней) • 799 ₽"  
- **Годовая подписка**: "BurLive - годовая подписка (365 дней) • 2999 ₽"

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
```

## Примеры использования

### Создание платежа

```bash
curl -X POST https://burlive.ru/api/v2/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "12345",
    "product": "monthly",
    "returnUrl": "https://burlive.ru/payment/success",
    "description": "Подписка на месяц - BurLive"
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
