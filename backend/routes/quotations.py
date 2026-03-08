from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.quotation import Quotation, QuotationCreate, QuotationUpdate
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/quotations", tags=["quotations"])

db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

@router.post("", response_model=Quotation, status_code=status.HTTP_201_CREATED)
async def create_quotation(quotation: QuotationCreate):
    """Create a new quotation"""
    try:
        quotation_obj = Quotation(**quotation.model_dump(by_alias=True))
        doc = quotation_obj.model_dump(by_alias=True)
        await db.quotations.insert_one(doc)
        return quotation_obj
    except Exception as e:
        logger.error(f"Error creating quotation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[Quotation])
async def get_quotations(customer_id: Optional[str] = None, status: Optional[str] = None):
    """Get all quotations with optional filters"""
    try:
        query = {}
        if customer_id:
            query["customerId"] = customer_id
        if status:
            query["status"] = status
        
        quotations = await db.quotations.find(query, {"_id": 0}).to_list(1000)
        return quotations
    except Exception as e:
        logger.error(f"Error fetching quotations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{quotation_id}", response_model=Quotation)
async def get_quotation(quotation_id: str):
    """Get a single quotation by ID"""
    try:
        quotation = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")
        return quotation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quotation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{quotation_id}", response_model=Quotation)
async def update_quotation(quotation_id: str, quotation_update: QuotationUpdate):
    """Update a quotation"""
    try:
        existing = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Quotation not found")
        
        update_data = quotation_update.model_dump(by_alias=True, exclude_unset=True)
        if update_data:
            await db.quotations.update_one(
                {"id": quotation_id},
                {"$set": update_data}
            )
        
        updated = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating quotation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation(quotation_id: str):
    """Delete a quotation"""
    try:
        result = await db.quotations.delete_one({"id": quotation_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Quotation not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting quotation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
