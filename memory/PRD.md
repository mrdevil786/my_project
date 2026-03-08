# Invoicing Software - Product Requirements Document

## Project Overview
Web-based invoicing software for logistics and freight forwarding businesses, designed for Broker Xpress and Logistics.

**Original Problem Statement:**
Build a web-based invoicing software with customer master, shipment details, expense tracking, GST calculation, and comprehensive reporting features.

**Date Started:** February 21, 2026

---

## User Personas
1. **Business Owner/Accountant** - Manages invoices, customers, and financial reports
2. **Data Entry Operator** - Creates invoices and updates customer information
3. **Finance Manager** - Analyzes reports and tracks payments

---

## Core Requirements (Static)

### 1. Customer Master
- **Mandatory Fields:** Name, Address, State, GST No, PAN No
- **Optional Fields:** IEC No, Phone, Email
- CRUD operations for customer management
- Validation for Indian states, GST format, PAN format

### 2. Invoice/Shipment Details
- Invoice No, Invoice Date
- Customer selection (from Customer Master)
- **Type of Voucher:** Tax Invoice, Credit Note, Debit Note, Reimbursement Note
- **GST Options:** With GST / Without GST
- **Shipment Fields:** Ref No, BE/SB No with Date, POL, POD, No of Containers, Container Type, No of Packages, MBL, HBL

### 3. Expense Management
- **Expense Head:** Pre-defined list with HSN/SAC code and GST rate
- **Fields:** Quantity, Rate, Exchange Rate, Amount (calculated)
- **GST Calculation:** Auto-bifurcation based on customer state
  - Intra-state: CGST + SGST (9% + 9%)
  - Inter-state: IGST (18%)
- Dynamic expense rows (add/remove)
- Editable expense names and amounts

### 4. Reports
- All invoices created/deleted
- Expense head-wise summary (count and total amount)
- Party-wise summary (invoice count, total amount, pending amount)
- Filters: Date range, Customer, Search

### 5. Design & Layout
- **Color Scheme:** Blue and White (based on reference PDFs)
- **Bank Details:** STATE BANK OF INDIA, Account: 42339205026, IFSC: SBIN0060356
- **Terms & Conditions:**
  - Interest @18% for late payments
  - Risk and responsibility cease when goods leave premises
  - Subject to Mundra Jurisdiction only. E.&O.E
- Company: BROKER XPRESS AND LOGISTICS

---

## What's Been Implemented (Frontend with Mock Data)

### ✅ Phase 1 - Frontend Application (Completed: Feb 21, 2026)

#### Features Implemented:
1. **Dashboard Page**
   - 4 stat cards: Total Invoices, Total Amount, Pending Amount, Total Customers
   - Recent invoices table with status badges (Paid/Pending)
   - Navigation to create new invoice
   - View all reports link

2. **Customer Master Page**
   - Add/Edit/Delete customer functionality
   - Form with mandatory and optional field validation
   - Indian states dropdown
   - Customer list table with all details
   - Data stored in localStorage for persistence

3. **Invoice Form Page**
   - Invoice details section (Invoice No, Date, Customer, Voucher Type, With/Without GST)
   - Comprehensive shipment details section (10 fields)
   - Dynamic expenses table with add/remove rows
   - Expense head dropdown with pre-defined options (GST rates included)
   - Real-time amount calculation
   - Auto GST calculation and bifurcation (CGST/SGST or IGST)
   - Totals summary display

4. **Reports Page**
   - 3 tabs: All Invoices, Expense Summary, Party Wise
   - Advanced filters: Search, Date range, Customer
   - All Invoices: Full list with View/Download/Delete actions
   - Expense Summary: Aggregated data by expense head
   - Party Wise: Customer-wise invoice and payment summary

#### Technical Implementation:
- React with React Router for navigation
- shadcn/ui components for consistent UI
- Lucide React icons
- localStorage for data persistence (mock backend)
- Helper functions for GST calculations
- Mock data with 2 sample invoices and 2 customers
- Clean blue & white color scheme matching reference PDFs
- Responsive design with Tailwind CSS

#### Files Created:
- `/app/frontend/src/utils/mockData.js` - Mock data and helper functions
- `/app/frontend/src/pages/Dashboard.jsx` - Dashboard page
- `/app/frontend/src/pages/CustomerMaster.jsx` - Customer management
- `/app/frontend/src/pages/InvoiceForm.jsx` - Invoice creation
- `/app/frontend/src/pages/Reports.jsx` - Reporting interface
- `/app/frontend/src/App.js` - Main app with routing
- `/app/frontend/src/App.css` - Custom styles

---

## Prioritized Backlog

### P0 - Critical (Next Phase)
1. **Backend Development**
   - MongoDB models for Customers, Invoices, Expenses
   - FastAPI REST endpoints for CRUD operations
   - GST calculation logic on backend
   - Data migration from localStorage to database

2. **Frontend-Backend Integration**
   - Replace localStorage with API calls
   - Error handling and loading states
   - Toast notifications for success/error

3. **Invoice PDF Generation**
   - PDF template matching reference format
   - Company logo and details
   - Proper GST breakdown display
   - Terms & conditions and bank details footer
   - Download/Print functionality

### P1 - Important
1. **Invoice Status Management**
   - Change status (Pending → Paid)
   - Payment tracking
   - Due date calculations
   - Payment history

2. **Invoice View/Edit**
   - View invoice details page
   - Edit existing invoices
   - Delete confirmation with audit trail

3. **Enhanced Reports**
   - Date-wise revenue chart
   - Top customers by revenue
   - GST summary report
   - Export to Excel/CSV

### P2 - Nice to Have
1. **Settings Page**
   - Edit company details
   - Manage bank details
   - Customize terms & conditions
   - Manage expense heads

2. **User Authentication**
   - Login/Logout functionality
   - Role-based access (Admin, Operator, Viewer)
   - User management

3. **Email Integration**
   - Send invoice PDF via email
   - Payment reminder emails
   - Email templates

4. **Dashboard Enhancements**
   - Revenue charts (monthly, yearly)
   - GST collection charts
   - Aging analysis for pending payments

---

## Next Tasks
1. Create MongoDB models for Customer, Invoice, ExpenseHead
2. Build FastAPI endpoints for customer CRUD
3. Build FastAPI endpoints for invoice CRUD with GST calculations
4. Integrate frontend with backend APIs
5. Add PDF generation library and create invoice template
6. Test complete flow: Create customer → Create invoice → View report → Generate PDF

---

## Technical Stack
- **Frontend:** React 19, React Router, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI, Python 3.x
- **Database:** MongoDB with Motor (async driver)
- **PDF Generation:** (To be added - ReportLab or WeasyPrint)
- **State Management:** localStorage (temporary), will use React Context/hooks

---

## API Contracts (To Be Implemented)

### Customer APIs
```
POST   /api/customers          - Create customer
GET    /api/customers          - Get all customers
GET    /api/customers/:id      - Get customer by ID
PUT    /api/customers/:id      - Update customer
DELETE /api/customers/:id      - Delete customer
```

### Invoice APIs
```
POST   /api/invoices           - Create invoice
GET    /api/invoices           - Get all invoices (with filters)
GET    /api/invoices/:id       - Get invoice by ID
PUT    /api/invoices/:id       - Update invoice
DELETE /api/invoices/:id       - Delete invoice
GET    /api/invoices/:id/pdf   - Generate PDF
```

### Reports APIs
```
GET    /api/reports/expense-summary    - Expense head summary
GET    /api/reports/party-wise         - Party-wise summary
GET    /api/reports/gst-summary        - GST summary
```

### Expense Head APIs
```
GET    /api/expense-heads      - Get all expense heads
POST   /api/expense-heads      - Create expense head
PUT    /api/expense-heads/:id  - Update expense head
DELETE /api/expense-heads/:id  - Delete expense head
```

---

## Notes
- Frontend is currently using localStorage for data persistence (mock implementation)
- GST calculation logic is implemented in frontend utility functions
- All monetary values are in Indian Rupees (₹)
- Date formats follow ISO 8601 standard
- Mobile responsiveness has been implemented with Tailwind breakpoints

---

## Update: February 21, 2026 - New Features Added

### ✅ Expense Master Page
- **CRUD Operations** - Add, edit, delete expense heads
- **Fields** - Expense head name, HSN/SAC code, GST rate
- **Special Feature** - "Always apply IGST" checkbox for import/export services
- **Visual Indicators** - Badge showing "Always IGST" vs "State-based" tax type
- **7 Pre-configured Expense Heads** including Import Ocean Freight at 5% IGST

### ✅ Import Ocean Freight Addition
- Added as expense head with 5% GST rate
- Configured with `isAlwaysIGST: true` flag
- GST calculation logic updated to always apply IGST regardless of customer state
- Visible in dropdown with " - IGST" indicator

### ✅ PDF Upload Feature
- **Upload Button** - Green "Upload BE/SB PDF" button in Shipment Details section
- **Backend Endpoint** - `/api/extract-shipment-details` for PDF text extraction
- **Auto-extraction** - Extracts BE No, Date, POL, POD, Containers, Packages, MBL, HBL
- **Libraries Used** - pdfplumber for PDF parsing, regex for pattern matching
- **User Experience** - Loading state during upload, auto-fills form fields, toast notifications

### Technical Changes:
- Modified `calculateGST()` function to accept `isAlwaysIGST` parameter
- Added PDF processing libraries: PyPDF2, pdfplumber, python-multipart
- Created ExpenseMaster page component
- Updated navigation to include Expense Master link
- Enhanced InvoiceForm with PDF upload capability

---

