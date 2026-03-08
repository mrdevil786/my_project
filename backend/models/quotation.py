from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid

class QuotationItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    unit: str
    rate: str  # Can be "At actuals" or a number
    remarks: str = ""

    class Config:
        populate_by_name = True

class QuotationDocument(BaseModel):
    name: str
    remarks: str = ""

class QuotationBase(BaseModel):
    quotation_no: str = Field(alias="quotationNo")
    quotation_date: str = Field(alias="quotationDate")
    customer_id: str = Field(alias="customerId")
    title: str  # e.g., "QUOTATION FOR CUSTOMS CLEARANCE - DPD + FACTORY DESTUFF"
    items: List[QuotationItem]
    documents: List[QuotationDocument] = Field(default_factory=list)
    notes: str = ""
    validity_days: int = Field(default=30, alias="validityDays")
    status: str = "Draft"  # Draft, Sent, Accepted, Rejected

    class Config:
        populate_by_name = True

class QuotationCreate(QuotationBase):
    pass

class QuotationUpdate(BaseModel):
    quotation_no: Optional[str] = Field(default=None, alias="quotationNo")
    quotation_date: Optional[str] = Field(default=None, alias="quotationDate")
    title: Optional[str] = None
    items: Optional[List[QuotationItem]] = None
    documents: Optional[List[QuotationDocument]] = None
    notes: Optional[str] = None
    validity_days: Optional[int] = Field(default=None, alias="validityDays")
    status: Optional[str] = None

    class Config:
        populate_by_name = True

class Quotation(QuotationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), alias="createdAt")

    class Config:
        populate_by_name = True
