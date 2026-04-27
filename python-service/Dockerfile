# Use official Playwright Python image (Stable Noble/Ubuntu 24.04 from March 2026)
FROM mcr.microsoft.com/playwright/python:v1.58.0-noble

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies for OCR, PDF processing, and Document Conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    ghostscript \
    unpaper \
    pngquant \
    libpng-dev \
    libjpeg-dev \
    zlib1g-dev \
    gcc \
    g++ \
    python3-dev \
    libreoffice-core \
    libreoffice-writer \
    libreoffice-impress \
    libreoffice-calc \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
