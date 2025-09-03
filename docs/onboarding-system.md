# English Learning Platform - Onboarding System

## Goal
Implement onboarding questionnaire validation for Telegram Mini App. Users must specify their English proficiency level and learning goals before accessing the main functionality of the English learning platform.

## Tasks
1. Check if user completed initial questionnaire on TMA launch
2. Block access to main features if questionnaire is not completed
3. Provide API for getting and updating onboarding status
4. Save English proficiency level and learning goals in user profile

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
  onboardingCompletedAt?: Date;      // Date when onboarding was completed
  englishLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';  // English proficiency level (CEFR)
  learningGoals?: string[];          // User's learning goals
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
  "englishLevel": "B1",
  "learningGoals": ["business_english", "travel", "conversation"]
}
```

**Описание полей:**
- `userId` - ID пользователя в Telegram
- `isFirstOpen` - Первый ли это визит пользователя
- `utm` - UTM метки (если есть в start_param)
- `onboardingCompleted` - Завершен ли онбординг
- `englishLevel` - English proficiency level (CEFR: A1-C2)
- `learningGoals` - User's selected learning goals

### 2. Получение статуса онбординга
**GET** `/auth/onboarding/status/:userId`

**Path Parameters:**
- `userId` - ID пользователя

**Response:**
```json
{
  "onboardingCompleted": false,
  "englishLevel": null,
  "learningGoals": [],
  "onboardingRequired": true
}
```

**Описание полей:**
- `onboardingCompleted` - Завершен ли онбординг
- `englishLevel` - English proficiency level or null
- `learningGoals` - User's learning goals array
- `onboardingRequired` - Требуется ли прохождение онбординга

### 3. Завершение онбординга
**PATCH** `/profile/onboarding/complete`

**Request Body:**
```json
{
  "userId": 123456789,
  "englishLevel": "A2",
  "learningGoals": ["travel", "conversation", "grammar"]
}
```

**Required Fields:**
- `userId` - ID пользователя
- `englishLevel` - English proficiency level: `"A1"` | `"A2"` | `"B1"` | `"B2"` | `"C1"` | `"C2"`
- `learningGoals` - Array of learning goals (optional)

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
    "englishLevel": "B1",
    "learningGoals": ["business_english", "travel"],
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

## English Proficiency Levels (CEFR)

- `A1` - Beginner (Can understand and use familiar everyday expressions)
- `A2` - Elementary (Can communicate in simple routine tasks)
- `B1` - Intermediate (Can deal with most situations while traveling)
- `B2` - Upper-Intermediate (Can interact with fluency and spontaneity)
- `C1` - Advanced (Can use language flexibly for social, academic purposes)
- `C2` - Proficiency (Can understand virtually everything heard or read)

## Learning Goals Options

- `conversation` - Everyday conversation skills
- `business_english` - Professional and business communication
- `travel` - Travel-related vocabulary and phrases
- `grammar` - Grammar rules and structures
- `vocabulary` - Expanding word knowledge
- `pronunciation` - Improving accent and pronunciation
- `listening` - Understanding spoken English
- `reading` - Reading comprehension skills
- `writing` - Written communication skills

## Технические детали

- Guard проверяет наличие `onboardingCompletedAt` в записи пользователя
- При отсутствии онбординга Guard добавляет флаги в request для обработки контроллером
- Система поддерживает как мягкую блокировку (информирование), так и жесткую (отказ в доступе)
- Все изменения обратно совместимы с существующими клиентами
