from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Import route modules
from routes import customers, expenses, invoices, payments, quotations, series

# Import PDF extractor service
from services.pdf_extractor import PDFExtractor
from services.invoice_importer import InvoiceImporter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Inject database into route modules
customers.set_database(db)
expenses.set_database(db)
invoices.set_database(db)
payments.set_database(db)
quotations.set_database(db)
series.set_database(db)

# Create the main app
app = FastAPI(title="Invoice Manager API", version="1.0.0")

# Create API router
api_router = APIRouter(prefix="/api")

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Invoice Manager API v1.0.0", "status": "running"}

# Health check endpoint
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

# PDF Extraction endpoint
@api_router.post("/extract-shipment-details")
async def extract_shipment_details(file: UploadFile = File(...)):
    """
    Extract shipment details from Bill of Entry or Shipping Bill PDF
    """
    try:
        # Read PDF content
        content = await file.read()
        
        # Use PDFExtractor service
        extracted_data = PDFExtractor.extract_shipment_details(content)
        
        logger.info(f"Extracted data from PDF: {extracted_data}")
        
        return {
            "success": True,
            "message": "Data extracted successfully",
            **extracted_data
        }
        
    except Exception as e:
        logger.error(f"Error extracting PDF data: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to extract data: {str(e)}"
        }

# Include all routers
api_router.include_router(customers.router)
api_router.include_router(expenses.router)
api_router.include_router(invoices.router)
api_router.include_router(payments.router)
api_router.include_router(quotations.router)
api_router.include_router(series.router)

# Import Invoice from PDF endpoint
@api_router.post("/import-invoices")
async def import_invoices_from_pdf(file: UploadFile = File(...)):
    """
    Import invoice data from uploaded invoice PDF
    Extracts customer, expenses, amounts, and creates invoice record in database
    """
    try:
        # Validate file type
        if not file.content_type == "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Read PDF content
        pdf_bytes = await file.read()
        
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Import invoice data using InvoiceImporter service
        logger.info(f"Importing invoice from PDF: {file.filename}")
        result = await InvoiceImporter.import_invoice(pdf_bytes, db)
        
        # Log extracted details
        logger.info(f"Imported invoice: {result.get('invoiceNo', 'Unknown')}")
        
        return {
            "success": True,
            "message": f"Invoice {result.get('invoiceNo', '')} imported successfully",
            "invoiceNo": result.get('invoiceNo', ''),
            "filename": file.filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing invoice: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to import: {str(e)}",
            "filename": file.filename
        }

# Include the API router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
