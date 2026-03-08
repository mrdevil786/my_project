from fastapi import APIRouter, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.customer import Customer, CustomerCreate, CustomerUpdate
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/customers", tags=["customers"])

# This will be injected from main server.py
db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

@router.post("", response_model=Customer, status_code=status.HTTP_201_CREATED)
async def create_customer(customer: CustomerCreate):
    """Create a new customer with duplicate validation"""
    try:
        # Check for duplicate GSTIN
        if customer.gst_no:
            existing_gstin = await db.customers.find_one(
                {"gstNo": customer.gst_no},
                {"_id": 0}
            )
            if existing_gstin:
                raise HTTPException(
                    status_code=400,
                    detail=f"Customer with GSTIN {customer.gst_no} already exists"
                )
        
        # Check for duplicate name
        existing_name = await db.customers.find_one(
            {"name": {"$regex": f"^{customer.name}$", "$options": "i"}},
            {"_id": 0}
        )
        if existing_name:
            raise HTTPException(
                status_code=400,
                detail=f"Customer with name '{customer.name}' already exists"
            )
        
        # Create customer
        customer_obj = Customer(**customer.model_dump(by_alias=True))
        doc = customer_obj.model_dump(by_alias=True)
        await db.customers.insert_one(doc)
        return customer_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating customer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[Customer])
async def get_customers():
    """Get all customers"""
    try:
        customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
        return customers
    except Exception as e:
        logger.error(f"Error fetching customers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    """Get a single customer by ID"""
    try:
        customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching customer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_update: CustomerUpdate):
    """Update a customer"""
    try:
        # Get existing customer
        existing = await db.customers.find_one({"id": customer_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Update only provided fields
        update_data = customer_update.model_dump(by_alias=True, exclude_unset=True)
        if update_data:
            await db.customers.update_one(
                {"id": customer_id},
                {"$set": update_data}
            )
        
        # Fetch and return updated customer
        updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(customer_id: str):
    """Delete a customer"""
    try:
        result = await db.customers.delete_one({"id": customer_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting customer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
