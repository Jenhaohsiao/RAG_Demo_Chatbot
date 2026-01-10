"""測試問候語功能"""
import sys
sys.path.insert(0, '/app')

from src.services.rag_engine import RAGEngine

# 測試問候語檢測
test_queries = [
    "你好",
    "hello",
    "謝謝",
    "thanks",
    "白兔是誰"  # 非問候語
]

for query in test_queries:
    greeting_patterns = [
        '你好', '您好', 'hello', 'hi', 'hey', '안녕', 'hola', 'bonjour', 'こんにちは',
        '謝謝', '感謝', 'thank', 'thanks', '감사', 'gracias', 'merci', 'ありがとう',
        '再見', 'bye', 'goodbye', '안녕히', 'adiós', 'au revoir', 'さようなら'
    ]
    is_greeting = any(pattern in query.lower() for pattern in greeting_patterns) and len(query) < 20
    print(f"查詢: '{query}' -> 是問候語: {is_greeting}")
