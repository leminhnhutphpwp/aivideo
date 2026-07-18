#!/bin/sh
# ── Laravel Production Entrypoint ──
# Runs optimizations before starting supervisord

php artisan config:cache 2>/dev/null
php artisan route:cache 2>/dev/null
php artisan view:cache 2>/dev/null
php artisan event:cache 2>/dev/null

exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
