"""
Invoice PDF Generator Service
Creates professional PDF documents from invoice data
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class InvoicePDFGenerator:
    """Generate professional PDF invoices"""
    
    @staticmethod
    def format_date(date_str):
        """Convert date to dd/mm/yyyy format"""
        try:
            if isinstance(date_str, str):
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                date_obj = date_str
            return date_obj.strftime('%d/%m/%Y')
        except:
            return date_str
    
    @staticmethod
    def format_currency(amount):
        """Format amount as Indian currency"""
        return f"₹{amount:,.2f}"
    
    @classmethod
    def generate_invoice_pdf(cls, invoice_data, customer_data, company_details, bank_details):
        """
        Generate PDF for an invoice
        
        Args:
            invoice_data: Invoice details dict
            customer_data: Customer details dict
            company_details: Company information dict
            bank_details: Bank account details dict
        
        Returns:
            BytesIO: PDF file in memory
        """
        buffer = BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=15*mm,
            bottomMargin=15*mm
        )
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=6,
            alignment=TA_LEFT
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=11,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=6,
            spaceBefore=12,
            bold=True
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#374151'),
            leading=12
        )
        
        small_style = ParagraphStyle(
            'CustomSmall',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#6b7280'),
            leading=10
        )
        
        # Header Section
        header_data = [
            [
                Paragraph(f"<b>{company_details['name']}</b>", title_style),
                Paragraph(f"<b>{invoice_data.get('voucherType', 'Tax Invoice')}</b>", 
                         ParagraphStyle('VoucherType', parent=heading_style, alignment=TA_RIGHT, fontSize=16))
            ],
            [
                Paragraph(f"{company_details['address']}<br/>"
                         f"<b>GSTIN:</b> {company_details['gstin']}<br/>"
                         f"<b>Email:</b> {company_details['email']}<br/>"
                         f"<b>Phone:</b> {company_details.get('phone', '')}", normal_style),
                Paragraph(f"<b>Voucher No:</b> {invoice_data.get('invoiceNo', '')}<br/>"
                         f"<b>Date:</b> {cls.format_date(invoice_data.get('invoiceDate', ''))}", 
                         ParagraphStyle('InvDetails', parent=normal_style, alignment=TA_RIGHT))
            ]
        ]
        
        header_table = Table(header_data, colWidths=[100*mm, 70*mm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#2563eb')),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 1), (-1, 1), 12),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 10*mm))
        
        # Bill To Section
        elements.append(Paragraph("<b>BILL TO:</b>", heading_style))
        bill_to_text = f"<b>{customer_data.get('name', '')}</b><br/>" \
                      f"{customer_data.get('address', '')}<br/>" \
                      f"{customer_data.get('state', '')}<br/><br/>" \
                      f"<b>GSTIN:</b> {customer_data.get('gstNo', '')} | " \
                      f"<b>PAN:</b> {customer_data.get('panNo', '')} | " \
                      f"<b>Phone:</b> {customer_data.get('phone', '')}"
        elements.append(Paragraph(bill_to_text, normal_style))
        elements.append(Spacer(1, 8*mm))
        
        # Shipment Details (if present)
        shipment = invoice_data.get('shipmentDetails', {})
        if shipment and (shipment.get('beNo') or shipment.get('pol')):
            elements.append(Paragraph("<b>SHIPMENT DETAILS:</b>", heading_style))
            shipment_text = f"<b>BE/SB No:</b> {shipment.get('beNo', '-')} | " \
                           f"<b>Date:</b> {cls.format_date(shipment.get('beDate', '')) if shipment.get('beDate') else '-'}<br/>" \
                           f"<b>POL:</b> {shipment.get('pol', '-')} | " \
                           f"<b>POD:</b> {shipment.get('pod', '-')}<br/>" \
                           f"<b>Containers:</b> {shipment.get('noOfContainers', '-')} x {shipment.get('containerType', '-')} | " \
                           f"<b>Packages:</b> {shipment.get('noOfPackages', '-')}<br/>" \
                           f"<b>MBL:</b> {shipment.get('mbl', '-')} | " \
                           f"<b>HBL:</b> {shipment.get('hbl', '-')}"
            elements.append(Paragraph(shipment_text, small_style))
            elements.append(Spacer(1, 8*mm))
        
        # Expense Table
        elements.append(Paragraph("<b>PARTICULARS:</b>", heading_style))
        
        # Table header
        expense_data = [
            ['Description', 'HSN/SAC', 'Qty', 'Rate', 'Amount', 'GST %', 'Tax Amt', 'Net Amount']
        ]
        
        # Table rows
        for expense in invoice_data.get('expenses', []):
            tax_amount = (expense.get('amount', 0) * expense.get('gstRate', 0)) / 100 if invoice_data.get('withGst') else 0
            net_amount = expense.get('amount', 0) + tax_amount
            
            rate_display = f"{expense.get('currency', 'INR')} {expense.get('rate', 0):.2f}"
            if expense.get('currency') == 'USD' and expense.get('exchangeRate', 1) > 1:
                rate_display += f"\n(@₹{expense.get('exchangeRate', 1)})"
            
            expense_data.append([
                expense.get('expenseName', ''),
                expense.get('hsnSac', ''),
                str(expense.get('qty', 1)),
                rate_display,
                cls.format_currency(expense.get('amount', 0)),
                f"{expense.get('gstRate', 0)}%",
                cls.format_currency(tax_amount),
                cls.format_currency(net_amount)
            ])
        
        expense_table = Table(expense_data, colWidths=[40*mm, 20*mm, 15*mm, 25*mm, 25*mm, 15*mm, 20*mm, 25*mm])
        expense_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 1), (1, -1), 'LEFT'),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(expense_table)
        elements.append(Spacer(1, 8*mm))
        
        # Totals Section
        totals_data = [
            ['Subtotal:', cls.format_currency(invoice_data.get('subtotal', 0))],
        ]
        
        if invoice_data.get('withGst'):
            if invoice_data.get('cgst', 0) > 0:
                totals_data.append(['CGST:', cls.format_currency(invoice_data.get('cgst', 0))])
                totals_data.append(['SGST:', cls.format_currency(invoice_data.get('sgst', 0))])
            if invoice_data.get('igst', 0) > 0:
                totals_data.append(['IGST:', cls.format_currency(invoice_data.get('igst', 0))])
        
        totals_data.append(['<b>Total Amount:</b>', f"<b>{cls.format_currency(invoice_data.get('total', 0))}</b>"])
        
        # Create totals table
        totals_table_data = [[Paragraph(row[0], normal_style), Paragraph(row[1], ParagraphStyle('TotalVal', parent=normal_style, alignment=TA_RIGHT))] for row in totals_data]
        totals_table = Table(totals_table_data, colWidths=[40*mm, 30*mm], hAlign='RIGHT')
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#2563eb')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#dbeafe')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(totals_table)
        elements.append(Spacer(1, 10*mm))
        
        # Bank Details
        elements.append(Paragraph("<b>BANK DETAILS:</b>", heading_style))
        bank_text = f"<b>Bank Name:</b> {bank_details.get('bankName', '')}<br/>" \
                   f"<b>Account Name:</b> {bank_details.get('accountName', '')}<br/>" \
                   f"<b>Account Number:</b> {bank_details.get('accountNumber', '')}<br/>" \
                   f"<b>IFSC Code:</b> {bank_details.get('ifscCode', '')}"
        elements.append(Paragraph(bank_text, normal_style))
        elements.append(Spacer(1, 8*mm))
        
        # Terms and Conditions
        elements.append(Paragraph("<b>TERMS AND CONDITIONS:</b>", heading_style))
        terms_text = "1. Interest @18% will be charged if payment is not made within due date.<br/>" \
                    "2. Our risk and responsibility cease as soon as the goods leave our premises.<br/>" \
                    "3. Subject to Mundra Jurisdiction only. E.&.O.E"
        elements.append(Paragraph(terms_text, small_style))
        elements.append(Spacer(1, 10*mm))
        
        # Footer
        footer_data = [
            [
                Paragraph("Thank you for your business!", normal_style),
                Paragraph("<b>Authorized Signatory</b><br/>" + company_details['name'], 
                         ParagraphStyle('Footer', parent=normal_style, alignment=TA_RIGHT))
            ]
        ]
        footer_table = Table(footer_data, colWidths=[85*mm, 85*mm])
        footer_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEABOVE', (0, 0), (-1, 0), 1, colors.grey),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
        ]))
        elements.append(footer_table)
        
        # Build PDF
        doc.build(elements)
        
        # Get the value of the BytesIO buffer
        pdf = buffer.getvalue()
        buffer.close()
        
        return pdf
