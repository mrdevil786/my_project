from fastapi import APIRouter, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.expense import ExpenseHead, ExpenseHeadCreate, ExpenseHeadUpdate
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/expenses", tags=["expenses"])

db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

@router.post("", response_model=ExpenseHead, status_code=status.HTTP_201_CREATED)
async def create_expense_head(expense: ExpenseHeadCreate):
    """Create a new expense head"""
    try:
        expense_obj = ExpenseHead(**expense.model_dump(by_alias=True))
        doc = expense_obj.model_dump(by_alias=True)
        await db.expense_heads.insert_one(doc)
        return expense_obj
    except Exception as e:
        logger.error(f"Error creating expense head: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[ExpenseHead])
async def get_expense_heads():
    """Get all expense heads"""
    try:
        expenses = await db.expense_heads.find({}, {"_id": 0}).to_list(1000)
        return expenses
    except Exception as e:
        logger.error(f"Error fetching expense heads: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{expense_id}", response_model=ExpenseHead)
async def get_expense_head(expense_id: str):
    """Get a single expense head by ID"""
    try:
        expense = await db.expense_heads.find_one({"id": expense_id}, {"_id": 0})
        if not expense:
            raise HTTPException(status_code=404, detail="Expense head not found")
        return expense
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching expense head: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{expense_id}", response_model=ExpenseHead)
async def update_expense_head(expense_id: str, expense_update: ExpenseHeadUpdate):
    """Update an expense head"""
    try:
        existing = await db.expense_heads.find_one({"id": expense_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Expense head not found")
        
        update_data = expense_update.model_dump(by_alias=True, exclude_unset=True)
        if update_data:
            await db.expense_heads.update_one(
                {"id": expense_id},
                {"$set": update_data}
            )
        
        updated = await db.expense_heads.find_one({"id": expense_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating expense head: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense_head(expense_id: str):
    """Delete an expense head"""
    try:
        result = await db.expense_heads.delete_one({"id": expense_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Expense head not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting expense head: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
