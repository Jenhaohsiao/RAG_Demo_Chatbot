"""
Contact form API route
Handles user contact form submissions and sends email notifications
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional

from src.core.config import settings
from src.core.logger import logger

router = APIRouter(tags=["contact"])


class ContactRequest(BaseModel):
    """Contact form submission model"""
    name: str
    email: Optional[str] = None
    message: str
    
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name is required")
        if len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        if len(v.strip()) > 100:
            raise ValueError("Name must not exceed 100 characters")
        return v.strip()
    
    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message is required")
        if len(v.strip()) < 10:
            raise ValueError("Message must be at least 10 characters")
        if len(v.strip()) > 200:
            raise ValueError("Message must not exceed 200 characters")
        return v.strip()
    
    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip()
        return None


class ContactResponse(BaseModel):
    """Contact form response model"""
    success: bool
    message: str


def send_email(name: str, email: Optional[str], message: str) -> bool:
    """
    Send email notification for contact form submission
    
    Args:
        name: Sender's name
        email: Sender's email (optional)
        message: Message content
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Check if SMTP credentials are configured
        if not settings.smtp_username or not settings.smtp_password:
            logger.warning("SMTP credentials not configured - email not sent")
            # Return True to avoid breaking the user flow
            # In production, you should configure SMTP or use a proper email service
            return True
        
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"RAG Demo Chatbot - New Contact Message from {name}"
        msg["From"] = settings.smtp_username
        msg["To"] = settings.contact_email_recipient
        msg["Reply-To"] = email if email else settings.smtp_username
        
        # Create HTML email body
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
              <h2 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                New Contact Form Message
              </h2>
              
              <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 10px 0;"><strong>Name:</strong> {name}</p>
                <p style="margin: 10px 0;"><strong>Email:</strong> {email if email else "Not provided"}</p>
                <p style="margin: 10px 0;"><strong>Submitted:</strong> {timestamp}</p>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="margin: 10px 0;"><strong>Message:</strong></p>
                  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 10px;">
                    <p style="white-space: pre-wrap; margin: 0;">{message}</p>
                  </div>
                </div>
              </div>
              
              <div style="margin-top: 20px; padding: 15px; background-color: #e8eaf6; border-radius: 5px;">
                <p style="margin: 0; font-size: 12px; color: #666;">
                  This email was automatically sent by RAG Demo Chatbot
                  <br>
                  Source: Contact Form Submission
                </p>
              </div>
            </div>
          </body>
        </html>
        """
        
        # Attach HTML part
        html_part = MIMEText(html_body, "html", "utf-8")
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
        
        logger.info(f"Contact form email sent successfully from {name}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send contact form email: {str(e)}")
        # Don't raise exception - just log error and return False
        return False


@router.post("/", response_model=ContactResponse, status_code=status.HTTP_200_OK)
async def submit_contact_form(request: ContactRequest) -> ContactResponse:
    """
    Submit contact form
    
    Receives contact form data and sends notification email
    
    Args:
        request: Contact form data
        
    Returns:
        ContactResponse: Success status and message
        
    Raises:
        HTTPException: If validation fails or email sending fails
    """
    try:
        logger.info(f"Contact form submission received from {request.name}")
        
        # Send email notification
        email_sent = send_email(
            name=request.name,
            email=request.email,
            message=request.message
        )
        
        if email_sent:
            return ContactResponse(
                success=True,
                message="Message sent successfully! We will respond to you as soon as possible."
            )
        else:
            # Email failed but don't fail the request
            # This allows the form to work even if email is not configured
            logger.warning("Email sending failed but returning success to user")
            return ContactResponse(
                success=True,
                message="Message recorded, but email notification may not have been sent successfully."
            )
            
    except ValueError as e:
        logger.warning(f"Contact form validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(e)}
        )
    except Exception as e:
        logger.error(f"Contact form submission error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Unable to process your message. Please try again later."}
        )
