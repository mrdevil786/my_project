"""
Seed script to populate database with initial data
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Mock customers
mock_customers = [
    {
        "id": "1",
        "name": "MALISHKA ENTERPRISES",
        "address": "6TH FLOOR, 6045 TRADE HOUSE, RING ROAD, SURAT",
        "state": "Gujarat",
        "gstNo": "24ABBFM3781G1ZD",
        "panNo": "ABBFM3781G",
        "iecNo": "IEC0123456789",
        "phone": "+91 9876543210",
        "email": "malishka@example.com"
    },
    {
        "id": "2",
        "name": "ORIENTAL TRADELINKS",
        "address": "PLOT NO. 15, 1ST FLOOR, OFFICE NO. 101, FORTUNE SQUARE, RING ROAD, SURAT",
        "state": "Gujarat",
        "gstNo": "24XXXXX1234X1ZX",
        "panNo": "XXXXX1234X",
        "iecNo": "",
        "phone": "",
        "email": ""
    }
]

# Mock expense heads
mock_expense_heads = [
    {"id": "1", "name": "AGENCY CHARGES", "hsnSac": "996511", "gstRate": 18, "isAlwaysIGST": False},
    {"id": "2", "name": "WEIGHMENT CHARGES", "hsnSac": "996519", "gstRate": 18, "isAlwaysIGST": False},
    {"id": "3", "name": "LOLO CHARGES", "hsnSac": "996521", "gstRate": 18, "isAlwaysIGST": False},
    {"id": "4", "name": "LINE CHARGES (NON-TAXABLE)", "hsnSac": "996759", "gstRate": 0, "isAlwaysIGST": False},
    {"id": "5", "name": "DOCUMENTATION CHARGES", "hsnSac": "996511", "gstRate": 18, "isAlwaysIGST": False},
    {"id": "6", "name": "TRANSPORTATION CHARGES", "hsnSac": "996411", "gstRate": 18, "isAlwaysIGST": False},
    {"id": "7", "name": "IMPORT OCEAN FREIGHT", "hsnSac": "996511", "gstRate": 5, "isAlwaysIGST": True}
]

# Mock invoices
mock_invoices = [
    {
        "id": "INV001",
        "invoiceNo": "192",
        "invoiceDate": "2024-01-15",
        "customerId": "1",
        "voucherType": "Tax Invoice",
        "withGst": True,
        "shipmentDetails": {
            "refNo": "REF001",
            "beNo": "BE123456",
            "beDate": "2024-01-10",
            "pol": "QINGDAO",
            "pod": "MUNDRA",
            "noOfContainers": "2",
            "containerType": "40 FT",
            "noOfPackages": "1120",
            "mbl": "MBL123456",
            "hbl": "HBL789012"
        },
        "expenses": [
            {
                "id": "1",
                "expenseHeadId": "1",
                "expenseName": "AGENCY CHARGES",
                "hsnSac": "996511",
                "gstRate": 18,
                "isAlwaysIGST": False,
                "qty": 1,
                "rate": 10000,
                "exchangeRate": 1,
                "amount": 10000
            },
            {
                "id": "2",
                "expenseHeadId": "2",
                "expenseName": "WEIGHMENT CHARGES",
                "hsnSac": "996519",
                "gstRate": 18,
                "isAlwaysIGST": False,
                "qty": 1,
                "rate": 400,
                "exchangeRate": 1,
                "amount": 400
            },
            {
                "id": "3",
                "expenseHeadId": "3",
                "expenseName": "LOLO CHARGES",
                "hsnSac": "996521",
                "gstRate": 18,
                "isAlwaysIGST": False,
                "qty": 1,
                "rate": 2966.10,
                "exchangeRate": 1,
                "amount": 2966.10
            }
        ],
        "subtotal": 13366.10,
        "cgst": 1202.95,
        "sgst": 1202.95,
        "igst": 0,
        "total": 15772,
        "status": "Paid",
        "createdAt": "2024-01-15T00:00:00Z"
    },
    {
        "id": "INV002",
        "invoiceNo": "R-02",
        "invoiceDate": "2024-01-20",
        "customerId": "2",
        "voucherType": "Reimbursement Note",
        "withGst": False,
        "shipmentDetails": {
            "refNo": "REF002",
            "beNo": "BE789012",
            "beDate": "2024-01-18",
            "pol": "MUNDRA",
            "pod": "JEBEL ALI",
            "noOfContainers": "1",
            "containerType": "20 FT",
            "noOfPackages": "500",
            "mbl": "MBL789012",
            "hbl": "HBL345678"
        },
        "expenses": [
            {
                "id": "1",
                "expenseHeadId": "4",
                "expenseName": "LINE CHARGES (NON-TAXABLE)",
                "hsnSac": "996759",
                "gstRate": 0,
                "isAlwaysIGST": False,
                "qty": 1,
                "rate": 10325,
                "exchangeRate": 1,
                "amount": 10325
            }
        ],
        "subtotal": 10325,
        "cgst": 0,
        "sgst": 0,
        "igst": 0,
        "total": 10325,
        "status": "Pending",
        "createdAt": "2024-01-20T00:00:00Z"
    }
]

async def seed_database():
    """Seed the database with initial data"""
    print("Starting database seeding...")
    
    # Clear existing data
    await db.customers.delete_many({})
    await db.expense_heads.delete_many({})
    await db.invoices.delete_many({})
    await db.payments.delete_many({})
    await db.quotations.delete_many({})
    print("Cleared existing collections")
    
    # Insert customers
    await db.customers.insert_many(mock_customers)
    print(f"Inserted {len(mock_customers)} customers")
    
    # Insert expense heads
    await db.expense_heads.insert_many(mock_expense_heads)
    print(f"Inserted {len(mock_expense_heads)} expense heads")
    
    # Insert invoices
    await db.invoices.insert_many(mock_invoices)
    print(f"Inserted {len(mock_invoices)} invoices")
    
    print("✅ Database seeding completed successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
