from fastapi import APIRouter, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.series import Series, SeriesCreate, SeriesUpdate
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/series", tags=["series"])

db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

@router.post("", response_model=Series, status_code=status.HTTP_201_CREATED)
async def create_series(series: SeriesCreate):
    """Create a new series"""
    try:
        # Check if series already exists for this voucher type
        existing = await db.series.find_one({"voucherType": series.voucher_type})
        if existing:
            raise HTTPException(status_code=400, detail="Series already exists for this voucher type")
        
        series_obj = Series(**series.model_dump(by_alias=True))
        doc = series_obj.model_dump(by_alias=True)
        await db.series.insert_one(doc)
        return series_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating series: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[Series])
async def get_all_series():
    """Get all series"""
    try:
        series_list = await db.series.find({}, {"_id": 0}).to_list(1000)
        return series_list
    except Exception as e:
        logger.error(f"Error fetching series: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voucher/{voucher_type}", response_model=Series)
async def get_series_by_voucher_type(voucher_type: str):
    """Get series by voucher type"""
    try:
        series = await db.series.find_one({"voucherType": voucher_type}, {"_id": 0})
        if not series:
            # Create default series if not found
            default_prefix = {
                "Tax Invoice": "INV-",
                "Credit Note": "CN-",
                "Debit Note": "DN-",
                "Reimbursement Note": "R-",
                "Quotation": "Q-"
            }.get(voucher_type, "DOC-")
            
            new_series = Series(
                voucherType=voucher_type,
                prefix=default_prefix,
                currentNumber=1,
                suffix=""
            )
            await db.series.insert_one(new_series.model_dump(by_alias=True))
            return new_series
        return series
    except Exception as e:
        logger.error(f"Error fetching series: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preview/{voucher_type}")
async def preview_next_number(voucher_type: str):
    """Preview next number without incrementing"""
    try:
        series = await db.series.find_one({"voucherType": voucher_type}, {"_id": 0})
        
        if not series:
            # Create default series
            default_prefix = {
                "Tax Invoice": "INV-",
                "Credit Note": "CN-",
                "Debit Note": "DN-",
                "Reimbursement Note": "R-",
                "Quotation": "Q-"
            }.get(voucher_type, "DOC-")
            
            new_series = Series(
                voucherType=voucher_type,
                prefix=default_prefix,
                currentNumber=1,
                suffix=""
            )
            await db.series.insert_one(new_series.model_dump(by_alias=True))
            series = new_series.model_dump(by_alias=True)
        
        # Return preview without incrementing
        next_number = f"{series['prefix']}{series['currentNumber']}{series.get('suffix', '')}"
        
        return {
            "nextNumber": next_number,
            "currentNumber": series['currentNumber'],
            "prefix": series['prefix'],
            "suffix": series.get('suffix', '')
        }
    except Exception as e:
        logger.error(f"Error previewing next number: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/next/{voucher_type}")
async def get_next_number(voucher_type: str):
    """Get next number in series and increment (DEPRECATED - use preview instead)"""
    try:
        series = await db.series.find_one({"voucherType": voucher_type}, {"_id": 0})
        
        if not series:
            # Create default series
            default_prefix = {
                "Tax Invoice": "INV-",
                "Credit Note": "CN-",
                "Debit Note": "DN-",
                "Reimbursement Note": "R-",
                "Quotation": "Q-"
            }.get(voucher_type, "DOC-")
            
            new_series = {
                "voucherType": voucher_type,
                "prefix": default_prefix,
                "currentNumber": 1,
                "suffix": "",
                "id": str(__import__('uuid').uuid4())
            }
            await db.series.insert_one(new_series)
            next_num = f"{default_prefix}1"
            
            # Increment for next time
            await db.series.update_one(
                {"voucherType": voucher_type},
                {"$set": {"currentNumber": 2}}
            )
            
            return {"nextNumber": next_num, "prefix": default_prefix, "currentNumber": 1}
        
        # Generate next number
        current = series["currentNumber"]
        next_num = f"{series['prefix']}{current}{series.get('suffix', '')}"
        
        # Increment counter
        await db.series.update_one(
            {"voucherType": voucher_type},
            {"$set": {"currentNumber": current + 1}}
        )
        
        return {
            "nextNumber": next_num,
            "prefix": series["prefix"],
            "currentNumber": current
        }
    except Exception as e:
        logger.error(f"Error getting next number: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{series_id}", response_model=Series)
async def update_series(series_id: str, series_update: SeriesUpdate):
    """Update a series"""
    try:
        existing = await db.series.find_one({"id": series_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Series not found")
        
        update_data = series_update.model_dump(by_alias=True, exclude_unset=True)
        if update_data:
            await db.series.update_one(
                {"id": series_id},
                {"$set": update_data}
            )
        
        updated = await db.series.find_one({"id": series_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating series: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
