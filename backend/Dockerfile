FROM python:3.10-slim

WORKDIR /app

# Dépendances système pour MySQL et compilation
RUN apt-get update && apt-get install -y \
    pkg-config \
    default-libmysqlclient-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Installation des dépendances Python
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn uvicorn cryptography

COPY . .

# Optimisation Python : évite de générer des fichiers .pyc et améliore le logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Utilisation de Gunicorn avec des workers asynchrones Uvicorn pour la production
# On utilise --workers 4 pour la scalabilité horizontale
CMD ["gunicorn", "app:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120"]
