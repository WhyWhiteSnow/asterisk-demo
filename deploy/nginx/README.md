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
