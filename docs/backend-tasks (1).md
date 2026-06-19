# Задачи для backend-разработчика

**Обновлено:** 2026-06-18

Документ отражает **актуальное состояние фронтенда** и список того, что по-прежнему требуется от API / инфраструктуры.

**Связанные документы:**
- [epic-0-buttons-audit.md](./epic-0-buttons-audit.md) — аудит кнопок (исторический)

> `ui-feedback-tasks.md` — **устарел**, UI-работы закрыты; актуальные задачи только в этом файле.

---

## Что уже сделано на фронтенде (backend не блокирует)

| Область | Реализация |
|---------|------------|
| **Навигация** | Плоское меню: «Список ВАТС», «Аудиофайлы», «Детализация», «Логи», «История конфигов». Отдельных routes `/queues`, `/voicemail`, `/constructor` **нет**. |
| **Контекст ВАТС** | Очереди, голосовая почта и конструктор — **вкладки** `VatsDetailsModal` (`QueuesPanel`, `VoicemailPanel`, `ConstructorPanel`). Store `activeInstance` и route guards **удалены**. |
| **Таблица ВАТС** | Столбец Docker + tooltip; одна кнопка «Просмотр»; поллинг статуса «Создаётся» (в т.ч. после reload / возврата на страницу). |
| **Создание ВАТС** | Мастер: шаг 1 — имя + тестовые users; шаг 2 — SIP + transport. HTTP/AMI/RTP **подбираются на клиенте** перед POST (см. ниже). |
| **Подбор портов (клиент)** | SIP — следующий свободный от списка ВАТС; HTTP/AMI — от 8088/5038; RTP — блок **100 портов** (`10000–10099`, `10100–10199`, …) по `GET /instances/`. Логика: `utils/rtpPortAllocation.ts`. |
| **Ошибки API** | `parseApiError.ts` + `apiErrorMessages.ts` (EN→RU, HTTP 4xx/5xx). |
| **Просмотр ВАТС** | Вкладки: Основные, Внутренние номера, Очереди, ГП, Конструктор, Команды. «Сохранить» только на «Основные»; AMI-команды — по «Отправить». ESC на модалках. |
| **Внутренние номера** | CRUD + edit через PUT; переход к ГП из таблицы номеров (смена вкладки модалки). |
| **История конфигов** | Без `pjsip`; default `extensions`. |
| **Аудиофайлы** | Глобальная страница `/audio`, **не привязана к instance** — так и задумано в UI. |
| **Mock-режим** | Расширен: CRUD instances/users, voicemail, queues API, `send_comand`. `frontend/src/api/setupMocks.ts`, `frontend/src/mocks/`. |

**Интеграционное тестирование UI:** `VITE_USE_MOCK=false`, `VITE_API_BASE_URL=http://127.0.0.1:8000`.

---

## Сводка задач backend

| Приоритет | Задача | Статус | Зависимость от фронта |
|-----------|--------|--------|------------------------|
| **P0** | Fix 500 при `POST /instances/` | ⬜ | Блокирует создание на real API |
| **P0** | Структурированные / русские ошибки (особенно 500) | ⬜ | Фронт покажет через `parseApiError`; коды упростят маппинг |
| **P0** | `send_comand` → JSON `{ output, success }` | ⬜ | Вкладка «Команды» в модалке |
| **P1** | E2E: `PUT /instances/{id}` status → stop/start контейнера | ⬜ | UI feedback уже есть |
| **P1** | `create_test_users=true` → users **101**, **102** | ⬜ | Checkbox + toast на фронте |
| **P1** | Согласование `transport` в `PUT .../users/{id}` | ⬜ | Фронт шлёт `transport-udp` / enum |
| **P1** | Проверка конфликтов RTP-диапазонов (пересечения, не только start/end) | ⬜ | Клиент избегает пересечений; backend сейчас слабее |
| **P2** | Дата создания в `GET /instances/` | ⬜ | В БД: `create_date`; в API: не отдаётся |
| **P2** | `GET /instances/used-ports` (опционально) | ⬜ | Фронт обходится `GET /instances/`; endpoint снизит race при параллельном создании |
| **P2** | Автоподбор портов на backend при create (optional fields) | ⬜ | Дублирует клиент; желателен как source of truth |
| **P2** | ES fallback / понятный 503 для `GET /logs/` | ⬜ | Страница логов |
| **P2** | History для `pjsip` или `GET .../config/types` | ⬜ | Фронт pjsip не запрашивает |

---

## P0 — блокирует основные сценарии

### 1. Ошибка 500 при создании ВАТС

**Endpoint:** `POST /instances/?create_test_users={bool}`

**Что шлёт фронт сейчас** (`CreateVatsModal` → `vatsApi.createVatsFull`):

```json
{
  "name": "...",
  "sip_port": 5060,
  "http_port": 8088,
  "ami_port": 5038,
  "rtp_port_start": 10000,
  "rtp_port_end": 10099,
  "transport_type": "udp"
}
```

Значения HTTP/AMI/RTP **пересчитываются** перед POST по актуальному `GET /instances/`.

**Нужно на backend:**
- Воспроизвести 500 в dev, залогировать traceback
- Разделить ошибки: Docker недоступен / FS / БД / конфликт портов / имя занято — разные `detail` (RU) или коды
- Убедиться, что `create_test_users=true` создаёт **101** и **102** (`instance_pjsip_seed.py`)

**Файлы:** `app/routes/instances/instancesCRUD.py`, `app/services/instance_container.py`, `app/services/instance_pjsip_seed.py`

---

### 2. Русификация и структура ошибок

**На фронте уже есть:** `utils/apiErrorMessages.ts`, `utils/parseApiError.ts` — маппинг EN→RU и fallback для 500.

**На backend (для prod и информативных ответов):**

| Сейчас | Нужно |
|--------|--------|
| Traceback в `detail` при 500 | `{ "detail": "...", "code": "docker_unavailable" }` без traceback в prod |
| EN-сообщения | RU или стабильные коды |
| `Ports already in use` | Уточнить: SIP / HTTP / AMI / RTP start / RTP end |
| `Failed to create instance: ...` | Разделить: Docker / порты / БД |

**Рекомендуемые коды:** `docker_unavailable`, `ports_conflict`, `instance_name_exists`, `container_start_failed`, `rtp_range_invalid`.

Фронт расширит `apiErrorMessages.ts` при появлении кодов — менять UI не обязательно.

---

### 3. AMI-команды — сериализуемый ответ

**Endpoint:** `POST /instances/send_comand/{instance_name}?comand=...`

**Использование:** вкладка «Команды» в `VatsDetailsModal.vue`.

**Проблема:** ответ `panoramisk.Message` — нестабильный JSON.

**Нужно:**

```json
{ "output": "...", "success": true }
```

**Файл:** `app/routes/instances/instancesCRUD.py` → `send_comand_route`

**Mock на фронте** уже отдаёт такой формат (`mocks/vatsMocks.ts` → `mockSendCommand`).

---

## P1 — создание и порты

### Что делает фронт (backend может не дублировать, но должен **валидировать**)

| Порт | Логика клиента |
|------|----------------|
| SIP | `max(существующие sip_port) + 1` или 5060; проверка дубликата на UI |
| HTTP | первый свободный от 8088 |
| AMI | первый свободный от 5038 |
| RTP | блок 100 портов, поиск с 10000, без пересечений с существующими диапазонами |

**Ограничения backend, важные для фронта:**
- `rtp_port_start`, `rtp_port_end`: в схеме `ge=1` — **порт 0 недопустим**
- Проверка конфликта в `create_instance` — только точное совпадение `rtp_port_start` / `rtp_port_end`, **без проверки пересечения диапазонов** → риск коллизий при обходе клиента

**Желательно на backend:**
1. Валидация: `rtp_port_start < rtp_port_end`, диапазон не пересекается с другими instance
2. `GET /instances/used-ports` — `{ sip: [], http: [], ami: [], rtp_ranges: [{start,end}] }` для атомарного подбора
3. Optional-поля в `AsteriskInstanceCreate`: если HTTP/AMI/RTP не переданы — автоподбор на сервере (устраняет race при двух одновременных create)

---

## P1 — статус ВАТС и контейнер

**Endpoint:** `PUT /instances/{id}` со `status: running | stopped`

**Фронт:** переключатель «Активна» / «Отключена», toast при save, предупреждение о недоступности SIP-register, блокировка формы при `creating`.

**Нужно проверить E2E:**
- `stopped` → контейнер остановлен, REGISTER невозможен
- `running` → контейнер запущен
- Переход `creating` → `running` / `error` отражается в `GET /instances/` (фронт поллит список)

**Дополнительно:** reject REGISTER в PJSIP при `status=stopped`, если контейнер ещё жив.

---

## P1 — внутренние номера (users)

| Endpoint | Фронт | Backend |
|----------|-------|---------|
| `GET /instances/{id}/users/` | Вкладка «Внутренние номера» | OK |
| `POST /instances/{id}/users/` | Создание + reload | OK |
| `PUT /instances/{id}/users/{endpoint_id}` | Редактирование | **Проверить** `transport` (`transport-udp` vs enum) |
| `DELETE .../users/delete/{endpoint_id}` | Удаление | OK |

После create/update/delete — `write_pjsip_users_conf` без 500.

---

## P1 — instance-scoped API (используются из модалки)

Эти endpoints вызываются из вкладок `VatsDetailsModal`, **не из отдельных страниц**:

| Раздел | Endpoints | Компонент |
|--------|-----------|-----------|
| Очереди | `GET/POST/PUT/DELETE /instances/{id}/queues/...` | `QueuesPanel.vue` |
| Голосовая почта | `.../voicemail/...`, bind-user, recordings | `VoicemailPanel.vue` |
| Конструктор | `GET/PUT /instances/{id}/dialplan...` | `ConstructorPanel.vue` |
| Команды | `POST .../send_comand/...` | вкладка «Команды» |

Контракт API **не менялся** при переносе в модалку; менялся только UX.

---

## P1 — история конфигов

**Endpoint:** `GET /instances/{id}/config/{type}/history`

- `pjsip.conf` не в `STATIC_REALTIME_CONF_FILES` → history для `pjsip` даёт 400
- **Фронт:** тип `pjsip` убран из селекта; default `extensions`

**Backend (опционально):** history для pjsip или `GET .../config/types` с `history_supported: bool`.

---

## P2 — поля ответа для UI

### `GET /instances/` и `GET /instances/{id}`

| Поле | Зачем фронту | Статус |
|------|----------------|--------|
| `created_at` / `create_date` | Колонка «Дата создания» | ⬜ **В БД есть** `create_date` (`Date` в `asterisk_instance.py`), но **не входит** в `AsteriskInstanceResponse` — клиент получает только порты/status/name и показывает заглушку «Нет данных» |
| `transport_type` | Отображение в деталях | ⬜ при create передаётся, в list/detail **не возвращается** (в БД может не храниться) |
| `rtp_port_start`, `rtp_port_end` | Автоподбор RTP при create | ✅ должны быть в list (уже в схеме ответа) |

**Backend:** добавить в `AsteriskInstanceResponse` поле даты — лучше `create_date` (как в модели) или `created_at` (ISO datetime); фронт подстроит маппинг в `VatsView.vue` (`mapInstancesToTableItems`).

---

## P2 — инфраструктура

### Логи

**Endpoint:** `GET /logs/` → Elasticsearch

Вне Docker ES недоступен. Нужен понятный `503` или fallback на файловые логи в dev.

### Аудиофайлы

**Endpoint:** `/audio_files/*` — **глобальная** библиотека.

Per-VATC audio **не требуется** текущим UI. Отдельный API — только если появится новое ТЗ.

### CDR export

`POST /cdr/export` — route **нет**; фронт экспортирует на клиенте. Backend не обязателен.

---

## Mock vs real API

| Режим | Назначение |
|-------|------------|
| `VITE_USE_MOCK=true` | Dev без backend; stateful mocks в `setupMocks.ts` |
| `VITE_USE_MOCK=false` | Приёмка и диплом — **обязателен** для проверки P0 |

Backend не подстраивается под mock; mock подстраивается под контракт API.

---

## Чек-лист приёмки (backend + real API)

- [ ] `POST /instances/` с телом как у фронта — **без 500** при Docker up
- [ ] `create_test_users=true` → SIP users 101, 102
- [ ] Конфликт портов → понятный 400 (RU или код), не 500
- [ ] RTP: отклонение пересекающихся диапазонов (не только duplicate start/end)
- [ ] `send_comand` → JSON с `output`
- [ ] `PUT /instances/{id}` status → реальный stop/start контейнера
- [ ] `PUT users/{id}` — password, callerid, context, transport
- [ ] `GET /instances/` — `created_at`, rtp-поля, актуальный `status` (`creating` → `running`)
- [ ] Queues / voicemail / dialplan CRUD из модалки на real API
- [ ] History config для `extensions`, `queues`, `manager`, …

---

## Рекомендуемый порядок работ

1. **P0:** fix 500 create + JSON для `send_comand` + структурированные ошибки  
2. **P1:** E2E status/container + seed 101/102 + валидация RTP-диапазонов  
3. **P1:** согласование `transport` в PUT users  
4. **P2:** `created_at`, `used-ports` (или server-side autopick), ES fallback для логов  

---

## Не актуально / закрыто на фронте

| Было в старых тасках | Сейчас |
|----------------------|--------|
| Per-VATC routes в sidebar | **Закрыто:** разделы в модалке |
| `activeInstance` store, route guards | **Удалено** |
| `GET /instances/used-ports` как блокер UI | **Не блокер:** клиент использует full list |
| Per-VATC audio API | **Не нужно** по текущему UX |
| Автоподбор RTP 10000–20000 фиксированно | **Заменено:** блоки по 100 портов с 10000 |
