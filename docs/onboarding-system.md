# Система онбординга для Telegram Mini App

## Цель
Реализовать проверку заполненности начальной мини-анкеты при запуске TMA. Пользователь должен указать свой уровень владения языком перед доступом к основному функционалу приложения.

## Задачи
1. При первом запуске TMA проверять, заполнена ли анкета пользователем
2. Если анкета не заполнена - блокировать доступ к основным функциям
3. Предоставить API для получения и обновления статуса онбординга
4. Сохранять уровень владения языком в профиле пользователя

## Схема данных

### User Schema
```typescript
{
  userId: number;                    // Telegram User ID
  firstName?: string;                // Имя из Telegram
  lastName?: string;                 // Фамилия из Telegram  
  username?: string;                 // Username из Telegram
  languageCode?: string;             // Код языка из Telegram
  photoUrl?: string;                 // URL фото из Telegram
  onboardingCompletedAt?: Date;      // Дата завершения онбординга
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced';  // Уровень владения языком
  firstUtm?: Record<string, string>; // UTM метки первого визита
  lastUtm?: Record<string, string>;  // UTM метки последнего визита
}
```

## API Endpoints

### 1. Верификация и получение статуса пользователя
**GET** `/auth/verify`

**Query Parameters:**
- `hash` - Telegram hash для верификации
- `user` - JSON строка с данными пользователя Telegram
- `auth_date` - Дата авторизации
- `query_id` - ID запроса (опционально)
- `start_param` - Стартовые параметры с UTM метками (опционально)

**Response:**
```json
{
  "userId": 123456789,
  "isFirstOpen": false,
  "utm": {
    "utm_source": "vk",
    "utm_campaign": "winter2024"
  },
  "onboardingCompleted": true,
  "proficiencyLevel": "intermediate"
}
```

**Описание полей:**
- `userId` - ID пользователя в Telegram
- `isFirstOpen` - Первый ли это визит пользователя
- `utm` - UTM метки (если есть в start_param)
- `onboardingCompleted` - Завершен ли онбординг
- `proficiencyLevel` - Уровень владения языком (если указан)

### 2. Получение статуса онбординга
**GET** `/auth/onboarding/status/:userId`

**Path Parameters:**
- `userId` - ID пользователя

**Response:**
```json
{
  "onboardingCompleted": false,
  "proficiencyLevel": null,
  "onboardingRequired": true
}
```

**Описание полей:**
- `onboardingCompleted` - Завершен ли онбординг
- `proficiencyLevel` - Уровень владения языком или null
- `onboardingRequired` - Требуется ли прохождение онбординга

### 3. Завершение онбординга
**PATCH** `/profile/onboarding/complete`

**Request Body:**
```json
{
  "userId": 123456789,
  "proficiencyLevel": "beginner"
}
```

**Required Fields:**
- `userId` - ID пользователя
- `proficiencyLevel` - Уровень владения языком: `"beginner"` | `"intermediate"` | `"advanced"`

**Response:**
```json
{
  "ok": true
}
```

### 4. Получение профиля пользователя
**GET** `/profile/:userId`

**Path Parameters:**
- `userId` - ID пользователя

**Response:**
```json
{
  "user": {
    "userId": 123456789,
    "firstName": "Иван",
    "lastName": "Петров",
    "username": "ivan_petrov",
    "languageCode": "ru",
    "photoUrl": "https://t.me/i/userpic/320/...",
    "onboardingCompletedAt": "2024-01-15T10:30:00.000Z",
    "proficiencyLevel": "intermediate",
    "firstUtm": {
      "utm_source": "vk"
    },
    "lastUtm": {
      "utm_source": "telegram"
    }
  }
}
```

## Логика работы OnboardingGuard

### Защищенные endpoints:
- `GET /content/lesson1` - Доступ к урокам
- `GET /content/paywall` - Информация о подписках
- `GET /entitlements/:userId` - Права доступа пользователя
- `POST /events` - Отправка событий аналитики
- Все остальные основные функции приложения

### Незащищенные endpoints:
- `GET /content/onboarding` - Информация об онбординге
- `GET /auth/verify` - Верификация пользователя
- `GET /auth/onboarding/status/:userId` - Статус онбординга
- `PATCH /profile/onboarding/complete` - Завершение онбординга
- `POST /payments/webhook` - Webhook от платежных провайдеров

## Сценарий использования

1. **Запуск TMA:** Пользователь открывает мини-приложение
2. **Верификация:** Frontend вызывает `GET /auth/verify` с Telegram WebApp initData
3. **Проверка онбординга:** Если `onboardingCompleted: false`, показываем экран анкеты
4. **Заполнение анкеты:** Пользователь выбирает уровень владения языком
5. **Сохранение:** Frontend вызывает `PATCH /profile/onboarding/complete`
6. **Доступ к функциям:** После завершения онбординга открывается доступ к основным функциям

## Уровни владения языком

- `beginner` - Начинающий
- `intermediate` - Средний уровень  
- `advanced` - Продвинутый уровень

## Технические детали

- Guard проверяет наличие `onboardingCompletedAt` в записи пользователя
- При отсутствии онбординга Guard добавляет флаги в request для обработки контроллером
- Система поддерживает как мягкую блокировку (информирование), так и жесткую (отказ в доступе)
- Все изменения обратно совместимы с существующими клиентами
