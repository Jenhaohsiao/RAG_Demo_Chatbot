#!/usr/bin/env python3
"""
Simple server startup script
"""
import sys
import os

# Add backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# CRITICAL: Change working directory to backend/ so .env files can be found
os.chdir(backend_dir)

if __name__ == "__main__":
    # Import and run uvicorn
    import uvicorn
    from src.main import app
    
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info"
    )
