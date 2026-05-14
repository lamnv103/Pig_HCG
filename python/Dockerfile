# Sử dụng Python 3.10-slim để tối ưu dung lượng
FROM python:3.10-slim

# Cài đặt SWI-Prolog và các thư viện hỗ trợ xử lý ảnh (OpenCV/Pillow)
RUN apt-get update && apt-get install -y \
    swi-prolog \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Copy danh sách thư viện và cài đặt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code và tri thức (Prolog/Models) vào container
COPY . .

# Chạy FastAPI trên cổng 7860 (Cổng mặc định của Hugging Face)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
