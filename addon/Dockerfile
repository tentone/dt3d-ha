FROM ghcr.io/home-assistant/base:latest


LABEL io.hass.version="VERSION" io.hass.type="app" io.hass.arch="aarch64|amd64"

ENV LANG C.UTF-8

# Install Go and build tools
RUN apk add --no-cache go git build-base

# Create working dir
WORKDIR /app

# Copy app code
COPY backend/ ./backend

# Install dependencies
RUN cd backend && go get

# Build the application
RUN cd backend && go build -o /usr/bin/dt3d-backend main.go

# Run the application
CMD [ "/usr/bin/dt3d-backend" ]
