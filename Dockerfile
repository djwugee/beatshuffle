# Use the official Node.js image as a base
FROM node:latest AS node

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY app/package.json app/package-lock.json ./

# Install Node.js dependencies
RUN npm install

# Use a Python image to install Python dependencies
FROM python:3.9 AS python

# Set the working directory
WORKDIR /app

# Copy requirements.txt
COPY requirements.txt ./

# Install Python dependencies
RUN pip install -r requirements.txt

# Copy the rest of the application files
COPY app/ .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "dev"]
