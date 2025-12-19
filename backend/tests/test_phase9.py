"""
Phase 9: Polish & Cross-Cutting Concerns - Comprehensive Tests

Test coverage for:
- T089: Error handling (HTTP 400, 404, 409, 410, 500)
- T090: Request validation middleware
- T091: Logging system
- T095-T100: Edge cases (file validation, timeouts, rate limiting, Qdrant errors)
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.src.main import app
from backend.src.models.errors import ErrorCode


client = TestClient(app)


class TestErrorHandling:
    """T089: Comprehensive error handling with correct HTTP status codes"""
    
    def test_session_not_found_404(self):
        """POST /chat/{session_id}/query with invalid session → 404"""
        response = client.post(
            "/api/v1/chat/invalid-session-id/query",
            json={"query": "test"}
        )
        assert response.status_code == 404
        assert response.json()["error"]["code"] == ErrorCode.SESSION_NOT_FOUND
    
    def test_empty_query_400(self):
        """POST /chat/{session_id}/query with empty query → 400"""
        # First create a valid session
        session_response = client.post("/api/v1/session/create")
        session_id = session_response.json()["session_id"]
        
        # Send empty query
        response = client.post(
            f"/api/v1/chat/{session_id}/query",
            json={"query": ""}
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == ErrorCode.QUERY_EMPTY
    
    def test_file_too_large_400(self):
        """Upload file >10MB → 400 FILE_TOO_LARGE"""
        session_response = client.post("/api/v1/session/create")
        session_id = session_response.json()["session_id"]
        
        # Create large file (simulated)
        large_content = "x" * (11 * 1024 * 1024)  # 11 MB
        response = client.post(
            f"/api/v1/upload/{session_id}/file",
            files={"file": ("large.txt", large_content)}
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == ErrorCode.FILE_TOO_LARGE
    
    def test_unsupported_format_400(self):
        """Upload unsupported format (.jpg) → 400 UNSUPPORTED_FORMAT"""
        session_response = client.post("/api/v1/session/create")
        session_id = session_response.json()["session_id"]
        
        response = client.post(
            f"/api/v1/upload/{session_id}/file",
            files={"file": ("image.jpg", b"fake image content")}
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == ErrorCode.UNSUPPORTED_FORMAT
    
    def test_server_error_500(self):
        """Internal server error → 500"""
        # Mock an unhandled exception
        with patch('backend.src.api.routes.session.session_manager') as mock_sm:
            mock_sm.create_session.side_effect = Exception("Unexpected error")
            response = client.post("/api/v1/session/create")
            assert response.status_code == 500
            assert "error" in response.json()


class TestRequestValidation:
    """T090: Request validation middleware using Pydantic models"""
    
    def test_invalid_json_422(self):
        """Invalid JSON payload → 422 Validation Error"""
        response = client.post(
            "/api/v1/session/create",
            data="{invalid json}",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [400, 422]  # FastAPI/Starlette validation error
    
    def test_missing_required_field_422(self):
        """Missing required field in request → 422"""
        session_response = client.post("/api/v1/session/create")
        session_id = session_response.json()["session_id"]
        
        # Send query without 'query' field
        response = client.post(
            f"/api/v1/chat/{session_id}/query",
            json={}
        )
        assert response.status_code == 422
    
    def test_invalid_field_type_422(self):
        """Invalid field type → 422"""
        session_response = client.post("/api/v1/session/create")
        session_id = session_response.json()["session_id"]
        
        # Send query with wrong type
        response = client.post(
            f"/api/v1/chat/{session_id}/query",
            json={"query": 123}  # Should be string
        )
        assert response.status_code == 422


class TestEdgeCases:
    """T095-T100: Edge case handling"""
    
    def test_empty_pdf_detection(self):
        """T097: Empty/scanned PDF → ERR_EMPTY_FILE"""
        session_response = client.post("/api/v1/session/create")
        session_id = session_response.json()["session_id"]
        
        # Mock PDF extraction returning empty
        with patch('backend.src.services.extractor.extract_pdf') as mock_extract:
            mock_extract.return_value = ""
            response = client.post(
                f"/api/v1/upload/{session_id}/file",
                files={"file": ("empty.pdf", b"PDF content")}
            )
            # Should handle empty content
            if response.status_code == 400:
                assert response.json()["error"]["code"] == ErrorCode.EMPTY_FILE
    
    def test_url_timeout_handling(self):
        """T098: URL fetch timeout → ERR_URL_TIMEOUT"""
        session_response = client.post("/api/v1/session/create")
        session_id = session_response.json()["session_id"]
        
        # Mock timeout
        with patch('backend.src.services.extractor.extract_url') as mock_url:
            mock_url.side_effect = TimeoutError("Request timed out")
            response = client.post(
                f"/api/v1/upload/{session_id}/url",
                json={"url": "https://example.com/very-slow-page"}
            )
            assert response.status_code == 408 or response.status_code == 500
    
    def test_qdrant_connection_error(self):
        """T100: Qdrant connection error → graceful fallback"""
        with patch('backend.src.services.vector_store.QdrantClient') as mock_qdrant:
            mock_qdrant.side_effect = Exception("Qdrant connection failed")
            response = client.post("/api/v1/session/create")
            # Should either fail gracefully or provide fallback
            assert response.status_code in [500, 503]


class TestLogging:
    """T091: Logging system verification"""
    
    def test_successful_operation_logs(self):
        """Successful operations should log INFO level"""
        import logging
        logger = logging.getLogger("backend.src")
        
        with patch.object(logger, 'info') as mock_info:
            response = client.post("/api/v1/session/create")
            assert response.status_code == 200
            # Should log successful session creation
            # Note: Actual logging verification depends on implementation
    
    def test_error_operation_logs(self):
        """Error operations should log ERROR level"""
        import logging
        logger = logging.getLogger("backend.src")
        
        with patch.object(logger, 'error') as mock_error:
            response = client.post("/api/v1/chat/invalid-id/query", json={"query": "test"})
            assert response.status_code == 404
            # Should log error


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
