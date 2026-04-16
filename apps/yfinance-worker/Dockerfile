FROM python:3.12-slim

WORKDIR /app
RUN pip install --no-cache-dir yfinance requests

COPY poll.py /app/poll.py

ENV PYTHONUNBUFFERED=1

CMD ["python", "/app/poll.py"]
