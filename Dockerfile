FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY backend/ ./backend/
# Copy frontend files (FastAPI serves them statically if accessed directly)
COPY frontend/ ./frontend/
COPY config.json .

# Set working directory to backend where main.py is
WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
