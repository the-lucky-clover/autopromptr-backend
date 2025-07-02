# Use official Playwright image with Node and browser dependencies
FROM mcr.microsoft.com/playwright:focal

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) first for better caching
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Install Playwright browsers explicitly
RUN npx playwright install --with-deps

# Copy the rest of the app source code
COPY index.ts ./ 
COPY src/ ./src/
COPY tsconfig.json ./

# Build your TypeScript app
RUN npm run build

# Expose the app port
EXPOSE 3000

# Run the app
CMD ["npm", "start"]
