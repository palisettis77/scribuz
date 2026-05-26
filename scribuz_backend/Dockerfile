FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY scribuz_backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ALL folders
COPY scribuz_backend/ ./scribuz_backend/
COPY scribuz_fan/ ./scribuz_fan/
COPY scribuz_creator/ ./scribuz_creator/
COPY scribuz_admin/ ./scribuz_admin/

EXPOSE 5000
CMD ["python", "scribuz_backend/app.py"]