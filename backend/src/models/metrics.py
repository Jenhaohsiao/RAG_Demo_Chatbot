"""
Metrics entity model
Based on data-model.md Entity 5: Metrics
"""
from pydantic import BaseModel, Field, field_validator


class Metrics(BaseModel):
    """Resource usage metrics for transparency"""
    token_input: int = Field(ge=0)
    token_output: int = Field(ge=0)
    token_total: int = Field(ge=0)
    token_limit: int = Field(default=32000)
    token_percent: float = Field(ge=0.0, le=100.0)
    context_tokens: int = Field(ge=0)
    context_percent: float = Field(ge=0.0, le=100.0)
    vector_count: int = Field(ge=0)
    
    def __init__(self, **data):
        # Auto-calculate token_total if not provided
        if 'token_total' not in data and 'token_input' in data and 'token_output' in data:
            data['token_total'] = data['token_input'] + data['token_output']
        
        # Auto-calculate token_percent if not provided
        if 'token_percent' not in data and 'token_total' in data:
            data['token_percent'] = (data['token_total'] / data.get('token_limit', 32000)) * 100
        
        # Auto-calculate context_percent if not provided
        if 'context_percent' not in data and 'context_tokens' in data:
            data['context_percent'] = (data['context_tokens'] / data.get('token_limit', 32000)) * 100
        
        super().__init__(**data)
    
    @field_validator('token_total')
    @classmethod
    def validate_token_total(cls, v: int, info) -> int:
        """Ensure token_total equals token_input + token_output"""
        if 'token_input' in info.data and 'token_output' in info.data:
            expected = info.data['token_input'] + info.data['token_output']
            if v != expected:
                raise ValueError(f"token_total must equal token_input + token_output (expected {expected}, got {v})")
        return v
    
    def is_warning_level(self) -> bool:
        """Check if token usage exceeds 80% warning threshold"""
        return self.token_percent > 80.0
    
    def get_color_code(self) -> str:
        """Get UI color code based on token_percent"""
        if self.token_percent < 50:
            return "green"
        elif self.token_percent < 80:
            return "yellow"
        else:
            return "red"
    
    class Config:
        json_schema_extra = {
            "example": {
                "token_input": 256,
                "token_output": 128,
                "token_total": 384,
                "token_limit": 32000,
                "token_percent": 1.2,
                "context_tokens": 180,
                "context_percent": 0.56,
                "vector_count": 13
            }
        }
