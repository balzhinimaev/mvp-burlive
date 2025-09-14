# 🧪 Тестирование JWT аутентификации

## 1. Получение JWT токена

```bash
# Сначала получите JWT токен через Telegram verify
GET /api/v2/auth/verify?user=%7B%22id%22%3A1272270574%7D&auth_date=1735862400&hash=REAL_HASH

# Ответ:
{
  "userId": "1272270574",
  "isFirstOpen": false,
  "onboardingCompleted": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 2. Создание платежа с JWT

```bash
# Используйте токен в заголовке Authorization
POST /api/v2/payments/create
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "product": "monthly",
  "returnUrl": "https://example.com/success"
}

# Ответ:
{
  "paymentUrl": "https://yoomoney.ru/api-pages/v2/payment-confirm/...",
  "paymentId": "23d93cac-000f-5000-8000-126628f15141"
}
```

## 3. Безопасность

✅ **Защищено от IDOR:** userId берется из JWT токена, нельзя подставить чужой ID
✅ **Защищено от подделки:** JWT подписан секретным ключом
✅ **Временные токены:** действуют 24 часа
✅ **Rate limiting:** максимум 10 платежей за 5 минут

## 4. Ошибки

```bash
# Без токена
POST /api/v2/payments/create
# 401 Unauthorized

# С неверным токеном
POST /api/v2/payments/create
Authorization: Bearer invalid-token
# 401 Unauthorized

# С истекшим токеном
POST /api/v2/payments/create
Authorization: Bearer expired-token
# 401 Unauthorized
```
