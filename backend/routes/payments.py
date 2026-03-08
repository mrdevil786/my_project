from fastapi import APIRouter, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.payment import Payment, PaymentCreate, PaymentUpdate
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])

db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

@router.post("", response_model=Payment, status_code=status.HTTP_201_CREATED)
async def create_payment(payment: PaymentCreate):
    """Record a payment against an invoice"""
    try:
        # Verify invoice exists
        invoice = await db.invoices.find_one({"id": payment.invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        payment_obj = Payment(**payment.model_dump(by_alias=True))
        doc = payment_obj.model_dump(by_alias=True)
        await db.payments.insert_one(doc)
        
        # Update invoice status to Paid if full amount is received
        total_paid = payment.amount_received
        existing_payments = await db.payments.find({"invoiceId": payment.invoice_id}, {"_id": 0}).to_list(1000)
        
        for p in existing_payments:
            if p["id"] != payment_obj.id:
                total_paid += p["amountReceived"]
        
        if total_paid >= invoice["total"]:
            await db.invoices.update_one(
                {"id": payment.invoice_id},
                {"$set": {"status": "Paid"}}
            )
        
        return payment_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[Payment])
async def get_payments(invoice_id: str = None):
    """Get all payments, optionally filtered by invoice"""
    try:
        query = {}
        if invoice_id:
            query["invoiceId"] = invoice_id
        
        payments = await db.payments.find(query, {"_id": 0}).to_list(1000)
        return payments
    except Exception as e:
        logger.error(f"Error fetching payments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{payment_id}", response_model=Payment)
async def get_payment(payment_id: str):
    """Get a single payment by ID"""
    try:
        payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        return payment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{payment_id}", response_model=Payment)
async def update_payment(payment_id: str, payment_update: PaymentUpdate):
    """Update a payment"""
    try:
        existing = await db.payments.find_one({"id": payment_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        update_data = payment_update.model_dump(by_alias=True, exclude_unset=True)
        if update_data:
            await db.payments.update_one(
                {"id": payment_id},
                {"$set": update_data}
            )
        
        updated = await db.payments.find_one({"id": payment_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(payment_id: str):
    """Delete a payment"""
    try:
        result = await db.payments.delete_one({"id": payment_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Payment not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
