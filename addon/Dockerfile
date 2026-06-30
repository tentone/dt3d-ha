FROM ghcr.io/home-assistant/base:latest


ARG BUILD_VERSION
ARG BUILD_ARCH

LABEL io.hass.version="${BUILD_VERSION}" \
      io.hass.type="addon" \
      io.hass.arch="${BUILD_ARCH}"

ENV LANG=C.UTF-8

RUN apk add --no-cache go git build-base

WORKDIR /app

COPY backend/ ./backend/
RUN cd backend && go get

RUN cd backend && go build -o /usr/bin/dt3d-backend main.go

CMD [ "/usr/bin/dt3d-backend" ]