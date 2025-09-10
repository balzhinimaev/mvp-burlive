# 🔒 Миграция проверки ответов: от клиента к серверу

## 🚨 **Проблема была в том, что:**

1. **Фронтенд получал правильные ответы** через `/content/lessons/:lessonRef`
2. **Фронтенд сам определял правильность** и отправлял `isCorrect: true/false`
3. **Сервер принимал это на веру** без проверки

## ✅ **Теперь исправлено:**

1. **Правильные ответы убраны из API** (рекурсивная функция `redact()`)
2. **Создан новый безопасный эндпоинт** `POST /progress/submit-answer`
3. **Валидация происходит на сервере** с использованием `AnswerValidatorService`

---

## 🔍 **Как проверить в продакшене:**

### 1. Проверить утечку ответов:
```bash
# Должно НЕ содержать поля: correctIndex, answer, expected, target
curl "https://your-api.com/content/lessons/a0.basics.001?userId=123456&lang=ru"
```

### 2. Проверить новый безопасный эндпоинт:
```bash
curl -X POST "https://your-api.com/progress/submit-answer" \
  -H "Content-Type: application/json" \
  -H "idempotency-key: test-123" \
  -d '{
    "userId": "123456",
    "lessonRef": "a0.basics.001",
    "taskRef": "a0.basics.001.t1",
    "userAnswer": "Hello"
  }'
```

**Ожидаемый ответ:**
```json
{
  "attemptId": "...",
  "isCorrect": true,
  "score": 1.0,
  "feedback": "Correct!",
  "correctAnswer": "Hello"
}
```

---

## 🔄 **Миграция фронтенда (2 этапа):**

### **Этап 1: Постепенный переход**

Фронтенд может использовать **оба** эндпоинта параллельно:

```javascript
// Новый безопасный способ
async function submitAnswer(taskRef, userAnswer) {
  const response = await fetch('/progress/submit-answer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'idempotency-key': generateUniqueId()
    },
    body: JSON.stringify({
      userId: currentUserId,
      lessonRef: currentLessonRef,
      taskRef: taskRef,
      userAnswer: userAnswer,
      // Больше НЕ отправляем isCorrect и correctAnswer!
    })
  });
  
  const result = await response.json();
  
  // Сервер возвращает результат проверки
  showFeedback(result.isCorrect, result.feedback, result.correctAnswer);
  
  return result;
}
```

### **Этап 2: Полный переход**

После обновления фронтенда удалить старый эндпоинт `/progress/attempts`.

---

## 📋 **Как работает валидация на сервере:**

### **Choice/Multiple Choice:**
```json
// Фронтенд отправляет индекс выбранного варианта
"userAnswer": "1"

// Сервер проверяет с correctIndex из базы
```

### **Gap (заполнение пропусков):**
```json
// Фронтенд отправляет введенный текст
"userAnswer": "apple"

// Сервер проверяет с answer + alternatives из базы
```

### **Order (упорядочивание):**
```json
// Фронтенд отправляет массив слов
"userAnswer": "[\"What\", \"time\", \"is\", \"it\", \"?\"]"

// Сервер проверяет порядок + частичные баллы
```

### **Translate (перевод):**
```json
// Фронтенд отправляет перевод
"userAnswer": "How much is it?"

// Сервер проверяет со всеми вариантами из expected[]
```

### **Listen/Speak (аудио):**
```json
// Фронтенд отправляет распознанный/произнесенный текст
"userAnswer": "Hello, how are you?"

// Сервер сравнивает с target + similarity scoring
```

---

## 🔧 **Технические детали:**

### **Новые файлы:**
- `src/modules/progress/dto/submit-answer.dto.ts` - DTO для нового эндпоинта
- `src/modules/progress/answer-validator.service.ts` - Сервис валидации ответов
- `src/modules/common/guards/telegram-auth.guard.ts` - Улучшенная аутентификация

### **Обновленные файлы:**
- `src/modules/progress/progress.controller.ts` - Новый эндпоинт `/submit-answer`
- `src/modules/progress/progress.module.ts` - Регистрация новых сервисов
- `src/modules/common/utils/mappers.ts` - Удаление ответов из API

---

## 🛡️ **Преимущества новой архитектуры:**

1. **🔒 Безопасность:** Правильные ответы не передаются на клиент
2. **🎯 Точность:** Умная проверка с учетом альтернативных вариантов
3. **📊 Аналитика:** Сервер видит реальные ответы пользователей
4. **🚀 Масштабируемость:** Можно добавить ML-валидацию, античит и др.
5. **🔧 Гибкость:** Частичные баллы, подсказки, объяснения

---

## ⚡ **Быстрая проверка работоспособности:**

```bash
# 1. Проверить, что сборка прошла успешно
npm run build

# 2. Проверить валидацию контента (не должно быть утечек)
npm run validate:content

# 3. Запустить приложение
npm run start:dev

# 4. Протестировать новый эндпоинт (см. curl выше)
```

---

## 🔄 **План развертывания:**

### **Немедленно:**
1. ✅ Деплой с новым эндпоинтом (обратно совместимо)
2. ✅ Проверить отсутствие утечки ответов в API

### **В течение недели:**
1. 🔄 Обновить фронтенд для использования `/submit-answer`
2. 🔄 Протестировать на staging

### **Через 2 недели:**
1. 📊 Удалить старый эндпоинт `/attempts`
2. 🎯 Добавить расширенную валидацию и античит

Теперь ваша система безопасна! 🚀
