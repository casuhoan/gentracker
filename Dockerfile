FROM php:8.3-apache

# Installa estensioni PHP comuni
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends libzip-dev libpng-dev libonig-dev; \
    docker-php-ext-install pdo pdo_mysql mysqli zip; \
    a2enmod rewrite headers; \
    rm -rf /var/lib/apt/lists/*

# Copia configurazioni personalizzate
COPY php/php.ini /usr/local/etc/php/php.ini
COPY apache/vhost.conf /etc/apache2/sites-available/000-default.conf

# Copia il codice dell'applicazione
COPY filesito/ /var/www/html/