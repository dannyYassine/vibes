FROM node:22-alpine

WORKDIR /app

# Copy package manifests first for dependency caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

EXPOSE 5173
