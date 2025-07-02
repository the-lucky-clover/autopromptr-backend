# Use official Playwright image with Node.js and all browser/system dependencies pre-installed
FROM mcr.microsoft.com/playwright:focal

# Set NODE_ENV to production for optimized installs
ENV NODE_ENV=production

# Set working directory inside the container
WORKDIR /app

# Copy dependency files first for better layer caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install Playwright browsers with system dependencies
RUN npx playwright install --with-deps

# Copy the application source code (everything in root)
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the app's port
EXPOSE 3000

# Start the compiled app
CMD ["npm", "start"]
