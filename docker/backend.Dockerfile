FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for development)
RUN npm install

# Copy source code
COPY . .

EXPOSE 3000

# At startup: generate Prisma client, then start
CMD ["sh", "-c", "npx prisma generate --schema=./prisma/schema.prisma && npm run start:dev"]