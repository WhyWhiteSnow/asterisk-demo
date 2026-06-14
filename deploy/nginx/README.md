# Хостовый nginx

Docker-nginx из проекта удалён: на сервере уже есть nginx на порту 80.

Compose поднимает только backend и frontend; nginx настраивается **на хосте**.

## Порты compose (localhost)

| Сервис | Порт |
|--------|------|
| FastAPI (dev/prod) | `127.0.0.1:8000` |
| Vite dev | `127.0.0.1:5173` |
| Prod static (сборка) | `deploy/static/` на диске |

## Файлы для копирования на сервер

```bash
# из корня монорепо (asterisk-demo/)
sudo cp deploy/nginx/proxy_params /etc/nginx/snippets/asterisk-proxy_params.conf
sudo cp deploy/nginx/api_locations.inc /etc/nginx/snippets/asterisk-api_locations.inc
```

## Dev

```bash
cp .env.compose.example .env   # VITE_API_BASE_URL= пусто
docker compose --profile dev up

sudo cp deploy/nginx/host-dev.conf.example /etc/nginx/sites-available/asterisk-demo.conf
# при необходимости поправьте server_name
sudo ln -sf /etc/nginx/sites-available/asterisk-demo.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

UI: `http://<server>/` → Vite, API: те же location → FastAPI.

## Prod

```bash
# в .env: COMPOSE_PROFILES=prod
docker compose --profile prod up --build -d

sudo cp deploy/nginx/host-prod.conf.example /etc/nginx/sites-available/asterisk-demo.conf
# в host-prod.conf.example замените root на абсолютный путь к deploy/static
sudo nginx -t && sudo systemctl reload nginx
```

После обновления frontend:

```bash
docker compose --profile prod up --build frontend-prod
sudo systemctl reload nginx
```

## Переменные frontend

В `.env` монорепо: `VITE_API_BASE_URL=` (пусто) — запросы идут через хостовый nginx same-origin.

## SIP / софтфон (nginx stream)

SIP **не** идёт через HTTP `:80`. Сигнализация SIP проксируется модулем **stream** nginx на UDP/TCP порты АТС.

### Однократная настройка nginx

1. В `/etc/nginx/nginx.conf` **на верхнем уровне** (вне `http {}`):

```nginx
stream {
    include /home/student/asterisk-demo/deploy/nginx/stream.d/*.conf;
}
```

(замените путь на свой; см. `stream.conf.example`)

2. Перезагрузка:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

3. Firewall — открыть **SIP-порт каждой АТС** (например `5069/udp+tcp`) и **RTP-диапазон** (например `10000-10010/udp`):

```bash
sudo ufw allow 5069/udp
sudo ufw allow 5069/tcp
sudo ufw allow 10000:10010/udp
```

### Backend (.env.fastapi)

```env
PJSIP_EXTERNAL_ADDRESS=212.49.119.138
HOST_PROJECT_PATH=/home/student/asterisk-demo/ceph-asterisk
PJSIP_LOCAL_NETS=172.17.0.0/16,172.18.0.0/16,127.0.0.1/32
```

`PJSIP_EXTERNAL_ADDRESS` — **публичный IP**, который видит софтфон (в SDP и REGISTER).

### После применения патча API

При создании/пересоздании АТС API пишет `deploy/nginx/stream.d/<имя>.conf` и привязывает SIP контейнера к `127.0.0.1:<sip_port>`.

**После каждой новой АТС:**

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Пересоздать существующую АТС** (UI или API `POST /instances/{id}/recreate-container`).

### Настройки софтфона

| Поле | Значение |
|------|----------|
| Сервер / Domain | `212.49.119.138` (или ваш `PJSIP_EXTERNAL_ADDRESS`) |
| Порт | `sip_port` инстанса (например `5069`) |
| Transport | UDP |
| Логин | extension из UI (например `101`) |
| Пароль | из карточки пользователя SIP |

Проверка регистрации: `GET /instances/{id}/debug` → `registration_ok: true`.
