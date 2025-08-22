ARG BUILD_FROM
FROM ${BUILD_FROM}

ENV LANG C.UTF-8

# Install Go and build tools
RUN apk add --no-cache go git build-base

WORKDIR /app
COPY backend/ ./backend
RUN cd backend && go build -o /usr/bin/dt3d-backend ./cmd/server

CMD ["/usr/bin/dt3d-backend"]
