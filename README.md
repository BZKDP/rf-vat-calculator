# НДС Калькулятор РФ

Небольшое офлайн-приложение на React Native + Expo (iOS): обычный калькулятор + расчёт НДС РФ.

## Возможности

- Арифметика `+ − × ÷`
- Ставки НДС 20% и 10%
- Режимы «Начислить НДС» и «Выделить НДС»
- История последних расчётов в рамках сеанса
- Без логина, рекламы, аналитики, геолокации и платежей — полностью офлайн

## Запуск

```
npm install
npx expo start
```

На iPhone проект открывается в Expo Go по QR-коду.

## Сборка под iOS

```
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

Нужен свой EAS `projectId` в `app.json` и доступ к Apple Developer. Bundle ID — в `app.json`.
