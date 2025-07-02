# Use official Playwright image with Node 16 + Playwright + Chrome dependencies
FROM mcr.microsoft.com/playwright:focal

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) first for better caching
COPY package*.json ./

# Install npm dependencies (includes playwright and puppeteer-core)
RUN npm install

# Copy the rest of the app source code
COPY index.ts ./ 
COPY src/ ./src/
COPY tsconfig.json ./

# Build your TypeScript (assuming you have a build script in package.json)
RUN npm run build

# Expose the app port
EXPOSE 3000

# Run the app
CMD ["npm", "start"]
