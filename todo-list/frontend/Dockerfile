FROM node:22-alpine

WORKDIR /app

# Copy package manifests first for dependency caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

EXPOSE 5173

# Start Vite dev server on all interfaces for Docker networking
CMD ["npx", "vite", "--host", "0.0.0.0"]
