FROM node:18-alpine

WORKDIR /app

# Install production dependencies first for better layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . ./

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

# Health check to ensure container is ready
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"] 