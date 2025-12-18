# Similarity Threshold Configuration Feature

## Overview
This document describes the user-configurable similarity threshold feature that allows users to control the strictness of the RAG (Retrieval-Augmented Generation) system.

## Problem Statement
The original implementation used a fixed similarity threshold of 0.7, which was too strict for practical use. This caused:
- Most queries to return "CANNOT_ANSWER" responses
- Poor user experience during manual testing
- Inability to adjust precision/recall tradeoff based on use case

## Solution
Implemented a complete user-configurable similarity threshold system that allows users to adjust the threshold from the UI (range: 0.3-0.9, default: 0.5).

## Architecture

### Backend Changes

#### 1. Session Model (`backend/src/models/session.py`)
- Added `similarity_threshold` field to `Session` class
- Default value: 0.5
- Validation: Must be between 0.0 and 1.0
- Field is included in session creation and persistence

```python
similarity_threshold: float = Field(
    default=0.5, 
    ge=0.0, 
    le=1.0, 
    description="RAG similarity threshold"
)
```

#### 2. Session Manager (`backend/src/core/session_manager.py`)
- Updated `create_session()` to accept `similarity_threshold` parameter
- Passes threshold to Session constructor
- Stores threshold in session metadata

#### 3. API Routes (`backend/src/api/routes/session.py`)
- POST `/api/v1/session/create` now accepts `similarity_threshold` query parameter
- Validates threshold is between 0.0 and 1.0
- Returns 400 Bad Request if validation fails

```python
@router.post("/create", response_model=SessionResponse)
async def create_session_endpoint(
    language: str = Query(default="en"),
    similarity_threshold: float = Query(default=0.5, ge=0.0, le=1.0)
):
```

#### 4. RAG Engine (`backend/src/services/rag_engine.py`)
- Updated `query()` method to accept optional `similarity_threshold` parameter
- Uses session-specific threshold if provided, otherwise falls back to global config
- Passes threshold to vector store search

```python
threshold = similarity_threshold if similarity_threshold is not None else self.similarity_threshold
chunks = await self.vector_store.search_similar(query, top_k=5, threshold=threshold)
```

#### 5. Chat Routes (`backend/src/api/routes/chat.py`)
- Retrieves `session.similarity_threshold` from session metadata
- Passes it to RAG engine query method

### Frontend Changes

#### 1. TypeScript Types (`frontend/src/types/session.ts`)
- Added `similarity_threshold: number` to `Session` interface
- Added `similarity_threshold: number` to `SessionResponse` interface

#### 2. Session Service (`frontend/src/services/sessionService.ts`)
- Updated `createSession()` to accept `similarityThreshold` parameter (default: 0.5)
- Passes as query parameter to backend API

```typescript
export const createSession = async (
  language: string = 'en', 
  similarityThreshold: number = 0.5
): Promise<SessionResponse> => {
  const response = await apiClient.post<SessionResponse>(
    `/session/create?language=${language}&similarity_threshold=${similarityThreshold}`
  );
  return response.data;
};
```

#### 3. Session Hook (`frontend/src/hooks/useSession.ts`)
- Updated `createSession()` to accept optional `similarityThreshold` parameter
- Passes threshold to sessionService

#### 4. Settings Modal Component (`frontend/src/components/SettingsModal.tsx`)
**NEW COMPONENT** - 121 lines
- React Bootstrap modal dialog
- Range slider input (0.3-0.9, step 0.1)
- Visual labels: "Lenient", "Balanced", "Strict"
- Color-coded badges showing current mode:
  - 0.3-0.4: Lenient (success/green)
  - 0.5-0.6: Balanced (warning/yellow)
  - 0.7-0.9: Strict (danger/red)
- Recommendations card with guidance for each mode
- Full i18n support (7 languages)

Features:
- Real-time preview of threshold value
- Visual feedback for current mode
- Recommendations for each threshold range
- Cancel/Save actions

#### 5. Main App (`frontend/src/main.tsx`)
- Added state for `showSettings` and `similarityThreshold`
- Added Settings button in welcome screen (top-right corner with gear icon)
- Integrated SettingsModal component
- When threshold changes, closes existing session and creates new one with updated threshold
- Passes threshold to `createSession()` on mount

#### 6. Translations (All 7 languages)
Added complete translations for settings feature:
- **English** (`en.json`)
- **Traditional Chinese** (`zh-TW.json`)
- **Simplified Chinese** (`zh-CN.json`)
- **Korean** (`ko.json`)
- **Spanish** (`es.json`)
- **Japanese** (`ja.json`)
- **Arabic** (`ar.json`)
- **French** (`fr.json`)

Translation keys:
```json
{
  "buttons": {
    "settings": "Settings"
  },
  "settings": {
    "title": "RAG Settings",
    "threshold": {
      "label": "Similarity Threshold",
      "description": "Controls how strict the RAG system is...",
      "low": "Lenient",
      "high": "Strict",
      "strict": "Strict Mode",
      "balanced": "Balanced Mode",
      "lenient": "Lenient Mode",
      "recommendations": "Recommendations",
      "rec_lenient": "Suitable for exploratory queries...",
      "rec_balanced": "Recommended setting...",
      "rec_strict": "Only answers highly relevant questions..."
    }
  }
}
```

## User Experience

### Initial Setup
1. User opens the application
2. Welcome screen displays with Settings button (gear icon) in top-right
3. Default threshold: 0.5 (Balanced mode)

### Changing Threshold
1. Click Settings button
2. Modal opens showing current threshold
3. Adjust slider to desired value (0.3-0.9)
4. See real-time feedback:
   - Current value displayed
   - Mode badge updates (Lenient/Balanced/Strict)
   - Recommendations update
5. Click Save
6. Modal closes
7. If session exists, it's recreated with new threshold
8. New uploads/queries use the new threshold

### Threshold Ranges
- **0.3-0.4 (Lenient)**: More results, potentially less relevant
  - Good for exploratory queries
  - May include more false positives
  
- **0.5-0.6 (Balanced)**: Recommended default
  - Balances precision and recall
  - Suitable for most use cases
  
- **0.7-0.9 (Strict)**: Fewer results, higher precision
  - Only highly relevant answers
  - May return CANNOT_ANSWER more frequently

## Testing

### Manual Testing Steps
1. Start frontend and backend
2. Open browser to http://localhost:5173
3. Click Settings button
4. Verify modal opens with default 0.5
5. Move slider to 0.3 (Lenient)
6. Verify badge changes to green "Lenient Mode"
7. Click Save
8. Upload a PDF document
9. Ask questions and observe:
   - More results returned with lower threshold
   - Fewer CANNOT_ANSWER responses
10. Change threshold to 0.8 (Strict)
11. Ask same questions and observe:
    - Fewer results
    - More CANNOT_ANSWER responses

### Backend Testing
The threshold parameter is validated at API level:
- Valid range: 0.0-1.0
- Invalid values return 400 Bad Request
- Default: 0.5 if not provided

### Frontend Testing
- Modal opens/closes correctly
- Slider updates badge and recommendations in real-time
- Save button creates new session with correct threshold
- Cancel button discards changes
- Translations work in all 7 languages

## Configuration

### Backend Configuration
Default threshold can be changed in `backend/src/core/config.py`:
```python
similarity_threshold: float = Field(
    default=0.5,
    description="Minimum similarity score for RAG retrieval"
)
```

### Frontend Configuration
Default threshold is set in `main.tsx`:
```typescript
const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
```

## API Reference

### POST /api/v1/session/create
Creates a new session with custom similarity threshold.

**Query Parameters:**
- `language` (string, optional): Session language, default "en"
- `similarity_threshold` (float, optional): RAG threshold, default 0.5, range 0.0-1.0

**Response:**
```json
{
  "session_id": "uuid",
  "state": "READY_FOR_UPLOAD",
  "language": "en",
  "similarity_threshold": 0.5,
  "expires_at": "2024-01-01T12:00:00Z"
}
```

**Error Response (400):**
```json
{
  "detail": "similarity_threshold must be between 0.0 and 1.0"
}
```

## Future Enhancements
1. **Persistence**: Save user's preferred threshold in localStorage
2. **Dynamic Adjustment**: Allow threshold change during chat without recreating session
3. **Auto-tuning**: Suggest optimal threshold based on query patterns
4. **Statistics**: Show distribution of similarity scores for uploaded documents
5. **Per-Query Override**: Allow threshold override on individual queries
6. **Presets**: Add preset buttons for common use cases (Technical Docs, Creative Content, FAQ)

## Related Files
### Backend
- `backend/src/models/session.py`
- `backend/src/core/session_manager.py`
- `backend/src/core/config.py`
- `backend/src/api/routes/session.py`
- `backend/src/api/routes/chat.py`
- `backend/src/services/rag_engine.py`

### Frontend
- `frontend/src/main.tsx`
- `frontend/src/components/SettingsModal.tsx` (NEW)
- `frontend/src/types/session.ts`
- `frontend/src/services/sessionService.ts`
- `frontend/src/hooks/useSession.ts`
- `frontend/src/i18n/locales/*.json` (7 files)

## Troubleshooting

### Issue: Settings button not visible
- Check frontend is running on port 5173
- Verify main.tsx changes applied
- Check browser console for errors

### Issue: Threshold not taking effect
- Verify session is recreated after changing threshold
- Check backend logs for threshold value
- Verify API accepts similarity_threshold parameter

### Issue: Translation missing
- Check locale file for settings.threshold section
- Verify i18n configuration loaded correctly
- Try switching language and back

## Conclusion
The similarity threshold feature provides users with fine-grained control over the RAG system's behavior, allowing them to optimize the tradeoff between precision and recall based on their specific use case. The implementation is complete across backend, frontend, and all supported languages.
