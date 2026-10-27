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

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
