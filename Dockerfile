FROM alpine:3

# Setup proper locale and language support
ENV MUSL_LOCPATH=/usr/local/share/i18n/locales/musl
RUN apk add --no-cache --update \
        git cmake make musl-dev gcc gettext-dev libintl && \
    cd /tmp && \
    git clone https://github.com/rilian-la-te/musl-locales.git && \
    cd /tmp/musl-locales && \
    cmake . && \
    make && \
    make install && \
    rm -rf /tmp/musl-locales
ENV LANG=ru_RU.UTF-8 \
    LANGUAGE=ru_RU.UTF-8

# Install requirements for chromium and application
RUN apk add --no-cache \
      ca-certificates \
      chromium \
      freetype \
      harfbuzz \
      nodejs \
      npm \
      nss \
      ttf-freefont

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -g pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Install puppeteer and tell it to use system chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Setup working directory
WORKDIR /app

# Copy dependencies and instal them
COPY package.json package-lock.json /app/
RUN npm install --production

# Copy source files
COPY picoof /app/picoof

# Run everything after as non-privileged user.
USER pptruser

CMD [ "npx", "supervisor", "-w", ".,/resources", "-k", "picoof/server.js" ]
