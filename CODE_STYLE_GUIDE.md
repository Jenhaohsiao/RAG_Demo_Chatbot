# Code Style Guide - RAG Demo Chatbot

**Project**: RAG Demo Chatbot  
**Last Updated**: 2026-01-18  
**Branch**: `001-multilingual-rag-chatbot`

---

## 🌐 Language Policy

### System Code (Backend/Frontend Core)

**Rule**: All system code, comments, and documentation should be in **English**.

**Applies to**:
- Python backend code (`backend/src/**/*.py`)
- TypeScript/React frontend code (`frontend/src/**/*.ts`, `frontend/src/**/*.tsx`)
- Configuration files (`.env`, `.yaml`, `.json`, `.toml`)
- API documentation (OpenAPI/Swagger)
- Code comments and docstrings
- Variable names and function names
- Log messages
- Error messages in code (not user-facing)
- Git commit messages
- README files
- Technical documentation

**Rationale**:
- International collaboration standard
- Code review efficiency
- Better AI/LLM code assistance
- Open source readiness
- Professional development practices

---

### User-Facing Content

**Rule**: User-facing content must use **i18n (internationalization)** system.

**Applies to**:
- UI text (buttons, labels, placeholders)
- Error messages shown to users
- Success/info notifications
- Modal dialogs
- Form validation messages
- Tooltips and help text

**Implementation**:
```typescript
// ✅ Correct - Using i18n
const { t } = useTranslation();
<button>{t('buttons.submit')}</button>

// ❌ Wrong - Hardcoded text
<button>提交</button>
<button>Submit</button>
```

```python
# ✅ Correct - Return error codes, let frontend translate
return {"error": "ERR_SESSION_NOT_FOUND"}

# ❌ Wrong - Hardcoded Chinese message
return {"error": "找不到會話"}
```

**Supported Languages**:
- English (en)
- French (fr)
- Traditional Chinese (zh-TW)
- Simplified Chinese (zh-CN)

---

## 📝 Comment Style

### Python Docstrings

```python
def create_session(language: str = "en") -> Session:
    """
    Create a new session with unique ID and Qdrant collection.
    
    Args:
        language: Initial UI language (default: en)
        
    Returns:
        Session: Newly created session object
        
    Raises:
        HTTPException: If Qdrant collection creation fails
    """
    pass
```

### Inline Comments

```python
# ✅ Correct - English comments
# Validate session exists
session = session_manager.get_session(session_id)

# ❌ Wrong - Chinese comments
# 驗證 session 存在
session = session_manager.get_session(session_id)
```

### TypeScript/JSX Comments

```typescript
// ✅ Correct
// Fetch user session data
const session = await fetchSession();

// ❌ Wrong
// 獲取用戶會話數據
const session = await fetchSession();
```

---

## 🏷️ Naming Conventions

### Variables and Functions

**Rule**: Use English, descriptive names

```python
# ✅ Correct
user_query = request.query
session_manager = SessionManager()

# ❌ Wrong
用戶查詢 = request.query
會話管理器 = SessionManager()
```

### Constants

```python
# ✅ Correct
MAX_TOKENS = 100000
SESSION_TTL_MINUTES = 30

# ❌ Wrong
最大令牌數 = 100000
會話存活時間 = 30
```

---

## 📋 File Headers

### Python Files

```python
"""
Module Name

Brief description of module purpose.

Constitutional Compliance:
- Principle X: Explanation
- Principle Y: Explanation

Created: YYYY-MM-DD
Author: Team/Individual
"""
```

### TypeScript Files

```typescript
/**
 * Component Name
 * 
 * Brief description of component purpose.
 * 
 * @author Team/Individual
 * @created YYYY-MM-DD
 */
```

---

## 🔒 Configuration Files

### Environment Variables

```bash
# ✅ Correct - English comments
# Gemini API Configuration
GEMINI_API_KEY=your_key_here

# ❌ Wrong - Chinese comments
# Gemini API 配置
GEMINI_API_KEY=your_key_here
```

---

## 📊 Logging

### Log Messages

**Rule**: All log messages in **English**

```python
# ✅ Correct
logger.info(f"Session {session_id} created successfully")
logger.error(f"Failed to connect to Qdrant: {error}")

# ❌ Wrong
logger.info(f"會話 {session_id} 創建成功")
logger.error(f"連接 Qdrant 失敗: {error}")
```

### Log Levels

```python
logger.debug("Detailed diagnostic info")
logger.info("General informational messages")
logger.warning("Warning messages for potential issues")
logger.error("Error messages for failures")
logger.critical("Critical system failures")
```

---

## 🌍 i18n Implementation

### Frontend Translation Files

Location: `frontend/src/i18n/locales/`

```
en.json       - English (base)
fr.json       - French
zh-TW.json    - Traditional Chinese
zh-CN.json    - Simplified Chinese
```

### Translation Keys Structure

```json
{
  "buttons": {
    "submit": "Submit",
    "cancel": "Cancel",
    "confirm": "Confirm"
  },
  "errors": {
    "sessionNotFound": "Session not found",
    "invalidInput": "Invalid input"
  },
  "workflow": {
    "step1": {
      "title": "Configure RAG",
      "description": "Set up retrieval parameters"
    }
  }
}
```

### Backend Error Codes

**Rule**: Return English error codes, frontend translates

```python
# Backend returns
{"error": "ERR_SESSION_NOT_FOUND"}

# Frontend displays
const errorMessage = t(`errors.${errorCode}`) // Uses i18n
```

---

## 🧪 Testing

### Test Names and Assertions

```python
# ✅ Correct - English test names
def test_create_session_with_valid_language():
    """Test session creation with valid language parameter"""
    pass

# ❌ Wrong - Chinese test names
def test_創建會話_使用有效語言():
    """測試使用有效語言參數創建會話"""
    pass
```

---

## 📚 Documentation

### Technical Documentation

**Rule**: Write in English for all technical docs

**Files**:
- `README.md`
- `DEPLOYMENT_GUIDE.md`
- `API_DOCUMENTATION.md`
- Code comments
- Architecture diagrams (labels in English)

### User-Facing Documentation

**Rule**: Provide multilingual versions

**Example**:
```
docs/
  README.md           (English - primary)
  README.zh-TW.md     (Traditional Chinese)
  README.zh-CN.md     (Simplified Chinese)
  README.fr.md        (French)
```

---

## 🔄 Migration Strategy

### Existing Chinese Comments

**Priority Order**:
1. **High Priority**: API routes, models, core services
2. **Medium Priority**: Utility functions, helpers
3. **Low Priority**: Test files, scripts

**Process**:
1. Review code section
2. Translate comments to English
3. Update docstrings
4. Verify functionality unchanged
5. Commit with clear message

**Example Commit Message**:
```
refactor: convert Chinese comments to English in chat routes

- Update all docstrings to English
- Convert inline comments to English
- Maintain i18n for user-facing messages
- No functional changes
```

---

## ✅ Checklist for New Code

Before submitting code, verify:

- [ ] All comments and docstrings in English
- [ ] Variable/function names in English
- [ ] Log messages in English
- [ ] User-facing text uses i18n system
- [ ] Error codes defined in English
- [ ] Configuration comments in English
- [ ] Test names and assertions in English
- [ ] No hardcoded Chinese/French/etc strings (except in i18n files)

---

## 🚫 Common Mistakes

### ❌ Mixing Languages in Comments

```python
# 錯誤 - Mixed Chinese and English
# 驗證 session exists
session = get_session(session_id)

# ✅ Correct
# Validate session exists
session = get_session(session_id)
```

### ❌ Hardcoded User Messages

```python
# ❌ Wrong - Hardcoded message
return {"message": "操作成功"}

# ✅ Correct - Use error codes
return {"message": "SUCCESS"}  # Frontend translates
```

### ❌ Chinese Variable Names

```python
# ❌ Wrong
用戶名稱 = request.get("name")

# ✅ Correct
user_name = request.get("name")
```

---

## 📖 References

- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [i18next Documentation](https://www.i18next.com/)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)

---

## 🔧 Tools and Automation

### VS Code Extensions

- **Better Comments**: Highlight different comment types
- **i18n Ally**: Manage i18n translations
- **Python Docstring Generator**: Auto-generate docstrings
- **ESLint**: Enforce code style

### Pre-commit Hooks

```bash
# Check for Chinese characters in code (except i18n files)
git diff --cached | grep -E '[\u4e00-\u9fff]' && echo "Chinese characters found in code!"
```

---

**Remember**: Code is read more often than written. Clear, English comments and i18n for users = better maintainability! 🚀
