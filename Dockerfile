FROM node:18-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg tzdata && \
    rm -rf /var/lib/apt/lists/*

ENV TZ=Europe/Moscow

WORKDIR /usr/src/app

COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

COPY . .

CMD ["yarn", "start"]
