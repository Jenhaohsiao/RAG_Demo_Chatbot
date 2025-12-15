# RAG Demo Chatbot - 故障排除指南

這份文檔記錄了系統運作過程中遇到的問題及其解決方案，以便日後參考。

## 🚨 伺服器自動關閉問題

**日期**: 2025-12-15  
**問題等級**: 高 - 系統無法正常運作  

### 問題描述
FastAPI 後端服務器在接收任何 HTTP 請求時會立即自動關閉，無論是簡單的健康檢查端點還是複雜的 API 端點。

### 症狀表現
- ✅ 服務器可以正常啟動
- ✅ 顯示 "Application startup complete" 訊息
- ❌ 第一個 HTTP 請求後服務器立即關閉
- ❌ 日誌中沒有明顯的錯誤訊息
- ❌ 即使是最簡單的 FastAPI 應用也會出現相同問題

### 測試案例
```python
# 最簡測試 - 同樣會自動關閉
from fastapi import FastAPI
app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}
```

### 根本原因
**環境兼容性問題**: Python 3.12 與 uvicorn/FastAPI 在 Windows 環境下的兼容性問題導致服務器在處理請求時異常終止。

### ✅ 解決方案：Docker 容器化

#### 1. 創建 Dockerfile
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

# 設置工作目錄
WORKDIR /app

# 安全性增強 - 創建非root用戶
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 複製並安裝Python依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用代碼
COPY . .

# 設置Python路徑
ENV PYTHONPATH=/app

# 切換到非root用戶
RUN chown -R appuser:appuser /app
USER appuser

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# 暴露端口
EXPOSE 8000

# 啟動命令
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 2. 更新 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: rag-chatbot-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    networks:
      - rag-chatbot-network

  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: rag-chatbot-backend
    ports:
      - "8000:8000"
    environment:
      - QDRANT_MODE=docker
      - QDRANT_HOST=qdrant
      - QDRANT_PORT=6333
    depends_on:
      - qdrant
    networks:
      - rag-chatbot-network

networks:
  rag-chatbot-network:
    driver: bridge

volumes:
  qdrant_storage:
```

#### 3. 啟動容器化服務
```bash
# 構建並啟動服務
docker-compose up --build -d

# 檢查服務狀態
docker ps

# 測試服務
curl http://localhost:8000/health
```

### 驗證解決方案
- ✅ 後端容器正常運行
- ✅ API 端點響應正常
- ✅ 健康檢查通過
- ✅ 服務器不再自動關閉
- ✅ 與 Qdrant 連接正常

### 預防措施
1. **使用 Docker 容器化**: 確保環境一致性
2. **指定 Python 版本**: 使用已測試的 Python 3.11
3. **環境隔離**: 避免本地環境問題影響服務
4. **健康檢查**: 監控服務狀態

### 相關配置文件
- `backend/Dockerfile` - 後端容器配置
- `docker-compose.yml` - 服務編排配置
- `backend/.env.local` - 環境變數配置

---

## 📋 其他常見問題

### Qdrant 連接問題
**症狀**: 無法連接到 Qdrant 服務  
**解決方案**: 檢查 `QDRANT_HOST` 環境變數設置

### 端口衝突問題
**症狀**: 端口已被佔用  
**解決方案**: 使用 `netstat -ano | findstr :8000` 檢查端口使用情況

---

## 📝 故障排除流程

1. **確認症狀**: 詳細記錄問題表現
2. **檢查日誌**: 查看容器和應用日誌
3. **隔離測試**: 創建最簡測試案例
4. **環境檢查**: 確認依賴和配置
5. **容器化測試**: 嘗試 Docker 環境
6. **記錄解決方案**: 更新此文檔

---

**維護者**: GitHub Copilot  
**最後更新**: 2025-12-15