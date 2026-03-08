from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class ShipmentDetails(BaseModel):
    ref_no: str = Field(default="", alias="refNo")
    be_no: str = Field(default="", alias="beNo")
    be_date: str = Field(default="", alias="beDate")
    pol: str = Field(default="")
    pod: str = Field(default="")
    no_of_containers: str = Field(default="", alias="noOfContainers")
    container_type: str = Field(default="", alias="containerType")
    no_of_packages: str = Field(default="", alias="noOfPackages")
    mbl: str = Field(default="")
    hbl: str = Field(default="")

    class Config:
        populate_by_name = True

class InvoiceExpense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    expense_head_id: str = Field(default="", alias="expenseHeadId")
    expense_name: str = Field(alias="expenseName")
    hsn_sac: str = Field(alias="hsnSac")
    gst_rate: float = Field(alias="gstRate")
    is_always_igst: bool = Field(default=False, alias="isAlwaysIGST")
    qty: float = 1
    rate: float
    currency: str = "INR"
    exchange_rate: float = Field(default=1, alias="exchangeRate")
    amount: float

    class Config:
        populate_by_name = True

class InvoiceBase(BaseModel):
    invoice_no: str = Field(alias="invoiceNo")
    invoice_date: str = Field(alias="invoiceDate")
    customer_id: str = Field(alias="customerId")
    voucher_type: str = Field(alias="voucherType")
    with_gst: bool = Field(default=True, alias="withGst")
    shipment_details: ShipmentDetails = Field(alias="shipmentDetails")
    expenses: List[InvoiceExpense]
    subtotal: float
    cgst: float
    sgst: float
    igst: float
    total: float
    status: str = "Pending"

    class Config:
        populate_by_name = True

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(BaseModel):
    invoice_no: Optional[str] = Field(default=None, alias="invoiceNo")
    invoice_date: Optional[str] = Field(default=None, alias="invoiceDate")
    voucher_type: Optional[str] = Field(default=None, alias="voucherType")
    shipment_details: Optional[ShipmentDetails] = Field(default=None, alias="shipmentDetails")
    expenses: Optional[List[InvoiceExpense]] = None
    subtotal: Optional[float] = None
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    igst: Optional[float] = None
    total: Optional[float] = None
    status: Optional[str] = None

    class Config:
        populate_by_name = True

class Invoice(InvoiceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), alias="createdAt")

    class Config:
        populate_by_name = True
