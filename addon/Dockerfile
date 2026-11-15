FROM ghcr.io/home-assistant/base:latest AS build

RUN apk add --no-cache go git build-base nodejs npm
WORKDIR /app

COPY model-import/package*.json ./model-import/
RUN cd model-import && npm ci --omit=dev --ignore-scripts
COPY model-import/*.mjs ./model-import/

COPY backend/ ./backend/
RUN cd backend && go build -mod=mod -o /usr/bin/dt3d-backend .

FROM ghcr.io/home-assistant/base:latest

ARG BUILD_VERSION
ARG BUILD_ARCH

LABEL io.hass.version="${BUILD_VERSION}" \
      io.hass.type="addon" \
      io.hass.arch="${BUILD_ARCH}"

ENV LANG=C.UTF-8

RUN apk add --no-cache nodejs

WORKDIR /app
COPY --from=build /usr/bin/dt3d-backend /usr/bin/dt3d-backend
COPY --from=build /app/model-import /app/model-import

CMD [ "/usr/bin/dt3d-backend" ]
