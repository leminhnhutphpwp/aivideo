# Dockerfile — Production Laravel App
# Multi-stage build for optimal layer caching

FROM php:8.4-fpm AS base

# System dependencies (single layer, minimized)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl libpng-dev libonig-dev libxml2-dev libzip-dev \
    zip unzip supervisor nginx ffmpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring exif pcntl bcmath gd zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# ──────────────────────────────────────────
# Composer stage
# ──────────────────────────────────────────
FROM base AS composer-deps
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy dependency manifests FIRST (cache optimization)
COPY composer.json composer.lock ./

# Install production dependencies
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# ──────────────────────────────────────────
# NPM build stage
# ──────────────────────────────────────────
FROM base AS npm-deps
COPY --from=node:22-alpine /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-alpine /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm

WORKDIR /var/www

# Copy frontend dependency manifests FIRST
COPY package.json package-lock.json ./

# Install frontend deps (ci = deterministic, faster)
RUN npm ci

# Copy full source for build stage
COPY . .

# Build frontend assets
RUN npm run build

# ──────────────────────────────────────────
# Final production image
# ──────────────────────────────────────────
FROM base AS production

WORKDIR /var/www

# Copy PHP vendor from composer-deps
COPY --from=composer-deps /var/www/vendor /var/www/vendor

# Copy built frontend assets from npm-deps
COPY --from=npm-deps /var/www/public/build /var/www/public/build
COPY --from=npm-deps /var/www/node_modules /var/www/node_modules

# Copy composer autoloader (optimized)
COPY --from=composer-deps /var/www/composer.lock /var/www/composer.lock
COPY --from=composer-deps /var/www/vendor/composer /var/www/vendor/composer

# Copy application source
COPY . .

# Generate optimized autoloader
RUN composer dump-autoload --optimize --no-dev

# Production configs
COPY docker/nginx.conf /etc/nginx/sites-enabled/default
COPY docker/php.ini /usr/local/etc/php/conf.d/app.ini
COPY docker/php-fpm-www.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/laravel.conf

# Security: www-data owns writable directories
RUN chown -R www-data:www-data storage bootstrap/cache

# Entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
