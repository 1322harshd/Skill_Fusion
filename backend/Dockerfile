FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Build-time-only placeholders so settings.py (which reads these at import
# time) can load for `collectstatic` without a real DB or secret. ECS
# injects the real values as container environment variables at runtime,
# which always take precedence over these baked-in defaults.
ENV SECRET_KEY=build-time-placeholder \
    DB_NAME=placeholder \
    DB_USER=placeholder \
    DB_PASSWORD=placeholder \
    DB_HOST=placeholder \
    DB_PORT=5432

RUN python manage.py collectstatic --noinput

EXPOSE 8000

# Applies pending migrations, then serves with gunicorn. Fine with a single
# running task (desired_count=1); with more than one replica, migrations
# should move to a separate one-off ECS task run before rolling out new
# containers, so two tasks never race on the same migration.
# --timeout 120: default 30s was killing AI-generation requests (roadmap
# previews, resume generation) mid-flight — matches the ALB's idle_timeout.
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn SkillFusion.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120"]
