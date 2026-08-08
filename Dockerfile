FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY data/ ./data/

ENV PORT=8000
EXPOSE 8000

# One worker, deliberately: sessions live in process memory (see app/store.py).
# A second worker would not see interviews started by the first.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
