# RW Tracker

Следит за свободными местами на выбранные поезда на [pass.rw.by](https://pass.rw.by) и присылает уведомления в Telegram.

```
Телефон (PWA) ─HTTPS─> Vercel (Next.js UI + пароль) ──> Supabase Postgres (схема rw)
                                                          ▲
Любое устройство: `pnpm worker` или Docker ───────────────┘──> pass.rw.by ──> Telegram
```

- **Веб-интерфейс (Next.js):** создание трекеров, история изменений, настройки. Устанавливается как PWA с домашнего экрана телефона.
- **Воркер:** проверяет расписание каждые 30 секунд, отправляет уведомления в Telegram. Запускается на любом устройстве с Node 22+.
- **База данных:** Supabase Postgres (или локальный PGlite без настройки).
- **Уведомления:** бот в Telegram только отправляет сообщения; polling и webhook не используются.

## Установка и запуск локально

```bash
pnpm install
cp .env.example .env   # заполнить TELEGRAM_BOT_TOKEN и TELEGRAM_ALLOWED_USER_ID
pnpm dev               # Next.js на http://localhost:3000 + воркер
```

Локально база хранится в `data/pg` (PGlite). Миграции применяются автоматически при старте воркера.

### Переменные окружения

| Переменная | Описание |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен бота из @BotFather |
| `TELEGRAM_ALLOWED_USER_ID` | Ваш числовой Telegram ID (узнать у @userinfobot) |
| `APP_PASSWORD` | Пароль для веб-интерфейса (обязателен на Vercel) |
| `DATABASE_URL` | URL базы. По умолчанию `pglite:./data/pg` |
| `DEFAULT_INTERVAL_SEC` | Интервал проверки в секундах (мин. 60, по умолчанию 120) |

## Деплой на Vercel + Supabase

### 1. База данных (Supabase)

1. В [Supabase Dashboard](https://supabase.com/dashboard) откройте или создайте проект.
2. Settings → Database → **Transaction pooler** URI (порт 6543). Вставьте в `.env` как `DATABASE_URL`.
3. Примените миграции: `pnpm db:migrate` (или запустите воркер — он применяет их автоматически).

### 2. GitHub и Vercel

1. Запушьте репозиторий на GitHub.
2. В Vercel: **Add New → Project → Import** `PavelShpakovich/rw_tracker`.
3. Установите переменные окружения: `DATABASE_URL`, `APP_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USER_ID`.
4. Нажмите **Deploy**. `APP_PASSWORD` обязателен — без него Vercel вернёт 503.

### 3. Воркер на любом устройстве

```bash
git clone https://github.com/PavelShpakovich/rw_tracker.git
cd rw_tracker
pnpm install
# Создать .env с DATABASE_URL (Supabase) и Telegram-переменными
pnpm worker
```

Поиск поездов при создании трекера выполняется воркером, а не Vercel. Если воркер не запущен, форма покажет предупреждение.

### Docker

```bash
docker build -f Dockerfile.worker -t rw-worker .
docker run --env-file .env rw-worker
```

Несколько воркеров безопасны: lease-механизм обеспечивает только один активный воркер.

## Автозапуск (опционально)

### macOS (launchd)

```bash
PROJECT_DIR="$(pwd)"
sed "s#__PROJECT_DIR__#$PROJECT_DIR#g" launchd/by.rw.tracker.plist > ~/Library/LaunchAgents/by.rw.tracker.plist
launchctl load ~/Library/LaunchAgents/by.rw.tracker.plist
```

Остановить: `launchctl unload ~/Library/LaunchAgents/by.rw.tracker.plist`

### Linux (systemd)

```ini
[Unit]
Description=RW Tracker Worker

[Service]
WorkingDirectory=/path/to/rw-tracker
ExecStart=pnpm worker
Restart=on-failure
EnvironmentFile=/path/to/rw-tracker/.env

[Install]
WantedBy=multi-user.target
```

## PWA (установка на телефон)

- **Safari (iOS):** кнопка «Поделиться» → «На экран Домой».
- **Chrome (Android):** кнопка меню → «Добавить на главный экран».

## Как работает проверка

1. Трекер = маршрут + дата + поезд + типы мест. Трекеры с одинаковыми станциями и датой делят один HTTP-запрос.
2. Первая успешная проверка только запоминает текущие места (базовая линия), уведомлений нет.
3. Дальше сравнивается каждый тип мест с предыдущим значением.
4. «Закончились» отправляется только если значение подтвердилось на следующей проверке.
5. Поиск поездов при создании трекера выполняется воркером; Vercel к pass.rw.by не обращается.

## Проверки

```bash
pnpm test        # парсер, diff, сообщения и воркер
pnpm typecheck
pnpm lint
```

## Структура

```
src/app/           веб-интерфейс и server actions
src/proxy.ts       пароль из APP_PASSWORD
src/lib/rw/        клиент и парсер pass.rw.by
src/lib/diff.ts    сравнение состояний и подтверждение «закончились»
src/lib/notify/    форматирование сообщений и отправка в Telegram
src/lib/db/        схема Drizzle и подключение к Postgres/PGlite
src/worker/        планировщик, lease, проверка трекеров, поиск маршрутов
drizzle/           SQL-миграции
scripts/           migrate.ts, check-route.ts
Dockerfile.worker  воркер в Docker
```
