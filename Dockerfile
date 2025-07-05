# Use official Playwright image with Node.js and all browser/system dependencies
FROM mcr.microsoft.com/playwright:focal

# Set working directory inside the container
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Install Playwright browsers with system dependencies
RUN npx playwright install --with-deps

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Set NODE_ENV to production after build
ENV NODE_ENV=production

# Expose the app's port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
