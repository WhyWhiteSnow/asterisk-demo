location = /health_check {
    limit_req zone=api_limit burst=10 nodelay;
    proxy_pass http://fastapi_backend;
    include /etc/nginx/proxy_params;
}

location /auth/ {
    limit_req zone=auth_limit burst=5 nodelay;
    proxy_pass http://fastapi_backend;
    include /etc/nginx/proxy_params;
}

location /instances/ {
    limit_req zone=api_limit burst=60 nodelay;
    proxy_pass http://fastapi_backend;
    include /etc/nginx/proxy_params;
}

location /cdr/ {
    limit_req zone=api_limit burst=60 nodelay;
    proxy_pass http://fastapi_backend;
    include /etc/nginx/proxy_params;
}

location /logs/ {
    limit_req zone=api_limit burst=60 nodelay;
    proxy_pass http://fastapi_backend;
    include /etc/nginx/proxy_params;
}

location /audio_files/ {
    limit_req zone=api_limit burst=60 nodelay;
    client_max_body_size 100m;
    proxy_pass http://fastapi_backend;
    include /etc/nginx/proxy_params;
}

location /docs {
    proxy_pass http://fastapi_backend;
    include /etc/nginx/proxy_params;
}

location /redoc {
    proxy_pass http://fastapi_backend;
    include /etc/nginx/proxy_params;
}

location = /openapi.json {
    proxy_pass http://fastapi_backend;
    include /etc/nginx/proxy_params;
}
