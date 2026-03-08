from pydantic import BaseModel, Field
from typing import Optional
import uuid

class ExpenseHeadBase(BaseModel):
    name: str
    hsn_sac: str = Field(alias="hsnSac")
    gst_rate: float = Field(alias="gstRate")
    is_always_igst: bool = Field(default=False, alias="isAlwaysIGST")

    class Config:
        populate_by_name = True

class ExpenseHeadCreate(ExpenseHeadBase):
    pass

class ExpenseHeadUpdate(BaseModel):
    name: Optional[str] = None
    hsn_sac: Optional[str] = Field(default=None, alias="hsnSac")
    gst_rate: Optional[float] = Field(default=None, alias="gstRate")
    is_always_igst: Optional[bool] = Field(default=None, alias="isAlwaysIGST")

    class Config:
        populate_by_name = True

class ExpenseHead(ExpenseHeadBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    class Config:
        populate_by_name = True
