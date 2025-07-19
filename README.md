# Weather Gif Bot

Animated Weather — [@weather_gif_bot](https://t.me/weather_gif_bot)

## Docker

Build the Docker image:

```sh
docker build -t weather-gif-bot .
```

Run the container with environment variables:

```sh
docker run -d \
  --name weather-gif-bot \
  --env-file .env \
  weather-gif-bot
```

Alternatively, set variables inline:

```sh
docker run -d \
  --name weather-gif-bot \
  -e BOT_TOKEN=<your_bot_token> \
  -e POSTHOG_API_KEY=<your_posthog_api_key> \
  weather-gif-bot
```
