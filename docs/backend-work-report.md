# Отчёт о выполненных backend-задачах

**Дата:** 2026-06-19  
**Источник ТЗ:** [backend-tasks (1).md](./backend-tasks%20(1).md)  
**Область:** `ceph-asterisk/` (FastAPI)

---

## Цель работ

Привести backend API в соответствие с актуальным фронтендом: устранить блокирующие ошибки при создании ВАТС, стандартизировать ответы об ошибках, доработать контракт endpoints, используемых из модалки `VatsDetailsModal`.

---

## Сводка по приоритетам

| Приоритет | Задача | Статус |
|-----------|--------|--------|
| **P0** | Fix 500 при `POST /instances/` | ✅ |
| **P0** | Структурированные / русские ошибки | ✅ |
| **P0** | `send_comand` → JSON `{ output, success }` | ✅ |
| **P1** | E2E: `PUT /instances/{id}` status → stop/start контейнера | ✅ (логика уже была; улучшена обработка ошибок) |
| **P1** | `create_test_users=true` → users **101**, **102** | ✅ (без изменений seed; исправлен порядок вызова при create) |
| **P1** | Согласование `transport` в `PUT .../users/{id}` | ✅ |
| **P1** | Проверка конфликтов RTP-диапазонов (пересечения) | ✅ |
| **P2** | Дата создания в `GET /instances/` | ✅ |
| **P2** | `GET /instances/used-ports` | ✅ |
| **P2** | Автоподбор портов на backend (optional fields) | ✅ |
| **P2** | ES fallback / понятный 503 для `GET /logs/` | ✅ |
| **P2** | History для `pjsip` или `GET .../config/types` | ✅ (`GET .../config/types`) |

---

## P0 — блокирующие сценарии

### 1. Создание ВАТС (`POST /instances/`)

**Проблема:** при любой ошибке возвращался 500 с traceback в `detail`; проверка портов не учитывала пересечение RTP-диапазонов; блок `create_test_users` выполнялся вне транзакционного отката — при сбое оставалась «осиротевшая» запись в БД.

**Сделано:**

- Вынесена валидация портов в `app/services/instance_ports.py`:
  - проверка `rtp_port_start < rtp_port_end`;
  - проверка пересечения RTP-диапазонов между инстансами;
  - детализация конфликта (SIP / HTTP / AMI / RTP с указанием ВАТС).
- Создание тестовых пользователей и voicemail перенесено внутрь блока с откатом (config + БД + pjsip views).
- Разделена обработка ошибок по типам:
  - `IntegrityError` → конфликт имени/портов;
  - `SQLAlchemyError` → ошибка БД;
  - `docker.errors.DockerException` → Docker недоступен;
  - `OSError` → ошибка файловой системы;
  - прочие → 500 без traceback в prod.
- Добавлен серверный автоподбор HTTP/AMI/RTP, если поля не переданы (optional в `AsteriskInstanceCreate`).

**Файлы:** `app/routes/instances/instancesCRUD.py`, `app/services/instance_ports.py`, `app/schemas/asterisk.py`

---

### 2. Структурированные русские ошибки

**Сделано:**

- Новый модуль `app/utils/api_errors.py` с классом `ApiHttpError` и кодами:

| Код | HTTP | Описание |
|-----|------|----------|
| `instance_name_exists` | 400 | Имя ВАТС уже занято |
| `ports_conflict` | 400 | Конфликт портов (с детализацией) |
| `rtp_range_invalid` | 400 | Некорректный RTP-диапазон |
| `docker_unavailable` | 503 | Docker недоступен |
| `container_start_failed` | 500 | Ошибка запуска контейнера |
| `database_error` | 500 | Ошибка БД |
| `filesystem_error` | 500 | Ошибка ФС |
| `ami_error` | 500 | Ошибка AMI |
| `internal_error` | 500 | Непредвиденная ошибка |

- Exception handlers в `app/main.py`:
  - `ApiHttpError` → JSON `{ "detail": "...", "code": "..." }`;
  - необработанные исключения → 500 без traceback в prod (`DEV_MODE=false`).

**Формат ответа:**

```json
{
  "detail": "Конфликт портов: RTP (10000–10099 пересекается с 10050–10149, ВАТС «test»)",
  "code": "ports_conflict"
}
```

---

### 3. AMI-команды (`POST /instances/send_comand/{instance_name}`)

**Проблема:** возвращался объект `panoramisk.Message` — нестабильный JSON.

**Сделано:**

- Сериализация в стабильный контракт через `app/utils/ami_response.py`:

```json
{
  "output": "Asterisk 20.x.x\n...",
  "success": true
}
```

- Формат совпадает с mock на фронте (`mocks/vatsMocks.ts` → `mockSendCommand`).

**Файлы:** `app/utils/ami_response.py`, `app/routes/instances/instancesCRUD.py`

---

## P1 — создание, порты, пользователи

### Валидация RTP-диапазонов

- Функция `rtp_ranges_overlap()` — проверка пересечения двух диапазонов.
- `assert_ports_available()` — единая точка валидации при create и update.
- При update RTP заменена проверка «только start/end совпадает» на полную проверку пересечений.

### Статус ВАТС (`PUT /instances/{id}`)

- Логика stop/start через `stop_asterisk_instance()` / `_start_asterisk_container_task` уже была реализована.
- Улучшена обработка ошибок при смене RTP (через `ApiHttpError`).

### Transport в PUT users

**Проблема:** фронт при редактировании шлёт `transport-udp`, при создании — enum `udp`.

**Сделано:**

- В `SIPUserUpdate` добавлен валидатор `normalize_transport`:
  - `udp` → `transport-udp`;
  - `transport-udp` → без изменений;
  - поддержка enum `TransportType`.

**Файл:** `app/schemas/sip.py`

### Тестовые пользователи 101 / 102

- Seed в `instance_pjsip_seed.py` уже создавал 101 и 102.
- Исправлен порядок вызова: seed выполняется внутри транзакционного блока create, чтобы при ошибке не оставались частичные данные.

---

## P2 — поля ответа и инфраструктура

### Дата создания в списке ВАТС

- В `AsteriskInstanceResponse` добавлены поля:
  - `create_date` — из модели БД (`Date`);
  - `created_at` — computed field (ISO-строка для фронта).

**Файл:** `app/schemas/asterisk.py`

> **Примечание для фронта:** в `VatsView.vue` колонка «Дата» пока захардкожена как `'Нет данных'`. Для отображения достаточно маппинга: `instance.created_at ?? instance.create_date`.

### `GET /instances/used-ports`

Новый endpoint для атомарного подбора портов (снижает race при параллельном создании):

```json
{
  "sip": [5060, 5061],
  "http": [8088, 8089],
  "ami": [5038, 5039],
  "rtp_ranges": [
    { "start": 10000, "end": 10099 },
    { "start": 10100, "end": 10199 }
  ]
}
```

### Автоподбор портов на backend

- Поля `http_port`, `ami_port`, `rtp_port_start`, `rtp_port_end` в `AsteriskInstanceCreate` стали optional.
- Если не переданы — вызывается `allocate_ports()` (блоки RTP по 100 портов с 10000).

### Логи (`GET /logs/`)

- При недоступности Elasticsearch возвращается **503** с сообщением:  
  `"Elasticsearch недоступен. Логи временно недоступны."`
- URL ES настраивается через env `ELASTICSEARCH_URL` (по умолчанию `http://elasticsearch:9200`).
- `NotFoundError` (индекс ещё не создан) — по-прежнему пустой список.

**Файл:** `app/routes/logs.py`

### Типы конфигов (`GET /instances/{id}/config/types`)

Новый endpoint — список типов конфигов с флагом `history_supported`:

```json
{
  "types": [
    { "type": "extensions", "filename": "extensions.conf", "history_supported": true },
    { "type": "pjsip", "filename": "pjsip.conf", "history_supported": false }
  ]
}
```

**Файл:** `app/routes/instances/configs/instance_configs.py`

---

## Новые и изменённые файлы

| Файл | Действие |
|------|----------|
| `app/utils/api_errors.py` | **создан** — коды и русские сообщения ошибок |
| `app/services/instance_ports.py` | **создан** — валидация и подбор портов |
| `app/utils/ami_response.py` | **создан** — сериализация AMI-ответа |
| `app/routes/instances/instancesCRUD.py` | **изменён** — create, used-ports, send_comand, ошибки |
| `app/schemas/asterisk.py` | **изменён** — create_date, created_at, UsedPortsResponse, optional ports |
| `app/schemas/sip.py` | **изменён** — нормализация transport |
| `app/main.py` | **изменён** — exception handlers |
| `app/routes/logs.py` | **изменён** — ES fallback 503 |
| `app/routes/instances/configs/instance_configs.py` | **изменён** — endpoint `/config/types` |

---

## Чек-лист приёмки (backend + real API)

| # | Проверка | Статус |
|---|----------|--------|
| 1 | `POST /instances/` без 500 при Docker up | ⬜ требует проверки на стенде |
| 2 | `create_test_users=true` → SIP users 101, 102 | ⬜ требует проверки на стенде |
| 3 | Конфликт портов → 400 с кодом `ports_conflict` | ✅ реализовано |
| 4 | RTP: отклонение пересекающихся диапазонов | ✅ реализовано |
| 5 | `send_comand` → JSON с `output` и `success` | ✅ реализовано |
| 6 | `PUT /instances/{id}` status → stop/start контейнера | ⬜ требует E2E на стенде |
| 7 | `PUT users/{id}` — password, callerid, context, transport | ✅ transport нормализуется |
| 8 | `GET /instances/` — `create_date` / `created_at`, rtp-поля, status | ✅ реализовано |
| 9 | Queues / voicemail / dialplan CRUD из модалки | ⬜ без изменений контракта |
| 10 | History config для `extensions`, `queues`, `manager`, … | ⬜ без изменений; добавлен `/config/types` |
| 11 | `GET /logs/` → 503 без ES | ✅ реализовано |
| 12 | `GET /instances/used-ports` | ✅ реализовано |

---

## Рекомендации для дальнейших шагов

1. **E2E на real API** (`VITE_USE_MOCK=false`, Docker up) — прогнать чек-лист выше.
2. **Фронт:** одна строка в `VatsView.vue` для отображения `created_at` / `create_date`.
3. **Фронт (опционально):** расширить `apiErrorMessages.ts` маппингом по полю `code` из ответа API.
4. **P1 (не реализовано):** reject REGISTER в PJSIP при `status=stopped` — требует правки конфига/endpoint Asterisk, отдельная задача.

---

## Не входило в scope

- Per-VATC audio API — не требуется по текущему UX.
- `POST /cdr/export` — route не нужен (экспорт на клиенте).
- Изменения mock-режима на фронте — mock уже соответствует контракту.
