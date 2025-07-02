# Use official Playwright image with Node.js and all browser/system dependencies pre-installed
FROM mcr.microsoft.com/playwright:focal

# Set NODE_ENV to production for optimized installs
ENV NODE_ENV=production

# Set working directory inside the container
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Step 1: Install dependencies
RUN npm install --legacy-peer-deps

# Step 2: Install TypeScript as a devDependency
RUN npm install typescript --save-dev

# Install Playwright browsers with system dependencies
RUN npx playwright install --with-deps

# Install TypeScript globally (so it's available for the build step)
RUN npm install -g typescript

# Copy the application source code (everything in root)
COPY . .

# Step 3: Run the build
RUN npm run build

# Expose the app's port
EXPOSE 3000

# Start the compiled app
CMD ["npm", "start"]
