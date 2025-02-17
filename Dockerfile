# Use the official Python image as a base
FROM python:3.12.8 AS python

# Set the working directory to root
WORKDIR /

# Set the PYTHONPATH to just the root directory
ENV PYTHONPATH=/

# Install FFmpeg dependencies
RUN apt-get update && apt-get install -y ffmpeg

# Copy the requirements file into the image
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir cython flask Werkzeug numpy PyYAML soundfile librosa scipy ffmpeg-python \
    && pip install --no-cache-dir git+https://github.com/CPJKU/madmom.git \
    && pip install --no-cache-dir --upgrade madmom

# Copy the application code, including all directories to the root
COPY . /

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["python3", "app/app.py"]
