from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class PaymentBase(BaseModel):
    invoice_id: str = Field(alias="invoiceId")
    amount_received: float = Field(alias="amountReceived")
    tds_amount: float = Field(default=0, alias="tdsAmount")
    payment_date: str = Field(alias="paymentDate")
    remarks: Optional[str] = Field(default="")

    class Config:
        populate_by_name = True

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    amount_received: Optional[float] = Field(default=None, alias="amountReceived")
    tds_amount: Optional[float] = Field(default=None, alias="tdsAmount")
    payment_date: Optional[str] = Field(default=None, alias="paymentDate")
    remarks: Optional[str] = None

    class Config:
        populate_by_name = True

class Payment(PaymentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), alias="createdAt")

    class Config:
        populate_by_name = True
