from pydantic import BaseModel, Field, EmailStr
from typing import Optional
import uuid

class CustomerBase(BaseModel):
    name: str
    address: str
    state: str
    gst_no: str = Field(alias="gstNo")
    pan_no: str = Field(alias="panNo")
    iec_no: Optional[str] = Field(default="", alias="iecNo")
    phone: Optional[str] = Field(default="")
    email: Optional[str] = Field(default="")

    class Config:
        populate_by_name = True

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    gst_no: Optional[str] = Field(default=None, alias="gstNo")
    pan_no: Optional[str] = Field(default=None, alias="panNo")
    iec_no: Optional[str] = Field(default=None, alias="iecNo")
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        populate_by_name = True

class Customer(CustomerBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    class Config:
        populate_by_name = True
