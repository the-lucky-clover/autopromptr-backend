# Use Playwright's official Node-based image (includes all dependencies for browser automation)
FROM mcr.microsoft.com/playwright:focal

# Set working directory inside the container
WORKDIR /app

# Copy only package files first to optimize Docker cache layers
COPY package.json package-lock.json* ./

# Install all dependencies (dev + prod) for build
RUN npm install --legacy-peer-deps

# Install Playwright browsers (required for automation)
RUN npx playwright install --with-deps

# Copy the rest of your application code
COPY . .

# Compile TypeScript to JavaScript in /dist
RUN npm run build

# Remove devDependencies to slim image (optional but helpful in prod)
RUN npm prune --production

# Set environment to production
ENV NODE_ENV=production

# Expose your Express app port
EXPOSE 3000

# Start the server (via compiled JS)
CMD ["node", "dist/index.js"]
