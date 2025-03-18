FROM node:latest

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the backend port (if needed)
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
