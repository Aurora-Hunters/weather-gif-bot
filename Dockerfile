FROM jrottenberg/ffmpeg:3.3-alpine AS ffmpeg
FROM node:15

# copy ffmpeg bins from first image
COPY --from=ffmpeg / /

# Set timezone
RUN rm /etc/localtime
RUN ln -s /usr/share/zoneinfo/Europe/Moscow /etc/localtime