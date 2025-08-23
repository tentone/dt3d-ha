ARG BUILD_FROM
FROM ${BUILD_FROM}

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
RUN cd backend && go build -o /usr/bin/dt3d-backend ./cmd/server

# Run the application
CMD ["/usr/bin/dt3d-backend"]
