from pydantic import BaseModel, Field
from typing import Optional
import uuid

class SeriesBase(BaseModel):
    voucher_type: str = Field(alias="voucherType")  # Invoice, Quotation, Credit Note, etc.
    prefix: str  # e.g., "INV-", "Q-", "CN-"
    current_number: int = Field(default=1, alias="currentNumber")
    suffix: str = Field(default="")  # Optional suffix
    
    class Config:
        populate_by_name = True

class SeriesCreate(SeriesBase):
    pass

class SeriesUpdate(BaseModel):
    prefix: Optional[str] = None
    current_number: Optional[int] = Field(default=None, alias="currentNumber")
    suffix: Optional[str] = None
    
    class Config:
        populate_by_name = True

class Series(SeriesBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    class Config:
        populate_by_name = True
