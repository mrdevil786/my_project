"""
PDF Extraction Service for Bill of Entry (BE) and Shipping Bill (SB) documents
Extracts shipment details from customs documents using PyMuPDF
"""
import fitz  # PyMuPDF
import re
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class PDFExtractor:
    """Extract shipment details from BE/SB PDF documents"""
    
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
    def extract_be_details(text: str) -> Dict[str, Any]:
        """Extract details from Bill of Entry (BE) document"""
        details = {
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
        }
        
        try:
            # BE Number - try multiple patterns
            # Pattern 1: Look for BE No/BE Number followed by number
            be_match = re.search(r'BE\s*(?:NUMBER|NO)[:\s]*(\d{7})', text, re.IGNORECASE)
            if not be_match:
                # Pattern 2: First 7-digit number in the document (usually BE number)
                be_match = re.search(r'^(\d{7})', text, re.MULTILINE)
            if be_match:
                details["beNo"] = be_match.group(1)
            
            # BE Date (DD/MM/YYYY or DD-MMM-YY format)
            date_patterns = [
                r'BE\s*DATE[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})',
                r'DATE[:\s]*(\d{2}[/-]\d{2}[/-]\d{4})',
                r'(\d{2}/\d{2}/\d{4})',
                r'(\d{2}-\d{2}-\d{4})'
            ]
            for pattern in date_patterns:
                date_match = re.search(pattern, text, re.IGNORECASE)
                if date_match:
                    details["beDate"] = date_match.group(1)
                    break
            
            # Port of Loading - Multiple patterns
            pol_patterns = [
                r'PORT\s*OF\s*LOADING[:\s]*([A-Z][A-Z\s,]+?)(?:\n|PORT|COUNTRY|\d)',
                r'POL[:\s]*([A-Z][A-Z\s,]+?)(?:\n|POD|,)',
                r'LOADING\s*PORT[:\s]*([A-Z][A-Z\s,]+?)(?:\n)',
                r'(?:FROM|ORIGIN)[:\s]*([A-Z][A-Z\s,]+?)(?:\n|TO)'
            ]
            for pattern in pol_patterns:
                pol_match = re.search(pattern, text, re.IGNORECASE)
                if pol_match:
                    details["pol"] = pol_match.group(1).strip()[:50]  # Limit length
                    break
            
            # Port of Discharge - Multiple patterns
            # Look for "PORT : MUNDRA" pattern first (common in Indian customs)
            pod_match = re.search(r'PORT\s*:\s*([A-Z][A-Z\s,]+?)(?:BILL OF ENTRY|\n)', text, re.IGNORECASE)
            if not pod_match:
                pod_patterns = [
                    r'PORT\s*OF\s*DISCHARGE[:\s]*([A-Z][A-Z\s,]+?)(?:\n|PORT|COUNTRY|\d)',
                    r'POD[:\s]*([A-Z][A-Z\s,]+?)(?:\n|,)',
                    r'DISCHARGE\s*PORT[:\s]*([A-Z][A-Z\s,]+?)(?:\n)',
                    r'(?:TO|DESTINATION)[:\s]*([A-Z][A-Z\s,]+?)(?:\n)'
                ]
                for pattern in pod_patterns:
                    pod_match = re.search(pattern, text, re.IGNORECASE)
                    if pod_match:
                        break
            
            if pod_match:
                details["pod"] = pod_match.group(1).strip()[:50]
            
            # Number of Containers - Improved patterns
            container_patterns = [
                r'(?:NO\.?\s*OF\s*)?CONTAINERS?[:\s]*(\d+)',
                r'(\d+)\s*[xX×]\s*(?:20|40)\s*(?:FT|FEET)',
                r'CONT[:\s]*(\d+)',
                r'(\d+)\s*CONTAINER'
            ]
            for pattern in container_patterns:
                container_match = re.search(pattern, text, re.IGNORECASE)
                if container_match:
                    details["noOfContainers"] = container_match.group(1)
                    break
            
            # Container Numbers - Extract all container numbers found
            container_nums = re.findall(r'([A-Z]{4}\d{7})', text)
            if container_nums:
                # Take first container as refNo, join all if multiple
                details["refNo"] = container_nums[0]
                # Update container count based on found containers
                if not details["noOfContainers"] and len(container_nums) > 0:
                    details["noOfContainers"] = str(len(container_nums))
            
            # Container Type (FCL, 20FT, 40FT, etc.) - Improved detection
            if '40' in text and ('HC' in text.upper() or 'HIGH CUBE' in text.upper()):
                details["containerType"] = "40 HC"
            elif '40' in text and ('FT' in text.upper() or 'FEET' in text.upper() or 'FOOT' in text.upper()):
                details["containerType"] = "40 FT"
            elif '20' in text and ('FT' in text.upper() or 'FEET' in text.upper() or 'FOOT' in text.upper()):
                details["containerType"] = "20 FT"
            elif 'FCL' in text.upper() or 'FULL CONTAINER' in text.upper():
                details["containerType"] = "20 FT"  # Default
            
            # Number of Packages - Improved patterns
            packages_patterns = [
                r'(?:NO\.?\s*OF\s*)?PACKAGES?[:\s]*(\d+)',
                r'(?:NO\.?\s*OF\s*)?PKG[:\s]*(\d+)',
                r'PACKAGES?[:\s]*(\d+)',
                r'(\d+)\s*(?:PKGS?|PACKAGES?)'
            ]
            for pattern in packages_patterns:
                packages_match = re.search(pattern, text, re.IGNORECASE)
                if packages_match:
                    details["noOfPackages"] = packages_match.group(1)
                    break
            
            # MBL (Master Bill of Lading)
            mbl_match = re.search(r'MBL[:\s]*([A-Z0-9]+)', text, re.IGNORECASE)
            if mbl_match:
                details["mbl"] = mbl_match.group(1)
            
            # HBL (House Bill of Lading) or similar reference
            hbl_match = re.search(r'HBL[:\s]*([A-Z0-9\s]+?)(?:\n|$)', text, re.IGNORECASE)
            if not hbl_match:
                hbl_match = re.search(r'([A-Z]{4,}[A-Z0-9\s]{5,})', text)  # Generic pattern
            if hbl_match:
                details["hbl"] = hbl_match.group(1).strip()[:20]  # Limit length
            
            logger.info(f"Extracted BE details: {details}")
            
        except Exception as e:
            logger.error(f"Error parsing BE details: {str(e)}")
        
        return details
    
    @staticmethod
    def extract_sb_details(text: str) -> Dict[str, Any]:
        """Extract details from Shipping Bill (SB) document"""
        details = {
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
        }
        
        try:
            # SB Number (remove SB prefix, keep only numbers)
            sb_match = re.search(r'SB\s*(?:NUMBER|NO)[:\s]*(\d+)', text, re.IGNORECASE)
            if not sb_match:
                sb_match = re.search(r'(\d{7})', text)  # 7-digit SB number
            if sb_match:
                # Extract only the numeric part
                details["beNo"] = sb_match.group(1)
            
            # SB Date
            date_match = re.search(r'SB\s*DATE[:\s]*(\d{2}[/-][A-Z]{3}[/-]\d{2})', text, re.IGNORECASE)
            if not date_match:
                date_match = re.search(r'(\d{2}/\d{2}/\d{4})', text)
            if date_match:
                details["beDate"] = date_match.group(1)
            
            # Port of Loading (Usually MUNDRA for SB)
            pol_match = re.search(r'PORT\s*OF\s*LOADING[:\s]*([A-Z\s,]+?)(?:\n|PORT|COUNTRY)', text, re.IGNORECASE)
            if not pol_match:
                pol_match = re.search(r'MUNDRA[A-Z\s,]*', text, re.IGNORECASE)
            if pol_match:
                details["pol"] = pol_match.group(0).strip() if not pol_match.group(1) else pol_match.group(1).strip()
            
            # Port of Discharge
            pod_match = re.search(r'PORT\s*OF\s*DISCHARGE[:\s]*([A-Z\s,]+?)(?:\n|PORT|COUNTRY)', text, re.IGNORECASE)
            if not pod_match:
                pod_match = re.search(r'COUNTRY\s*OF\s*(?:FINAL\s*)?DESTINATION[:\s]*([A-Z\s]+)', text, re.IGNORECASE)
            if pod_match:
                details["pod"] = pod_match.group(1).strip()
            
            # Number of Containers
            container_match = re.search(r'(?:NO\.?\s*OF\s*)?CONT(?:AINERS?)?[:\s]*(\d+)', text, re.IGNORECASE)
            if container_match:
                details["noOfContainers"] = container_match.group(1)
            
            # Container Type
            if 'CONTAINERISED' in text.upper() or 'CONTAINERIZED' in text.upper():
                details["containerType"] = "20 FT"  # Default
            if '20' in text and ('FT' in text or 'FEET' in text):
                details["containerType"] = "20 FT"
            if '40' in text and ('FT' in text or 'FEET' in text):
                if 'HC' in text:
                    details["containerType"] = "40 HC"
                else:
                    details["containerType"] = "40 FT"
            
            # Number of Packages
            packages_match = re.search(r'(?:NO\.?\s*OF\s*)?PKG[:\s]*(\d+)', text, re.IGNORECASE)
            if not packages_match:
                packages_match = re.search(r'PACKAGES?[:\s]*(\d+)', text, re.IGNORECASE)
            if packages_match:
                details["noOfPackages"] = packages_match.group(1)
            
            # Invoice number as reference
            inv_match = re.search(r'INVOICE[:\s]*([A-Z0-9/\-]+)', text, re.IGNORECASE)
            if inv_match:
                details["refNo"] = inv_match.group(1)
            
            logger.info(f"Extracted SB details: {details}")
            
        except Exception as e:
            logger.error(f"Error parsing SB details: {str(e)}")
        
        return details
    
    @classmethod
    def extract_shipment_details(cls, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Main extraction method - determines document type and extracts accordingly
        """
        try:
            # Extract text from PDF
            text = cls.extract_text_from_pdf(pdf_bytes)
            
            # Determine document type
            is_be = 'BILL OF ENTRY' in text.upper() or re.search(r'BE\s*(?:NO|NUMBER)', text, re.IGNORECASE)
            is_sb = 'SHIPPING BILL' in text.upper() or re.search(r'SB\s*(?:NO|NUMBER)', text, re.IGNORECASE)
            
            # Extract details based on type
            if is_be:
                logger.info("Detected Bill of Entry document")
                return cls.extract_be_details(text)
            elif is_sb:
                logger.info("Detected Shipping Bill document")
                return cls.extract_sb_details(text)
            else:
                logger.warning("Could not determine document type, trying generic extraction")
                # Try both and return the one with more populated fields
                be_details = cls.extract_be_details(text)
                sb_details = cls.extract_sb_details(text)
                
                be_count = sum(1 for v in be_details.values() if v)
                sb_count = sum(1 for v in sb_details.values() if v)
                
                return be_details if be_count >= sb_count else sb_details
                
        except Exception as e:
            logger.error(f"Error in PDF extraction: {str(e)}")
            raise
