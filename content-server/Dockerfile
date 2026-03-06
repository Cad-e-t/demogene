# -----------------------------
# Stage 1: Base setup + FFmpeg
# -----------------------------
FROM node:20-slim AS base

# Install ffmpeg and fontconfig once (cached unless base image changes)
RUN apt-get update && \
    apt-get install -y ffmpeg fontconfig && \
    rm -rf /var/lib/apt/lists/*

# -----------------------------
# Stage 2: Dependencies install
# -----------------------------
WORKDIR /usr/src/app

# Copy only dependency files for caching
COPY package*.json ./

# Clean, reproducible production install
RUN npm ci --omit=dev

# -----------------------------
# Stage 3: Application code
# -----------------------------
# Copy the rest of the application code
COPY . .

# Install custom fonts
COPY fonts/ /usr/share/fonts/custom/
RUN fc-cache -fv

# -----------------------------
# Stage 4: Runtime configuration
# -----------------------------
ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

# Use a non-root user (best practice for Cloud Run)
USER node

# Default command
CMD ["npm", "start"]