# Add Chrome installation
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install Puppeteer and Chrome
RUN npx puppeteer browsers install chrome

# Build Environment: Node + Playwright
FROM node:16
FROM mcr.microsoft.com/playwright:focal

# Env
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

# Export port 3000 for Node
EXPOSE 3000

# Copy all app files into Docker Work directory
COPY package*.json /app/
COPY index.ts /app/
COPY src/ /app/src/
COPY tsconfig.json /app/

# Install Deps
RUN npm install

# Build TS into JS to run via Node
RUN npm run build

# Run Node index.js file
CMD [ "npm", "start" ]