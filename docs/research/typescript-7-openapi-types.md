# Генерация типов из OpenAPI при TypeScript 7

Вопрос (issue #14): работает ли `openapi-typescript` с `typescript ~7.0.2` через `overrides`, есть ли версия или альтернатива без конфликта, что выбрать. Контекст: исследование #6 рекомендовало `openapi-typescript` + `openapi-fetch`.

Дата проверки: 2026-10-28. Эксперименты в `/tmp` (вне репозитория), Node v26.0.0, npm из окружения. Версии взяты из `npm view`.

## Краткий ответ

- `overrides` решает только установку: `npm i` и `npm ci` проходят, но генерация падает. `openapi-typescript@7.13.0` использует `ts.factory` и `ts.SyntaxKind` из пакета `typescript` во время работы, а в TypeScript 7.0.2 этого JS API нет.
- Рабочий вариант, проверенный экспериментом: держать генератор в отдельном workspace (`api/`) со своим `typescript ~5.9` в devDependencies; корень, `backend/` и `frontend/` остаются на `~7.0.2`. Конфликта peer нет, `overrides` не нужны.
- Сгенерированный `.d.ts` проходит `tsc` из TypeScript 7.0.2 (`strict`, `skipLibCheck: false`), `openapi-fetch` тоже.
- Новой версии `openapi-typescript` с поддержкой TS 7 нет; есть открытые PR (см. ниже), не слитые.

## 1. Что происходит с `overrides`

Точная конфигурация: корень с `typescript ~7.0.2` и `openapi-typescript 7.13.0`, в `package.json` корня:

```json
"overrides": { "openapi-typescript": { "typescript": "$typescript" } }
```

Результаты:

- Без `overrides`: `npm i` завершается `ERESOLVE` (peer `typescript ^5.x`, подтверждает `npm view openapi-typescript peerDependencies`).
- С `overrides`: `npm i` и после удаления `node_modules` `npm ci` проходят, `npm ls` показывает единственный `typescript@7.0.2`.
- Запуск `npx openapi-typescript openapi.yaml -o out.d.ts` падает до генерации:

```
const BOOLEAN = ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
TypeError: Cannot read properties of undefined (reading 'createKeywordTypeNode')
  at .../openapi-typescript/dist/lib/ts.mjs:11
```

Причина: генератор строит AST через публичный JS API компилятора (`ts.factory`, `ts.SyntaxKind`) и печатает его. У `typescript@7.0.2` поле `exports` в `package.json` ведёт `"."` на `./lib/version.cjs`, который экспортирует только `version` и `versionMajorMinor`; `bin` — нативный `tsc`. Для TS 7.0 JS-API нет (см. также issue #2841 ниже, где пользователь пишет, что новый API ожидается в 7.1; это утверждение из комментария, не проверялось мной).

Вывод: `overrides` на TS 7 использовать нельзя, это даёт чистую установку и сломанный генератор.

## 2. Версии и upstream

`npm view openapi-typescript dist-tags`: `latest` 7.13.0, `next` 7.0.0-rc.1 (старая ветка, peer тоже `^5.x`). Последняя публикация 7.13.0 от 2026-02-11, новее нет.

Upstream (репозиторий `openapi-ts/openapi-typescript`, найдено через `gh`):

- Issue #2841 «openapi-typescript doesn't work with Typescript 7», открыт, ошибка идентична полученной мной. В комментариях обходные пути: алиасы `typescript: npm:@typescript/typescript6@6.0.2` плюс `@typescript/native: npm:typescript@7.0.2`; запуск через `--package typescript@6`.
- PR #2867 «Support TypeScript 7 applications with a package-owned compiler», открыт: генератор получает собственную зависимость от классического компилятора (описание PR: TS 5.9.3 занимает 23.6 MB unpacked, для приложения на TS 7 нужны обе версии).
- PR #2872 «Support TypeScript 6 and 7 without a runtime compiler dependency», открыт: генератор без компилятора (строковый эмиттер), мажорный релиз, ломает Node API.
- PR #2862 (документация по обходному пути), #2774 и #2818 (поддержка TS 6), открыты.

Ни один не слит и не выпущен на момент проверки. Сроки релиза неизвестны.

## 3. Проверенное решение: изолированный workspace с TypeScript 5

Эксперимент: корень `workspaces: ["a", "backend"]`, корень и `backend` с `typescript ~7.0.2`, `a` с `typescript ~5.9.3` и `openapi-typescript 7.13.0`.

- `npm i` и `npm ci` проходят без `overrides` и без `--force`.
- `npm ls typescript`: у `a` и `openapi-typescript` — `5.9.3` (лежит в `a/node_modules`), у корня и `backend` — `7.0.2`. Бинарь `node_modules/.bin/tsc` в корне остаётся `Version 7.0.2`.
- `npx openapi-typescript ../openapi.yaml -o ../backend/api.d.ts` из `a/` успешно создаёт файл (OpenAPI 3.1: `type: [string, "null"]` превратился в `string | null`, enum в union).
- `tsc` 7.0.2 по `backend/` (`strict`, `module NodeNext`, `skipLibCheck: false`) принял сгенерированный `api.d.ts`; единственные ошибки — две намеренно неверные строки (`name: 1`), т.е. типы реально проверяют.
- `openapi-fetch@0.17.0`: в `peerDependencies` пусто, зависит только от `openapi-typescript-helpers`. В `backend/` под TS 7 `createClient<paths>().POST("/x", { body })` типизируется; неверный `body` даёт ошибку.

Цена: в `node_modules` присутствуют две версии TypeScript (5.9 только для запуска генератора); генератору нужна скрипт-команда, запускаемая из `api/` или через `npm run -w api`. Для `gen` в корне: `npm run gen -w api`.

## 4. Альтернативы

| Вариант | Статус | Плюсы | Минусы |
| --- | --- | --- | --- |
| A. `openapi-typescript` в `api/` с TS 5.9 (проверено) | работает | типичный инструмент, формат вывода известен, `openapi-fetch` без изменений | две версии TS; после выхода PR #2867/#2872 стоит перепроверить и убрать изоляцию |
| B. `overrides` на TS 7 | генерация падает | — | не годится |
| C. Алиасы `@typescript/typescript6` (из комментария в #2841) | не проверялось | одна цепочка в корне | `@typescript/typescript6` даёт бинарь `tsc6` (`npm view`), но схема с алиасом `typescript` в корне подменила бы компилятор репозитория; сложнее A |
| D. `@hey-api/openapi-ts@0.99.0` | генерация падает на TS 7 | peer `typescript >=5.5.3 \|\| >=6.0.0`, `npm i` проходит | в моём запуске под TS 7.0.2: `TypeError: Cannot read properties of undefined (reading 'AnyKeyword')`; тот же класс проблемы (нужен JS API компилятора); клиент другой, чем `openapi-fetch` |
| E. `openapi-typescript` из PR #2872 | не выпущен | убирает зависимость от компилятора | ждать релиза, мажорное изменение API (CLI тот же по описанию PR) |
| F. Эмиттер TS-типов из TypeSpec напрямую (`typespec-typescript-emitter` 2.3.3, стороннее) | не проверялось | убрало бы шаг OpenAPI → TS | не первоисточник TypeSpec, зависимости и совместимость с TS 7 не смотрел; клиент `openapi-fetch` требует `paths` из OpenAPI, прямой эмиттер его не даёт |

Не проверялись: `orval`, `swagger-typescript-api`, `@openapitools/openapi-generator-cli` (для последнего нужна Java), `typespec-typescript-emitter` по существу. По `npm view` у `orval` нет peer на `typescript`, но запуск на TS 7 не пробовался.

## Рекомендация

Вариант A: workspace `api/` (TypeSpec + генерация) с собственным `typescript ~5.9.3` в devDependencies и `openapi-typescript@7.13.0`; корневой скрипт `gen` вызывает `npm run gen -w api`, результат пишется в `backend/` и `frontend/`; остальные workspaces остаются на TS 7. `openapi-fetch` ставить во `frontend/` без каких-либо обходных мер. Не использовать `overrides`.

Когда выйдет `openapi-typescript` с поддержкой TS 7 (PR #2867 или #2872), убрать `typescript` из `api/`.

Заметки по рискам:

- `api/` также содержит `@typespec/*`; их совместимость с TS 5.9 в `api/` и 7.0.2 в корне в этом исследовании не проверялась (TypeSpec-компилятор в отдельном эксперименте не запускался).
- Генерация выполняется Node'ом из `api/`, поэтому `tsc` TypeScript 7 генерации не затрагивает.

## Не проверялось

- Запуск TypeSpec вместе с этой схемой workspaces; работа на реальном репозитории (эксперимент на отдельном проекте в `/tmp`, не на этом репозитории).
- Алиасы `@typescript/typescript6` (вариант C) и обходной путь `--package typescript@6`.
- Содержимое открытых PR по существу (код не читался, только описания), а также фактические сроки релиза.
- `typespec-typescript-emitter`, `orval`, `swagger-typescript-api`, `openapi-generator`.
- Поведение на других версиях Node, чем v26.0.0; репозиторий использует Node из `.nvmrc` (24).
