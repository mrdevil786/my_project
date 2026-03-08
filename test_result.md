# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Web-based invoicing software with customer/expense management, invoice/quotation creation, PDF/Excel export, GST reports, Tally export, company logo/seal support, invoice series management, currency switching, and PDF parsing for auto-fill"

backend:
  - task: "Invoice Edit API (PUT /api/invoices/{id})"
    implemented: true
    working: true
    file: "/app/backend/routes/invoices.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Backend PUT endpoint already exists (lines 58-79). Added 'currency' field to InvoiceExpense model to support mixed currencies per expense."
      - working: true
        agent: "testing"
        comment: "PASSED - Backend API PUT /api/invoices/{id} tested successfully. Created 11 tests including update with mixed currency changes. All tests passing (11/11)."

  - task: "PDF Extraction Mock Endpoint"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Currently a mock endpoint. Real implementation with PDF parsing is planned for P1 phase."

frontend:
  - task: "Edit Invoice Feature"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/InvoiceForm.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "MAJOR UPDATE: Fixed submit handler to call invoicesAPI.update() when in edit mode (isEditMode=true), invoicesAPI.create() for new invoices. Updated page title and button text for edit mode. Edit button exists in InvoiceView.jsx (line 162). Route /invoice/edit/:id configured in App.js (line 92)."
      - working: true
        agent: "testing"
        comment: "PASSED - Edit Invoice end-to-end flow tested successfully. Navigated from dashboard → invoice view → edit form. Form pre-populated correctly. Modified expense rates and shipment details. Update submitted successfully with redirect to invoice view. All changes persisted in database."

  - task: "Mixed Currency Support Per Expense"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/InvoiceForm.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "NEW FEATURE: Added per-expense currency selection. Each expense row now has its own currency dropdown (INR/USD). Moved currency selector from table header to individual expense rows. Added 'currency' field to expense state initialization and all expense-related operations (create, edit, duplicate, convert from quotation)."
      - working: false
        agent: "testing"
        comment: "BUG FOUND: Missing 'Copy' icon import from lucide-react causing runtime error when duplicate button clicked."
      - working: true
        agent: "testing"
        comment: "PASSED - Fixed missing Copy import. Mixed currency feature tested successfully. Created invoice with INR expense (1000 @ 1) and USD expense (100 @ 83.50). Calculations correct: ₹1000 + ₹8350 = ₹9350. Duplicate feature preserves currency settings correctly."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "Edit Invoice Feature"
    - "Mixed Currency Support Per Expense"
    - "Invoice Edit API (PUT /api/invoices/{id})"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      New fork agent taking over. Implemented two P0 critical features:
      
      1. FIXED Edit Invoice Feature:
         - Submit handler now correctly calls update() API when in edit mode
         - Page title and button text update based on mode (Create/Edit/Duplicate)
         - Redirect to invoice view after successful update
      
      2. NEW Mixed Currency Support:
         - Each expense can now have different currency (INR/USD)
         - Currency selector moved from global (table header) to per-row
         - Exchange rate field has contextual placeholder based on selected currency
         - Backend model updated to include 'currency' field in InvoiceExpense
      
      TESTING REQUIRED:
      - Test Edit Invoice end-to-end flow:
        1. Navigate to existing invoice → Click Edit
        2. Verify form loads with correct pre-filled data
        3. Modify expense amounts and shipment details
        4. Change currency for different expenses
        5. Submit and verify redirect + data persistence
      - Test Create Invoice with mixed currencies:
        1. Create new invoice with multiple expenses
        2. Set different currencies for different expenses (e.g., some INR, some USD)
        3. Verify exchange rate calculations
        4. Submit and view invoice
      - Test Duplicate Invoice preserves currency settings
      
      User provided sample BE and SB PDFs for future PDF extraction implementation.
  
  - agent: "testing"
    message: |
      ✅ ALL TESTS PASSED (11/11 backend, 100% frontend)
      
      FIXED ISSUES:
      - Missing Copy icon import in InvoiceForm.jsx line 8 (CRITICAL bug causing runtime error)
      
      TESTED & WORKING:
      1. Edit Invoice: Full e2e flow working perfectly
      2. Mixed Currency: INR/USD per expense with exchange rates working
      3. Duplicate Invoice: Preserves all currency settings
      4. Backend API: All CRUD operations tested and passing
      
      Created comprehensive test suite: /app/backend/tests/test_invoices_api.py
      
      READY FOR PRODUCTION. Next: P1 tasks (PDF extraction, server-side PDF generation)
