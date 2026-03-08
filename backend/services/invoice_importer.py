"""
Invoice PDF Import Service
Extracts invoice data from BROKER XPRESS AND LOGISTICS invoice format
"""
import fitz  # PyMuPDF
import re
from typing import Dict, Any, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class InvoiceImporter:
    """Import and parse invoice PDFs to create invoice records"""
    
    @staticmethod
    def extract_text_from_pdf(pdf_bytes: bytes) -> str:
        """Extract all text content from PDF"""
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise
    
    @staticmethod
    def parse_invoice_data(text: str) -> Dict[str, Any]:
        """Parse invoice text and extract structured data"""
        invoice_data = {
            "invoiceNo": "",
            "invoiceDate": "",
            "voucherType": "Tax Invoice",
            "withGst": True,
            "customer": {
                "name": "",
                "address": "",
                "gstin": ""
            },
            "shipmentDetails": {
                "refNo": "",
                "beNo": "",
                "beDate": "",
                "pol": "",
                "pod": "",
                "noOfContainers": "",
                "containerType": "",
                "noOfPackages": "",
                "mbl": "",
                "hbl": ""
            },
            "expenses": [],
            "subtotal": 0,
            "cgst": 0,
            "sgst": 0,
            "igst": 0,
            "total": 0
        }
        
        try:
            lines = text.split('\n')
            
            # Extract Invoice Number - Pattern: INVOICE NO.\n<date>\n<number>
            # OR: INV.NO.\n<date>\n<number>
            for i, line in enumerate(lines):
                if ('INVOICE NO' in line.upper() or 'INV.NO' in line.upper() or 'INV NO' in line.upper()) and i + 2 < len(lines):
                    # Next line is date, line after that is invoice number
                    potential_date = lines[i + 1].strip()
                    potential_number = lines[i + 2].strip()
                    
                    # Verify it looks like a number (could be 2-4 digits)
                    if re.match(r'^\d{2,4}$', potential_number):
                        invoice_data["invoiceNo"] = potential_number
                        
                        # Parse the date (DD-MM-YYYY format)
                        if re.match(r'\d{2}-\d{2}-\d{4}', potential_date):
                            parts = potential_date.split('-')
                            invoice_data["invoiceDate"] = f"{parts[2]}-{parts[1]}-{parts[0]}"
                    break
            
            # If not found above, try alternate pattern: DATE\nINV.NO\n<date>\n<number>
            if not invoice_data["invoiceNo"]:
                for i, line in enumerate(lines):
                    if line.strip() == 'DATE' and i + 3 < len(lines):
                        if 'INV' in lines[i + 1].upper():
                            potential_date = lines[i + 2].strip()
                            potential_number = lines[i + 3].strip()
                            
                            if re.match(r'^\d{2,4}$', potential_number):
                                invoice_data["invoiceNo"] = potential_number
                                
                                if re.match(r'\d{2}-\d{2}-\d{4}', potential_date):
                                    parts = potential_date.split('-')
                                    invoice_data["invoiceDate"] = f"{parts[2]}-{parts[1]}-{parts[0]}"
                            break
            
            # Extract Customer Name and Details
            # Method 1: From "BILL TO" section (usually at top)
            customer_name_match = re.search(r'BILL\s+TO[:\s]*(.*?)(?:\n.*?)*?GSTIN', text, re.IGNORECASE | re.DOTALL)
            if customer_name_match:
                customer_section = customer_name_match.group(1).strip()
                customer_lines = [l.strip() for l in customer_section.split('\n') if l.strip()]
                if customer_lines:
                    invoice_data["customer"]["name"] = customer_lines[0]
                    if len(customer_lines) > 1:
                        invoice_data["customer"]["address"] = ' '.join(customer_lines[1:])
            
            # Method 2: Customer name might be on its own line after invoice number
            if not invoice_data["customer"]["name"]:
                for i, line in enumerate(lines):
                    if re.match(r'^\d{2,4}$', line.strip()) and i + 1 < len(lines):
                        # This might be invoice number, next line could be customer
                        next_line = lines[i + 1].strip()
                        # Check if it looks like a company name (has capital letters)
                        if next_line and len(next_line) > 5 and any(c.isupper() for c in next_line):
                            if 'POL' not in next_line and 'POD' not in next_line:
                                invoice_data["customer"]["name"] = next_line
                                break
            
            # Extract Customer GSTIN (looking for pattern in the document)
            gstin_match = re.search(r'GSTIN[:\s]*([0-9A-Z]{15})', text, re.IGNORECASE)
            if gstin_match:
                invoice_data["customer"]["gstin"] = gstin_match.group(1)
            
            # Extract Customer Address (usually appears before or with GSTIN)
            address_match = re.search(r'INVOICE.*?\n(.*?)\n(.*?)\n.*?GSTIN', text, re.IGNORECASE | re.DOTALL)
            if address_match and not invoice_data["customer"]["address"]:
                # Try to extract address lines
                address_text = address_match.group(0)
                address_lines = []
                for line in address_text.split('\n'):
                    if ('floor' in line.lower() or 'road' in line.lower() or 
                        'kolkata' in line.lower() or re.search(r'\d{6}', line)):
                        address_lines.append(line.strip())
                if address_lines:
                    invoice_data["customer"]["address"] = ', '.join(address_lines)
            
            # Extract Expenses from table
            # Find all HSN codes (6-digit numbers on their own line)
            expenses_data = []
            for i, line in enumerate(lines):
                if re.match(r'^\d{6}$', line.strip()):
                    hsn_code = line.strip()
                    
                    # Next lines should be: qty, rate, rate_dup, ₹, gst%, tax, ₹, net_amount
                    try:
                        qty = 1
                        rate = 0
                        gst_rate = 18
                        amount = 0
                        
                        # Parse next 10 lines for amounts
                        for j in range(i + 1, min(len(lines), i + 12)):
                            line_text = lines[j].strip()
                            
                            # Check for quantity (single digit usually)
                            if j == i + 1 and re.match(r'^\d{1,3}$', line_text):
                                qty = int(line_text)
                            
                            # Check for rate (amount with comma and decimals)
                            if re.match(r'^[0-9,]+\.\d{2}$', line_text):
                                value = float(line_text.replace(',', ''))
                                if rate == 0 and value > 100:  # First significant amount is rate
                                    rate = value
                                    amount = value * qty  # Taxable amount
                            
                            # Check for GST percentage
                            if '%' in line_text:
                                gst_match = re.search(r'(\d+)%', line_text)
                                if gst_match:
                                    gst_rate = int(gst_match.group(1))
                        
                        if amount > 0:
                            expenses_data.append({
                                "hsn": hsn_code,
                                "qty": qty,
                                "rate": rate,
                                "amount": amount,
                                "gst_rate": gst_rate
                            })
                    except Exception as e:
                        logger.warning(f"Error parsing expense row: {e}")
                        continue
            
            # Extract charge descriptions (at bottom of invoice usually)
            charge_descriptions = []
            charge_patterns = [
                'AGENCY CHARGES',
                'AGENCY',
                'WEIGHMENT CHARGES',
                'WEIGHMENT',
                'LOLO CHARGES',
                'CFS CHARGES',
                'DETENTION CHARGES',
                'TRANSPORT CHARGES',
                'DO CHARGES',
                'EXAMINATION CHARGES',
                'DOCUMENTATION',
                'SEAWAY BL',
                'SEAWAYBILL',
                'SHIPPING LINE'
            ]
            
            # Look for charges in the document
            found_charges = []
            for i, line in enumerate(lines):
                line_upper = line.upper().strip()
                # Check if line contains charge keywords
                if 'CHARGES' in line_upper or any(p in line_upper for p in ['AGENCY', 'WEIGHMENT', 'CFS', 'DOCUMENTATION', 'SHIPPING LINE']):
                    # Skip header lines
                    if line_upper not in ['CHARGES', 'DESCRIPTION']:
                        # This is a charge description
                        charge_text = line.strip()
                        if charge_text and len(charge_text) > 3:
                            found_charges.append(charge_text)
            
            # Use found charges or fall back to standard patterns
            if found_charges:
                charge_descriptions = found_charges
            else:
                # Check which patterns exist in text
                for pattern in charge_patterns:
                    if pattern in text.upper():
                        charge_descriptions.append(pattern + (' CHARGES' if 'CHARGES' not in pattern else ''))
            
            # Match expenses with descriptions (in order)
            for i, exp_data in enumerate(expenses_data):
                description = charge_descriptions[i] if i < len(charge_descriptions) else f"Charge {i+1}"
                
                expense = {
                    "expenseHeadId": "",
                    "expenseName": description,
                    "hsnSac": exp_data["hsn"],
                    "qty": exp_data["qty"],
                    "rate": exp_data["rate"],
                    "currency": "INR",
                    "exchangeRate": 1,
                    "amount": exp_data["amount"],
                    "gstRate": exp_data["gst_rate"]
                }
                invoice_data["expenses"].append(expense)
            
            # Extract Shipment Details
            # BE/SB Number - Multiple patterns
            be_number = ""
            # Pattern 1: "BE / SB / REF NO." followed by number
            be_match = re.search(r'(?:BE|SB)\s*/?\s*(?:SB|BE)?\s*/?\s*REF\s+NO\.\s*\n\s*(\d+)', text, re.IGNORECASE)
            if be_match:
                be_number = be_match.group(1)
            
            # Pattern 2: "SHIPPING BILL NO." or "BE NO." followed by number
            if not be_number:
                be_match = re.search(r'(?:SHIPPING\s+BILL|BE|SB)\s+NO\.\s*\n\s*(\d+)', text, re.IGNORECASE)
                if be_match:
                    be_number = be_match.group(1)
            
            # Pattern 3: Look for 7-digit number near "SHIPPING BILL" or "BE"
            if not be_number:
                for i, line in enumerate(lines):
                    if 'SHIPPING BILL' in line.upper() or 'BE NO' in line.upper():
                        for j in range(i + 1, min(len(lines), i + 5)):
                            if re.match(r'^\d{7}$', lines[j].strip()):
                                be_number = lines[j].strip()
                                break
                        if be_number:
                            break
            
            if be_number:
                invoice_data["shipmentDetails"]["beNo"] = be_number
            
            # BL/MBL Number - Multiple methods
            mbl_number = ""
            # Method 1: Look for "BL NO." header and get value from column layout
            for i, line in enumerate(lines):
                if line.strip() == 'BL NO.' and i + 2 < len(lines):
                    # In column layout, the value is 2 lines down
                    potential_bl = lines[i + 2].strip()
                    if potential_bl and len(potential_bl) > 5 and re.match(r'^[A-Z0-9]+$', potential_bl):
                        mbl_number = potential_bl
                        break
            
            # Method 2: Regex pattern
            if not mbl_number:
                bl_match = re.search(r'BL\s+NO\.\s*\n\s*([A-Z0-9]+)', text, re.IGNORECASE)
                if bl_match:
                    mbl_number = bl_match.group(1)
            
            if mbl_number:
                invoice_data["shipmentDetails"]["mbl"] = mbl_number
            
            # POL and POD - they appear in columns
            # Pattern: POL\nPOD\n<pol_value>\n<pod_value>
            for i, line in enumerate(lines):
                if line.strip() == 'POL' and i + 1 < len(lines) and lines[i + 1].strip() == 'POD':
                    # Next two lines should be the values
                    if i + 3 < len(lines):
                        pol_value = lines[i + 2].strip()
                        pod_value = lines[i + 3].strip()
                        if pol_value and not pol_value.startswith('No'):
                            invoice_data["shipmentDetails"]["pol"] = pol_value
                        if pod_value and not pod_value.startswith('No'):
                            invoice_data["shipmentDetails"]["pod"] = pod_value
                    break
            
            # Containers - Pattern: "1 X 40"
            container_match = re.search(r'(\d+)\s*[xX×]\s*(\d+)', text)
            if container_match:
                invoice_data["shipmentDetails"]["noOfContainers"] = container_match.group(1)
                container_size = container_match.group(2)
                invoice_data["shipmentDetails"]["containerType"] = f"{container_size} FT"
            
            # Packages - look for number after "No. of Packages"
            for i, line in enumerate(lines):
                if 'NO. OF PACKAGES' in line.upper() or 'PACKAGES' in line.upper():
                    # Check next few lines for a number
                    for j in range(i+1, min(len(lines), i+5)):
                        if re.match(r'^\d+$', lines[j].strip()):
                            invoice_data["shipmentDetails"]["noOfPackages"] = lines[j].strip()
                            break
                    break
            
            # Extract Financial Totals
            # Subtotal - sum of all expense amounts
            if invoice_data["expenses"]:
                invoice_data["subtotal"] = sum(exp["amount"] for exp in invoice_data["expenses"])
            
            # CGST
            cgst_match = re.search(r'CGST[:\s]*₹?\s*([0-9,]+\.?\d*)', text, re.IGNORECASE)
            if cgst_match:
                cgst_value = float(cgst_match.group(1).replace(',', ''))
                # Check if SGST is also present
                sgst_match = re.search(r'SGST[:\s]*₹?\s*([0-9,]+\.?\d*)', text, re.IGNORECASE)
                if sgst_match and sgst_match.group(1).strip():
                    # Both CGST and SGST present
                    invoice_data["cgst"] = cgst_value
                    invoice_data["sgst"] = float(sgst_match.group(1).replace(',', ''))
                else:
                    # Only CGST label found, split the value equally
                    invoice_data["cgst"] = cgst_value / 2
                    invoice_data["sgst"] = cgst_value / 2
            
            # IGST
            igst_match = re.search(r'IGST[:\s]*₹?\s*([0-9,]+\.?\d*)', text, re.IGNORECASE)
            if igst_match and igst_match.group(1).strip() not in ['', '3.']:  # Skip invalid values
                invoice_data["igst"] = float(igst_match.group(1).replace(',', ''))
            
            # Total Amount
            total_patterns = [
                r'TOTAL[:\s]*₹\s*([0-9,]+\.\d{2})',
                r'₹\s*([0-9,]+\.\d{2})\s*Terms'
            ]
            for pattern in total_patterns:
                total_match = re.search(pattern, text, re.IGNORECASE)
                if total_match:
                    invoice_data["total"] = float(total_match.group(1).replace(',', ''))
                    break
            
            # If total not found, calculate it
            if invoice_data["total"] == 0:
                invoice_data["total"] = invoice_data["subtotal"] + invoice_data["cgst"] + invoice_data["sgst"] + invoice_data["igst"]
            
            logger.info(f"Parsed invoice data: {invoice_data['invoiceNo']}")
            return invoice_data
            
        except Exception as e:
            logger.error(f"Error parsing invoice data: {str(e)}")
            raise
    
    @classmethod
    async def import_invoice(cls, pdf_bytes: bytes, db) -> Dict[str, Any]:
        """
        Main import method - extracts text, parses invoice data, and creates in database
        """
        try:
            from uuid import uuid4
            
            # Extract text from PDF
            text = cls.extract_text_from_pdf(pdf_bytes)
            
            # Parse invoice data
            invoice_data = cls.parse_invoice_data(text)
            
            # Find or create customer
            customer_gstin = invoice_data["customer"]["gstin"]
            customer = await db.customers.find_one({"gstNo": customer_gstin}, {"_id": 0})
            
            if not customer:
                # Create new customer
                customer_id = str(uuid4())
                customer_doc = {
                    "id": customer_id,
                    "name": invoice_data["customer"]["name"],
                    "address": invoice_data["customer"]["address"],
                    "state": "",  # Required field
                    "gstNo": customer_gstin,
                    "panNo": "",  # Required field
                    "iecNo": "",
                    "email": "",
                    "phone": ""
                }
                await db.customers.insert_one(customer_doc)
                logger.info(f"Created new customer: {customer_doc['name']}")
            else:
                customer_id = customer["id"]
                logger.info(f"Found existing customer: {customer['name']}")
            
            # Create invoice document
            invoice_id = str(uuid4())
            invoice_doc = {
                "id": invoice_id,
                "invoiceNo": invoice_data["invoiceNo"],
                "invoiceDate": invoice_data["invoiceDate"],
                "voucherType": invoice_data["voucherType"],
                "customerId": customer_id,
                "withGst": invoice_data["withGst"],
                "shipmentDetails": invoice_data["shipmentDetails"],
                "expenses": invoice_data["expenses"],
                "subtotal": invoice_data["subtotal"],
                "cgst": invoice_data["cgst"],
                "sgst": invoice_data["sgst"],
                "igst": invoice_data["igst"],
                "total": invoice_data["total"],
                "status": "Pending"
            }
            
            await db.invoices.insert_one(invoice_doc)
            logger.info(f"Created invoice: {invoice_doc['invoiceNo']}")
            
            return {
                "id": invoice_id,
                "invoiceNo": invoice_data["invoiceNo"]
            }
            
        except Exception as e:
            logger.error(f"Error importing invoice: {str(e)}")
            raise
