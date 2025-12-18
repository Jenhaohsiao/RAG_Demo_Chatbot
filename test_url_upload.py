#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
URL 上傳功能測試指令碼
快速測試 URL 上傳功能

使用方式:
  python test_url_upload.py
  python test_url_upload.py --url "https://example.com"
  python test_url_upload.py --url "https://example.com" --wait
"""

import requests
import time
import json
import sys
from pathlib import Path
from typing import Optional
import argparse

# 配置
BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 10
POLL_INTERVAL = 2
MAX_POLL_ATTEMPTS = 60  # 最多 2 分鐘

# 推薦測試 URL 清單
RECOMMENDED_URLS = {
    "1": ("https://example.com", "Example.com - 最簡單的測試"),
    "2": ("https://en.wikipedia.org/wiki/Machine_learning", "Wikipedia - Machine Learning"),
    "3": ("https://en.wikipedia.org/wiki/Artificial_intelligence", "Wikipedia - AI (較長)"),
    "4": ("https://www.python.org", "Python.org - 官方網站"),
    "5": ("https://developer.mozilla.org/en-US/docs/Web/JavaScript", "MDN - JavaScript 指南"),
}

def print_header(text: str):
    """打印標題"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)

def print_step(number: int, text: str):
    """打印步驟"""
    print(f"\n{number}️⃣  {text}")
    print("  " + "-" * 50)

def print_success(text: str):
    """打印成功訊息"""
    print(f"✅ {text}")

def print_error(text: str):
    """打印錯誤訊息"""
    print(f"❌ {text}")

def print_info(text: str):
    """打印資訊"""
    print(f"ℹ️  {text}")

def check_backend() -> bool:
    """檢查後端是否運行"""
    try:
        response = requests.get(f"{BASE_URL}/health" if "health" in BASE_URL else BASE_URL.replace("/api/v1", "/health"), timeout=TIMEOUT)
        return response.status_code < 500
    except Exception as e:
        return False

def select_url_from_list() -> Optional[str]:
    """從推薦清單中選擇 URL"""
    print("\n📋 推薦測試 URL:")
    for key, (url, description) in RECOMMENDED_URLS.items():
        print(f"  {key}) {description}")
        print(f"     URL: {url}")
    
    print(f"  0) 自訂 URL")
    
    choice = input("\n請選擇 (0-5): ").strip()
    
    if choice == "0":
        custom_url = input("請輸入 URL: ").strip()
        if custom_url.startswith("http"):
            return custom_url
        else:
            print_error("URL 必須以 http:// 或 https:// 開頭")
            return None
    elif choice in RECOMMENDED_URLS:
        url, description = RECOMMENDED_URLS[choice]
        print_info(f"已選擇: {description}")
        return url
    else:
        print_error("無效選擇")
        return None

def create_session() -> Optional[str]:
    """建立新 Session"""
    try:
        response = requests.post(
            f"{BASE_URL}/session/create",
            timeout=TIMEOUT
        )
        
        if response.status_code == 201:
            data = response.json()
            session_id = data["session_id"]
            print_success(f"Session 已建立")
            print(f"  Session ID: {session_id}")
            print(f"  State: {data['state']}")
            print(f"  Expires: {data['expires_at']}")
            return session_id
        else:
            print_error(f"Session 建立失敗: {response.status_code}")
            print(f"  回應: {response.text}")
            return None
    except Exception as e:
        print_error(f"Session 建立異常: {e}")
        return None

def upload_url(session_id: str, url: str) -> Optional[str]:
    """上傳 URL"""
    try:
        response = requests.post(
            f"{BASE_URL}/upload/{session_id}/url",
            json={"url": url},
            timeout=TIMEOUT
        )
        
        if response.status_code == 202:
            data = response.json()
            document_id = data["document_id"]
            print_success(f"URL 已提交")
            print(f"  Document ID: {document_id}")
            print(f"  Source Type: {data['source_type']}")
            print(f"  Source: {data['source_reference']}")
            print(f"  Initial Status: {data['extraction_status']} / {data['moderation_status']}")
            return document_id
        else:
            print_error(f"URL 上傳失敗: {response.status_code}")
            print(f"  回應: {response.text}")
            return None
    except Exception as e:
        print_error(f"URL 上傳異常: {e}")
        return None

def poll_status(session_id: str, document_id: str, wait: bool = False) -> bool:
    """輪詢處理狀態"""
    if not wait:
        print_info("跳過狀態輪詢 (使用 --wait 等待完成)")
        return True
    
    print("⏳ 等待處理完成...")
    
    for attempt in range(MAX_POLL_ATTEMPTS):
        try:
            response = requests.get(
                f"{BASE_URL}/upload/{session_id}/status/{document_id}",
                timeout=TIMEOUT
            )
            
            if response.status_code == 200:
                data = response.json()
                progress = data["processing_progress"]
                extraction = data["extraction_status"]
                moderation = data["moderation_status"]
                
                # 顯示進度
                status_line = f"  進度: {progress:3d}% | 萃取: {extraction:12s} | 審核: {moderation:12s}"
                print(f"\r{status_line}", end="", flush=True)
                
                # 檢查完成
                if extraction == "COMPLETED" and moderation == "APPROVED":
                    print()  # 新行
                    print_success(f"處理完成！")
                    print(f"  分塊數: {data['chunk_count']}")
                    print(f"  摘要: {data['summary'][:100] if data['summary'] else 'N/A'}...")
                    return True
                elif extraction == "FAILED" or moderation == "BLOCKED":
                    print()  # 新行
                    print_error(f"處理失敗或被阻擋")
                    print(f"  萃取狀態: {extraction}")
                    print(f"  審核狀態: {moderation}")
                    if data.get("error_message"):
                        print(f"  錯誤: {data['error_message']}")
                    return False
                
                time.sleep(POLL_INTERVAL)
            else:
                print_error(f"狀態查詢失敗: {response.status_code}")
                return False
        
        except Exception as e:
            print_error(f"狀態查詢異常: {e}")
            return False
    
    print()  # 新行
    print_error(f"處理超時 (等待超過 {MAX_POLL_ATTEMPTS * POLL_INTERVAL} 秒)")
    return False

def get_documents(session_id: str):
    """列出所有文件"""
    try:
        response = requests.get(
            f"{BASE_URL}/upload/{session_id}/documents",
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            documents = response.json()
            print_success(f"共有 {len(documents)} 個文件")
            for doc in documents:
                print(f"  • {doc['document_id']}")
                print(f"    - Type: {doc['source_type']}")
                print(f"    - Source: {doc['source_reference']}")
                print(f"    - Chunks: {doc.get('chunk_count', 'N/A')}")
            return documents
        else:
            print_error(f"文件列表失敗: {response.status_code}")
            return []
    except Exception as e:
        print_error(f"文件列表異常: {e}")
        return []

def close_session(session_id: str):
    """關閉 Session"""
    try:
        response = requests.post(
            f"{BASE_URL}/session/{session_id}/close",
            timeout=TIMEOUT
        )
        
        if response.status_code == 204:
            print_success("Session 已關閉")
        else:
            print_error(f"Session 關閉失敗: {response.status_code}")
    except Exception as e:
        print_error(f"Session 關閉異常: {e}")

def main():
    """主函式"""
    parser = argparse.ArgumentParser(
        description="URL 上傳功能測試",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
範例:
  python test_url_upload.py
  python test_url_upload.py --url "https://example.com"
  python test_url_upload.py --url "https://example.com" --wait
        """
    )
    
    parser.add_argument("--url", help="測試 URL")
    parser.add_argument("--wait", action="store_true", help="等待處理完成")
    parser.add_argument("--session-id", help="使用現有 Session ID")
    
    args = parser.parse_args()
    
    # 標題
    print_header("🌐 URL 上傳功能測試")
    
    # 檢查後端
    print_step(1, "檢查後端連接")
    if not check_backend():
        print_error(f"無法連接到後端: {BASE_URL}")
        print_info("請確保:")
        print_info("  1. 後端服務正在運行")
        print_info("  2. Qdrant 容器正在運行")
        print_info("  3. 執行: docker-compose up -d")
        sys.exit(1)
    
    print_success(f"後端已連接: {BASE_URL}")
    
    # 建立或使用 Session
    if args.session_id:
        session_id = args.session_id
        print_info(f"使用現有 Session: {session_id}")
    else:
        print_step(2, "建立 Session")
        session_id = create_session()
        if not session_id:
            sys.exit(1)
    
    # 選擇或使用 URL
    if args.url:
        url = args.url
        print_info(f"使用指定 URL: {url}")
    else:
        print_step(3, "選擇測試 URL")
        url = select_url_from_list()
        if not url:
            sys.exit(1)
    
    # 上傳 URL
    print_step(4, "上傳 URL")
    document_id = upload_url(session_id, url)
    if not document_id:
        sys.exit(1)
    
    # 輪詢狀態
    print_step(5, "查詢處理狀態")
    success = poll_status(session_id, document_id, wait=args.wait)
    
    # 列出文件
    print_step(6, "列出所有文件")
    get_documents(session_id)
    
    # 選項: 關閉 Session
    print_step(7, "完成")
    if not args.session_id:
        close_session(session_id)
    
    # 結果摘要
    print_header("📊 測試結果摘要")
    if success:
        print_success("URL 上傳測試成功！")
        print("\n🎯 下一步:")
        print("  1. 進行 RAG 查詢測試")
        print("  2. 嘗試其他 URL")
        print("  3. 檢查前端 UI")
    else:
        print_error("URL 上傳測試失敗")
        print("\n🔍 故障排查:")
        print("  1. 查看後端日誌: docker logs rag-chabot-backend")
        print("  2. 檢查 URL 是否可達: curl <URL>")
        print("  3. 確認 Gemini API Key 已設置")

if __name__ == "__main__":
    main()
