# Use official Playwright image with Node.js and all browser/system dependencies pre-installed
FROM mcr.microsoft.com/playwright:focal

# Set working directory inside the container
WORKDIR /app

# Copy dependency files first for layer caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install Playwright browsers with system dependencies
RUN npx playwright install --with-deps

# Copy the application source code
COPY index.ts ./
COPY src/ ./src/
COPY tsconfig.json ./

# Build the TypeScript code
RUN npm run build

# Expose the app's port
EXPOSE 3000

# Start the compiled app
CMD ["npm", "start"]
