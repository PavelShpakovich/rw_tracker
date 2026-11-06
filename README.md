# RW Tracker

Следит за свободными местами на выбранные поезда на [pass.rw.by](https://pass.rw.by) и присылает уведомления в Telegram.

```
Телефон (PWA) ─HTTPS─> Vercel (apps/web, пароль) ──> Supabase Postgres (схема rw)
                                                       ▲
Любое устройство: `pnpm worker` или Docker ────────────┘──> pass.rw.by ──> Telegram
```

- **Веб-интерфейс (`apps/web`, Next.js):** создание трекеров, история изменений, настройки. Устанавливается как PWA с домашнего экрана телефона.
- **Воркер (`apps/worker`):** проверяет расписание каждые 30 секунд, ищет поезда по запросу из веб-интерфейса, отправляет уведомления в Telegram. Запускается на любом устройстве с Node 22+.
- **База данных:** Supabase Postgres. Локальной файловой БД нет.
- **Уведомления:** бот в Telegram только отправляет сообщения; polling и webhook не используются.

## Структура

Монорепо на pnpm workspaces.

```
apps/web/          Next.js: UI, server actions, пароль (деплоится на Vercel)
apps/worker/       проверки pass.rw.by, поиск маршрутов, уведомления, Dockerfile
packages/core/     общие типы, форматирование, Telegram-клиент (без БД и Next)
packages/db/       схема Drizzle, подключение к Supabase Postgres, миграции, запросы
launchd/           автозапуск воркера на macOS
```

Зависимости направлены в одну сторону: `apps/*` → `packages/db` → `packages/core`. Веб не тянет парсер и cheerio, воркер не тянет Next.

## Установка и запуск локально

```bash
pnpm install
cp .env.example .env             # заполнить DATABASE_URL из Supabase и TELEGRAM_BOT_TOKEN
pnpm dev                         # Next.js на http://localhost:3000 + воркер
```

Локальный веб и воркер подключаются к указанной базе Supabase и изменяют её данные. Не запускайте команды с изменениями, если не хотите затронуть production.
Web-команды автоматически читают корневой `.env`; симлинк в `apps/web` не нужен. Если `pnpm` не распознаётся в PowerShell, используйте `corepack pnpm dev` или перезапустите VS Code после установки pnpm.

Миграции применяются при старте воркера. Вручную: `pnpm db:migrate`.

### Переменные окружения

| Переменная             | Описание                                                 |
| ---------------------- | -------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`   | Токен бота из @BotFather                                 |
| `APP_PASSWORD`         | Пароль для веб-интерфейса (обязателен на Vercel)         |
| `DATABASE_URL`         | Обязательная строка подключения Supabase Postgres        |
| `DEFAULT_INTERVAL_SEC` | Интервал проверки в секундах (мин. 60, по умолчанию 120) |

Получатели уведомлений добавляются на странице «Настройки» (Telegram ID из @userinfobot). Каждый получатель должен один раз открыть бота и нажать Start.

Один `.env` в корне читают web-команды, воркер и скрипты. На Vercel переменные задаются в дашборде.

## Деплой на Vercel + Supabase

### 1. База данных (Supabase)

1. В [Supabase Dashboard](https://supabase.com/dashboard) откройте или создайте проект.
2. Connect → **Direct** → Transaction pooler URI (порт 6543). Вставьте в `.env` как `DATABASE_URL`.
3. Примените миграции: `pnpm db:migrate`.

### 2. Vercel

1. **Add New → Project → Import** `PavelShpakovich/rw_tracker`.
2. **Root Directory:** `apps/web`. Framework определится как Next.js.
3. Переменные окружения: `DATABASE_URL`, `APP_PASSWORD`, `TELEGRAM_BOT_TOKEN`.
4. Deploy. `APP_PASSWORD` обязателен: без него Vercel вернёт 503.

### 3. Воркер на любом устройстве

```bash
git clone https://github.com/PavelShpakovich/rw_tracker.git
cd rw_tracker
pnpm install
# создать .env с production DATABASE_URL из Supabase и Telegram-переменными
pnpm worker
```

Поиск поездов при создании трекера выполняется воркером, а не Vercel. Если воркер не запущен, форма покажет предупреждение.

### Docker

Сборка из корня репозитория (контекст нужен целиком, чтобы поставить workspace-зависимости):

```bash
docker build -f apps/worker/Dockerfile -t rw-worker .
docker run --env-file .env rw-worker
```

`.dockerignore` исключает `.env*`, поэтому секреты в образ не попадают.

Несколько воркеров безопасны: lease-механизм обеспечивает только один активный воркер.

## Команды

```bash
pnpm dev              # веб + воркер в режиме разработки
pnpm build            # production-сборка веба
pnpm start            # production: next start + воркер
pnpm worker           # только воркер
pnpm worker:once      # одна проверка всех трекеров и выход
pnpm check-route -- --from Минск --to Гродно --date 2026-11-20   # разбор маршрута без базы
pnpm db:generate      # новая миграция после изменения packages/db/src/schema.ts
pnpm db:migrate       # применить миграции
pnpm test              # тесты используют изолированную PGlite только в памяти
pnpm typecheck
pnpm lint
```

Команды для отдельного пакета: `pnpm --filter @rw/web <script>`, `pnpm --filter @rw/worker <script>` и т. д.

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
WorkingDirectory=/path/to/rw-tracker/apps/worker
ExecStart=/usr/bin/env pnpm start
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
