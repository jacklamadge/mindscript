FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY frontend/ /app/frontend/
COPY bot/ /app/bot/
COPY start.sh /app/start.sh

RUN chmod +x /app/start.sh \
    && mkdir -p /data

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DATABASE_URL=sqlite:////data/vibepromt.db

EXPOSE 8000

CMD ["/app/start.sh"]
