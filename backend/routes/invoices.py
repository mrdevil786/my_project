from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.invoice import Invoice, InvoiceCreate, InvoiceUpdate
from services.pdf_generator import InvoicePDFGenerator
from io import BytesIO
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["invoices"])

db: AsyncIOMotorDatabase = None

def set_database(database: AsyncIOMotorDatabase):
    global db
    db = database

@router.post("", response_model=Invoice, status_code=status.HTTP_201_CREATED)
async def create_invoice(invoice: InvoiceCreate):
    """Create a new invoice and increment series"""
    try:
        # Create invoice object
        invoice_obj = Invoice(**invoice.model_dump(by_alias=True))
        doc = invoice_obj.model_dump(by_alias=True)
        
        # Save to database
        await db.invoices.insert_one(doc)
        
        # Only increment series AFTER successful save
        try:
            voucher_type = invoice.voucher_type or "Tax Invoice"
            series = await db.series.find_one({"voucherType": voucher_type}, {"_id": 0})
            if series:
                # Increment the counter
                await db.series.update_one(
                    {"voucherType": voucher_type},
                    {"$inc": {"currentNumber": 1}}
                )
                logger.info(f"Incremented series for {voucher_type} to {series['currentNumber'] + 1}")
        except Exception as series_error:
            logger.error(f"Error incrementing series: {str(series_error)}")
            # Don't fail the invoice creation if series increment fails
        
        return invoice_obj
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[Invoice])
async def get_invoices(customer_id: Optional[str] = None, status: Optional[str] = None):
    """Get all invoices with optional filters"""
    try:
        query = {}
        if customer_id:
            query["customerId"] = customer_id
        if status:
            query["status"] = status
        
        invoices = await db.invoices.find(query, {"_id": 0}).to_list(1000)
        return invoices
    except Exception as e:
        logger.error(f"Error fetching invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    """Get a single invoice by ID"""
    try:
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return invoice
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: str, invoice_update: InvoiceUpdate):
    """Update an invoice"""
    try:
        existing = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        update_data = invoice_update.model_dump(by_alias=True, exclude_unset=True)
        if update_data:
            await db.invoices.update_one(
                {"id": invoice_id},
                {"$set": update_data}
            )
        
        updated = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Generate PDF for invoice
@router.get("/{invoice_id}/pdf")
async def generate_invoice_pdf(invoice_id: str):
    """Generate and download PDF for an invoice"""
    try:
        # Get invoice
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get customer
        customer = await db.customers.find_one({"id": invoice["customerId"]}, {"_id": 0})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Company details (from mockData or env)
        company_details = {
            "name": "BROKER XPRESS AND LOGISTICS",
            "address": "OFFICE NO 105, 1ST FLOOR, PLOT NO.19, GOPAL NAGAR, BAROI ROAD, MUNDRA, KACHCHH, GUJARAT - (370421)",
            "gstin": "24EQMPK2465R1Z2",
            "email": "brokerxpressandlogistics@gmail.com",
            "phone": ""
        }
        
        # Bank details
        bank_details = {
            "bankName": "STATE BANK OF INDIA",
            "accountName": "BROKER XPRESS AND LOGISTICS",
            "accountNumber": "42339205026",
            "ifscCode": "SBIN0060356"
        }
        
        # Generate PDF
        pdf_bytes = InvoicePDFGenerator.generate_invoice_pdf(
            invoice_data=invoice,
            customer_data=customer,
            company_details=company_details,
            bank_details=bank_details
        )
        
        # Return as downloadable file
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Invoice_{invoice['invoiceNo']}.pdf"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(invoice_id: str):
    """Delete an invoice"""
    try:
        result = await db.invoices.delete_one({"id": invoice_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
