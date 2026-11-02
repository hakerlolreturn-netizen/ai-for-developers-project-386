# Календарь звонков

[![hexlet-check](https://github.com/hakerlolreturn-netizen/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/hakerlolreturn-netizen/ai-for-developers-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Стек

- Backend: Node.js, Fastify, TypeScript
- Frontend: Vite, React, Mantine
- Тесты: Vitest; линтер: oxlint, Prettier
- CI: GitHub Actions; релизы: release-please

## Установка

Нужен Node.js 24+ (версия в `.nvmrc`).

```bash
git clone https://github.com/hakerlolreturn-netizen/ai-for-developers-project-386.git
cd ai-for-developers-project-386
npm ci
```

## Использование

```bash
npm run dev    # бекенд http://localhost:3000, фронтенд http://localhost:5173
npm test       # тесты
npm run lint   # линтер и проверка форматирования
```

## Docker

```bash
docker build -t calendar .
docker run -e PORT=8080 -p 8080:8080 calendar   # http://localhost:8080
```

Образ запускает бекенд, который отдаёт API под `/api` и собранный фронтенд. Порт задаёт переменная `PORT` (по умолчанию 3000).

## Деплой

Данные (типы встреч и записи) хранятся в памяти процесса и сбрасываются при каждом перезапуске: после деплоя, рестарта и засыпания бесплатного инстанса Render без трафика.

### Render MCP

Проектная конфигурация MCP для Claude Code лежит в `.mcp.json`; ключ берётся из переменной окружения и в репозиторий не попадает.

1. В Render: Account Settings → API Keys → Create API Key.
2. Экспортируйте ключ в окружение перед запуском агента: `export RENDER_API_KEY=<ключ>`.
3. Запустите `claude` в корне репозитория и подтвердите проектный сервер `render`; проверка: `/mcp`.
4. Попросите агента выбрать workspace (`list_workspaces`, `select_workspace`) и создать или проверить сервис.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
