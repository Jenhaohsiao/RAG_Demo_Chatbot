import requests
import json

print("\n=== Phase 4 診斷測試 ===\n")

BASE_URL = "http://localhost:8000/api/v1"

# 1. 檢查健康狀態
print("1. 檢查後端健康...")
try:
    response = requests.get("http://localhost:8000/health")
    print(f"   [OK] Status: {response.status_code}")
    print(f"   Data: {response.json()}")
except Exception as e:
    print(f"   [ERROR] {e}")
    exit(1)

# 2. 建立 Session
print("\n2. 建立 Session...")
response = requests.post(f"{BASE_URL}/session/create")
print(f"   Status: {response.status_code}")
session_data = response.json()
session_id = session_data["session_id"]
print(f"   Session ID: {session_id}")

# 3. 測試上傳 - 詳細版
print("\n3. 測試檔案上傳...")
upload_url = f"{BASE_URL}/upload/{session_id}/file"
print(f"   URL: {upload_url}")

files = {'file': ('test.txt', b'Machine learning test content', 'text/plain')}
response = requests.post(upload_url, files=files)

print(f"   Status Code: {response.status_code}")
print(f"   Headers: {dict(response.headers)}")
print(f"   Body: {response.text}")

if response.status_code == 404:
    print("\n   [ERROR] 404 錯誤 - 路由未找到")
    print("   可能原因:")
    print("   - 路由未正確註冊")
    print("   - session_id 格式問題")
    print("   - FastAPI 路徑匹配問題")
elif response.status_code == 202:
    print(f"\n   [OK] 上傳成功")
    print(f"   Document ID: {response.json().get('document_id')}")
else:
    print(f"\n   [WARN] 非預期狀態碼: {response.status_code}")

# 4. 列出所有可用路由
print("\n4. 檢查 OpenAPI schema...")
try:
    schema = requests.get("http://localhost:8000/api/openapi.json").json()
    upload_paths = [p for p in schema['paths'].keys() if 'upload' in p]
    print(f"   Upload 相關路由 ({len(upload_paths)}):")
    for path in upload_paths:
        print(f"     - {path}")
except Exception as e:
    print(f"   [ERROR] {e}")

print("\n完成。\n")
