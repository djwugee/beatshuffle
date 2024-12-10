# Use the official Python image as a base
FROM python:3.12.8 AS python

# Set the working directory
WORKDIR /app

# Copy the requirements.txt from the root to the working directory
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files
COPY app/ .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["python", "app.py", "run", "dev"]
