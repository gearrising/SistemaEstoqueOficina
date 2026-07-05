@echo off
echo Iniciando sistema de estoque...
docker compose up -d
timeout /t 5 /nobreak >nul
start http://127.0.0.1:8888
echo.
echo Sistema aberto em http://127.0.0.1:8888
echo Login: admin@oficina.local / admin123
echo.
echo IMPORTANTE: Use 127.0.0.1 (nao localhost) no Windows.
