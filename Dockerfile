# Multi-stage build: First stage for building the UI
FROM node:22-alpine AS ui-builder

# Set working directory for UI build
WORKDIR /app/ui

# Copy UI package files
COPY ui/package*.json ./
RUN npm ci

# Copy UI source code
COPY ui/ ./

# Build the UI for production
RUN npm run build

# Second stage: Python runtime with LocalStripe
FROM python:3-slim

# Set working directory
WORKDIR /app

# Copy localstripe source code
COPY . .

# Install dependencies and localstripe from source
RUN pip install --no-cache-dir -e .

# Create directory for static files
RUN mkdir -p /app/static

# Copy built UI from the previous stage
COPY --from=ui-builder /app/ui/dist /app/static

# Set environment variable to serve static files
ENV LOCALSTRIPE_STATIC_PATH=/app/static

ENV LOCALSTRIPE_DISK_PATH=/data/localstripe.pickle

# Expose port 8420
EXPOSE 8420

# Run LocalStripe server
CMD ["localstripe"]

