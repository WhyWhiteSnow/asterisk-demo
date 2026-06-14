# Подключайте в server {} хостового nginx.
# Upstream FastAPI должен слушать 127.0.0.1:8000 (см. docker-compose).

location = /health_check {
    proxy_pass http://127.0.0.1:8000;
    include /etc/nginx/snippets/asterisk-proxy_params.conf;
}

location /auth/ {
    proxy_pass http://127.0.0.1:8000;
    include /etc/nginx/snippets/asterisk-proxy_params.conf;
}

location /instances/ {
    proxy_pass http://127.0.0.1:8000;
    include /etc/nginx/snippets/asterisk-proxy_params.conf;
}

location /cdr/ {
    proxy_pass http://127.0.0.1:8000;
    include /etc/nginx/snippets/asterisk-proxy_params.conf;
}

location /logs/ {
    proxy_pass http://127.0.0.1:8000;
    include /etc/nginx/snippets/asterisk-proxy_params.conf;
}

location /audio_files/ {
    client_max_body_size 100m;
    proxy_pass http://127.0.0.1:8000;
    include /etc/nginx/snippets/asterisk-proxy_params.conf;
}

location /docs {
    proxy_pass http://127.0.0.1:8000;
    include /etc/nginx/snippets/asterisk-proxy_params.conf;
}

location /redoc {
    proxy_pass http://127.0.0.1:8000;
    include /etc/nginx/snippets/asterisk-proxy_params.conf;
}

location = /openapi.json {
    proxy_pass http://127.0.0.1:8000;
    include /etc/nginx/snippets/asterisk-proxy_params.conf;
}
