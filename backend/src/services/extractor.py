"""
Content Extractor Service
Extracts text content from PDF files, text files, and web URLs
"""
import io
import logging
from typing import Optional
from urllib.parse import urlparse

import requests
from PyPDF2 import PdfReader
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Constants
MAX_URL_FETCH_SIZE = 10 * 1024 * 1024  # 10MB
URL_FETCH_TIMEOUT = 30  # seconds
SUPPORTED_PDF_ENCODINGS = ['utf-8', 'latin-1', 'cp1252']


class ExtractionError(Exception):
    """Base exception for extraction errors"""
    pass


class PDFExtractionError(ExtractionError):
    """Raised when PDF extraction fails"""
    pass


class URLFetchError(ExtractionError):
    """Raised when URL fetching fails"""
    pass


class TextExtractionError(ExtractionError):
    """Raised when text extraction fails"""
    pass


def extract_pdf(file_content: bytes, filename: str = "unknown.pdf") -> str:
    """
    Extract text content from PDF file bytes
    
    Args:
        file_content: PDF file content as bytes
        filename: Original filename for logging purposes
        
    Returns:
        str: Extracted text content
        
    Raises:
        PDFExtractionError: If PDF extraction fails
    """
    try:
        # Create PDF reader from bytes
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PdfReader(pdf_file)
        
        # Check if PDF has pages
        num_pages = len(pdf_reader.pages)
        if num_pages == 0:
            raise PDFExtractionError(f"PDF file '{filename}' has no pages")
        
        # Extract text from all pages
        extracted_text = []
        for page_num, page in enumerate(pdf_reader.pages, start=1):
            try:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    extracted_text.append(page_text)
                    logger.debug(f"Extracted {len(page_text)} chars from page {page_num}/{num_pages}")
            except Exception as e:
                logger.warning(f"Failed to extract text from page {page_num}: {e}")
                # Continue with other pages even if one fails
                continue
        
        # Combine all pages
        full_text = "\n\n".join(extracted_text)
        
        # Validate extraction
        if not full_text.strip():
            raise PDFExtractionError(
                f"PDF file '{filename}' appears to be empty or contains only scanned images. "
                "OCR is not supported - please upload text-based PDFs."
            )
        
        logger.info(f"Successfully extracted {len(full_text)} characters from PDF '{filename}' ({num_pages} pages)")
        return full_text
        
    except PDFExtractionError:
        raise
    except Exception as e:
        logger.error(f"PDF extraction failed for '{filename}': {e}")
        raise PDFExtractionError(f"Failed to extract text from PDF: {str(e)}")


def extract_text(text_content: str, filename: str = "unknown.txt") -> str:
    """
    Process plain text content
    
    Args:
        text_content: Raw text content
        filename: Original filename for logging purposes
        
    Returns:
        str: Processed text content
        
    Raises:
        TextExtractionError: If text processing fails
    """
    try:
        # Strip whitespace and validate
        processed_text = text_content.strip()
        
        if not processed_text:
            raise TextExtractionError(f"Text file '{filename}' is empty")
        
        logger.info(f"Successfully processed {len(processed_text)} characters from text file '{filename}'")
        return processed_text
        
    except TextExtractionError:
        raise
    except Exception as e:
        logger.error(f"Text extraction failed for '{filename}': {e}")
        raise TextExtractionError(f"Failed to process text content: {str(e)}")


def extract_url(url: str) -> str:
    """
    Fetch and extract text content from a web URL
    
    Args:
        url: Web URL to fetch content from
        
    Returns:
        str: Extracted text content from the webpage
        
    Raises:
        URLFetchError: If URL fetching or extraction fails
    """
    try:
        # Validate URL
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            raise URLFetchError(f"Invalid URL format: {url}")
        
        if parsed_url.scheme not in ['http', 'https']:
            raise URLFetchError(f"Unsupported URL scheme: {parsed_url.scheme}. Only HTTP/HTTPS are supported.")
        
        logger.info(f"Fetching content from URL: {url}")
        
        # Fetch URL content with timeout and size limit
        response = requests.get(
            url,
            timeout=URL_FETCH_TIMEOUT,
            stream=True,
            headers={
                'User-Agent': 'RAG-Chatbot/1.0 (Document Extractor)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        )
        
        # Check response status
        response.raise_for_status()
        
        # Check content type
        content_type = response.headers.get('Content-Type', '')
        if 'text/html' not in content_type and 'application/xhtml' not in content_type:
            logger.warning(f"URL content type is '{content_type}', may not be HTML")
        
        # Read content with size limit
        content = b''
        for chunk in response.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > MAX_URL_FETCH_SIZE:
                raise URLFetchError(f"URL content exceeds maximum size of {MAX_URL_FETCH_SIZE / 1024 / 1024}MB")
        
        # Parse HTML and extract text
        soup = BeautifulSoup(content, 'html.parser')
        
        # Remove script and style elements
        for script_or_style in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
            script_or_style.decompose()
        
        # Extract text
        text = soup.get_text(separator='\n', strip=True)
        
        # Clean up whitespace
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        extracted_text = '\n'.join(lines)
        
        # Validate extraction
        if not extracted_text:
            raise URLFetchError(f"No text content found at URL: {url}")
        
        logger.info(f"Successfully extracted {len(extracted_text)} characters from URL: {url}")
        return extracted_text
        
    except requests.exceptions.Timeout:
        raise URLFetchError(f"URL fetch timeout after {URL_FETCH_TIMEOUT} seconds: {url}")
    except requests.exceptions.ConnectionError as e:
        raise URLFetchError(f"Failed to connect to URL: {url}. Error: {str(e)}")
    except requests.exceptions.HTTPError as e:
        raise URLFetchError(f"HTTP error {e.response.status_code} for URL: {url}")
    except URLFetchError:
        raise
    except Exception as e:
        logger.error(f"URL extraction failed for '{url}': {e}")
        raise URLFetchError(f"Failed to extract content from URL: {str(e)}")


# Convenience function to detect and extract from any source type
def extract_content(
    content: bytes | str,
    source_type: str,
    source_reference: str
) -> str:
    """
    Auto-detect content type and extract text
    
    Args:
        content: File content (bytes) or text (str) or URL (str)
        source_type: One of 'PDF', 'TEXT', 'URL'
        source_reference: Filename or URL for logging
        
    Returns:
        str: Extracted text content
        
    Raises:
        ExtractionError: If extraction fails
    """
    source_type = source_type.upper()
    
    if source_type == 'PDF':
        if not isinstance(content, bytes):
            raise ExtractionError("PDF content must be bytes")
        return extract_pdf(content, source_reference)
    
    elif source_type == 'TEXT':
        if not isinstance(content, str):
            raise ExtractionError("Text content must be string")
        return extract_text(content, source_reference)
    
    elif source_type == 'URL':
        if not isinstance(content, str):
            raise ExtractionError("URL content must be string")
        return extract_url(content)
    
    else:
        raise ExtractionError(f"Unsupported source type: {source_type}. Supported types: PDF, TEXT, URL")
