"""
Invoice API Tests - Testing CRUD operations with focus on Edit/Update functionality
Tests: GET all, GET by ID, POST create, PUT update, DELETE operations
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInvoicesAPI:
    """Invoice endpoint tests with CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test configuration"""
        self.base_url = BASE_URL
        self.headers = {"Content-Type": "application/json"}
        
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{self.base_url}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("Health check passed")
        
    def test_get_all_invoices(self):
        """Test GET all invoices"""
        response = requests.get(f"{self.base_url}/api/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} invoices")
        # Store first invoice ID for later tests
        if data:
            self.__class__.existing_invoice_id = data[0].get("id")
            print(f"First invoice ID: {self.existing_invoice_id}")
        
    def test_get_invoice_by_id(self):
        """Test GET single invoice by ID - using existing invoice"""
        # Get all invoices first to get a valid ID
        response = requests.get(f"{self.base_url}/api/invoices")
        invoices = response.json()
        assert len(invoices) > 0, "No invoices found to test"
        
        invoice_id = invoices[0]["id"]
        response = requests.get(f"{self.base_url}/api/invoices/{invoice_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == invoice_id
        assert "invoiceNo" in data
        assert "customerId" in data
        assert "expenses" in data
        assert "shipmentDetails" in data
        print(f"Successfully fetched invoice {data['invoiceNo']} with ID {invoice_id}")
        
    def test_get_nonexistent_invoice_returns_404(self):
        """Test GET for non-existent invoice returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{self.base_url}/api/invoices/{fake_id}")
        assert response.status_code == 404
        print("404 returned correctly for non-existent invoice")
        
    def test_create_invoice_with_mixed_currency(self):
        """Test POST create invoice with mixed currencies (INR and USD)"""
        # First get customers and expense heads
        customers_res = requests.get(f"{self.base_url}/api/customers")
        assert customers_res.status_code == 200
        customers = customers_res.json()
        assert len(customers) > 0, "No customers found"
        
        expenses_res = requests.get(f"{self.base_url}/api/expenses")
        assert expenses_res.status_code == 200
        expense_heads = expenses_res.json()
        assert len(expense_heads) >= 2, "Need at least 2 expense heads"
        
        test_invoice_no = f"TEST-{uuid.uuid4().hex[:8]}"
        
        invoice_payload = {
            "invoiceNo": test_invoice_no,
            "invoiceDate": "2026-02-21",
            "customerId": customers[0]["id"],
            "voucherType": "Tax Invoice",
            "withGst": True,
            "shipmentDetails": {
                "refNo": "TEST-REF-001",
                "beNo": "TEST-BE-001",
                "beDate": "2026-02-20",
                "pol": "QINGDAO",
                "pod": "MUNDRA",
                "noOfContainers": "2",
                "containerType": "40 FT",
                "noOfPackages": "100",
                "mbl": "TEST-MBL",
                "hbl": "TEST-HBL"
            },
            "expenses": [
                {
                    "expenseHeadId": expense_heads[0]["id"],
                    "expenseName": expense_heads[0]["name"],
                    "hsnSac": expense_heads[0]["hsnSac"],
                    "gstRate": expense_heads[0]["gstRate"],
                    "isAlwaysIGST": expense_heads[0].get("isAlwaysIGST", False),
                    "qty": 1,
                    "rate": 1000.0,
                    "currency": "INR",
                    "exchangeRate": 1.0,
                    "amount": 1000.0
                },
                {
                    "expenseHeadId": expense_heads[1]["id"],
                    "expenseName": expense_heads[1]["name"],
                    "hsnSac": expense_heads[1]["hsnSac"],
                    "gstRate": expense_heads[1]["gstRate"],
                    "isAlwaysIGST": expense_heads[1].get("isAlwaysIGST", False),
                    "qty": 1,
                    "rate": 100.0,
                    "currency": "USD",
                    "exchangeRate": 83.50,
                    "amount": 8350.0
                }
            ],
            "subtotal": 9350.0,
            "cgst": 841.5,
            "sgst": 841.5,
            "igst": 0,
            "total": 11033.0,
            "status": "Pending"
        }
        
        response = requests.post(
            f"{self.base_url}/api/invoices",
            json=invoice_payload,
            headers=self.headers
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["invoiceNo"] == test_invoice_no
        assert len(data["expenses"]) == 2
        
        # Verify mixed currency in expenses
        inr_expense = next((e for e in data["expenses"] if e["currency"] == "INR"), None)
        usd_expense = next((e for e in data["expenses"] if e["currency"] == "USD"), None)
        
        assert inr_expense is not None, "INR expense not found"
        assert usd_expense is not None, "USD expense not found"
        assert inr_expense["exchangeRate"] == 1.0
        assert usd_expense["exchangeRate"] == 83.50
        
        print(f"Created invoice with mixed currencies: {test_invoice_no}")
        self.__class__.created_invoice_id = data["id"]
        self.__class__.created_invoice_no = test_invoice_no
        return data["id"]
        
    def test_update_invoice_modify_expenses(self):
        """Test PUT update invoice - modify expense rates and currency"""
        # First create an invoice to update
        customers_res = requests.get(f"{self.base_url}/api/customers")
        customers = customers_res.json()
        expenses_res = requests.get(f"{self.base_url}/api/expenses")
        expense_heads = expenses_res.json()
        
        # Create invoice for update test
        test_invoice_no = f"UPDATE-TEST-{uuid.uuid4().hex[:6]}"
        create_payload = {
            "invoiceNo": test_invoice_no,
            "invoiceDate": "2026-02-21",
            "customerId": customers[0]["id"],
            "voucherType": "Tax Invoice",
            "withGst": True,
            "shipmentDetails": {
                "refNo": "REF-UPDATE",
                "beNo": "BE-UPDATE",
                "beDate": "2026-02-20",
                "pol": "SHANGHAI",
                "pod": "MUMBAI",
                "noOfContainers": "1",
                "containerType": "20 FT",
                "noOfPackages": "50",
                "mbl": "",
                "hbl": ""
            },
            "expenses": [
                {
                    "expenseHeadId": expense_heads[0]["id"],
                    "expenseName": expense_heads[0]["name"],
                    "hsnSac": expense_heads[0]["hsnSac"],
                    "gstRate": expense_heads[0]["gstRate"],
                    "isAlwaysIGST": False,
                    "qty": 1,
                    "rate": 5000.0,
                    "currency": "INR",
                    "exchangeRate": 1.0,
                    "amount": 5000.0
                }
            ],
            "subtotal": 5000.0,
            "cgst": 450.0,
            "sgst": 450.0,
            "igst": 0,
            "total": 5900.0,
            "status": "Pending"
        }
        
        create_res = requests.post(f"{self.base_url}/api/invoices", json=create_payload)
        assert create_res.status_code == 201, f"Create failed: {create_res.text}"
        created = create_res.json()
        invoice_id = created["id"]
        
        # Now update the invoice - change rate, currency, and shipment details
        update_payload = {
            "invoiceNo": test_invoice_no,
            "invoiceDate": "2026-02-21",
            "voucherType": "Tax Invoice",
            "shipmentDetails": {
                "refNo": "REF-UPDATED",  # Changed
                "beNo": "BE-UPDATED",
                "beDate": "2026-02-21",  # Changed
                "pol": "QINGDAO",  # Changed
                "pod": "MUNDRA",  # Changed
                "noOfContainers": "2",  # Changed
                "containerType": "40 FT",  # Changed
                "noOfPackages": "100",
                "mbl": "MBL-NEW",
                "hbl": "HBL-NEW"
            },
            "expenses": [
                {
                    "expenseHeadId": expense_heads[0]["id"],
                    "expenseName": expense_heads[0]["name"],
                    "hsnSac": expense_heads[0]["hsnSac"],
                    "gstRate": expense_heads[0]["gstRate"],
                    "isAlwaysIGST": False,
                    "qty": 1,
                    "rate": 7500.0,  # Changed from 5000 to 7500
                    "currency": "INR",
                    "exchangeRate": 1.0,
                    "amount": 7500.0
                },
                {
                    "expenseHeadId": expense_heads[1]["id"] if len(expense_heads) > 1 else expense_heads[0]["id"],
                    "expenseName": expense_heads[1]["name"] if len(expense_heads) > 1 else expense_heads[0]["name"],
                    "hsnSac": expense_heads[1]["hsnSac"] if len(expense_heads) > 1 else expense_heads[0]["hsnSac"],
                    "gstRate": expense_heads[1]["gstRate"] if len(expense_heads) > 1 else expense_heads[0]["gstRate"],
                    "isAlwaysIGST": False,
                    "qty": 1,
                    "rate": 200.0,
                    "currency": "USD",  # Added USD expense
                    "exchangeRate": 83.0,
                    "amount": 16600.0
                }
            ],
            "subtotal": 24100.0,
            "cgst": 2169.0,
            "sgst": 2169.0,
            "igst": 0,
            "total": 28438.0,
            "status": "Pending"
        }
        
        update_res = requests.put(
            f"{self.base_url}/api/invoices/{invoice_id}",
            json=update_payload,
            headers=self.headers
        )
        assert update_res.status_code == 200, f"Update failed: {update_res.text}"
        
        updated = update_res.json()
        
        # Verify updates persisted
        assert updated["shipmentDetails"]["pol"] == "QINGDAO"
        assert updated["shipmentDetails"]["pod"] == "MUNDRA"
        assert updated["shipmentDetails"]["noOfContainers"] == "2"
        assert len(updated["expenses"]) == 2
        
        # Verify via GET
        get_res = requests.get(f"{self.base_url}/api/invoices/{invoice_id}")
        assert get_res.status_code == 200
        fetched = get_res.json()
        
        assert fetched["shipmentDetails"]["pol"] == "QINGDAO"
        assert len(fetched["expenses"]) == 2
        
        # Find USD expense and verify
        usd_expense = next((e for e in fetched["expenses"] if e.get("currency") == "USD"), None)
        assert usd_expense is not None, "USD expense not found after update"
        assert usd_expense["exchangeRate"] == 83.0
        assert usd_expense["rate"] == 200.0
        
        print(f"Successfully updated invoice {invoice_id}")
        print(f"  - Shipment POL changed to: {fetched['shipmentDetails']['pol']}")
        print(f"  - Expenses count: {len(fetched['expenses'])}")
        print(f"  - USD expense added with rate: {usd_expense['rate']} and exchange rate: {usd_expense['exchangeRate']}")
        
        # Cleanup
        self.__class__.update_test_invoice_id = invoice_id
        
    def test_update_invoice_change_currency_per_expense(self):
        """Test updating individual expense currency from INR to USD"""
        # Get existing invoice
        response = requests.get(f"{self.base_url}/api/invoices")
        invoices = response.json()
        
        # Find our test invoice or use first one
        test_invoice = next((i for i in invoices if "TEST" in i.get("invoiceNo", "")), None)
        if not test_invoice:
            test_invoice = invoices[0]
        
        invoice_id = test_invoice["id"]
        
        # Get full invoice data
        get_res = requests.get(f"{self.base_url}/api/invoices/{invoice_id}")
        original = get_res.json()
        
        # Create update payload changing first expense currency to USD
        expenses_copy = []
        for exp in original["expenses"]:
            exp_copy = {
                "expenseHeadId": exp["expenseHeadId"],
                "expenseName": exp["expenseName"],
                "hsnSac": exp["hsnSac"],
                "gstRate": exp["gstRate"],
                "isAlwaysIGST": exp.get("isAlwaysIGST", False),
                "qty": exp["qty"],
                "rate": exp["rate"],
                "currency": exp.get("currency", "INR"),
                "exchangeRate": exp.get("exchangeRate", 1.0),
                "amount": exp["amount"]
            }
            expenses_copy.append(exp_copy)
        
        # Change first expense to USD if it's INR
        if expenses_copy[0]["currency"] == "INR":
            expenses_copy[0]["currency"] = "USD"
            expenses_copy[0]["exchangeRate"] = 84.0
            expenses_copy[0]["amount"] = expenses_copy[0]["qty"] * expenses_copy[0]["rate"] * 84.0
        
        update_payload = {
            "invoiceNo": original["invoiceNo"],
            "invoiceDate": original["invoiceDate"],
            "voucherType": original["voucherType"],
            "shipmentDetails": original["shipmentDetails"],
            "expenses": expenses_copy,
            "subtotal": sum(e["amount"] for e in expenses_copy),
            "cgst": original["cgst"],
            "sgst": original["sgst"],
            "igst": original["igst"],
            "total": sum(e["amount"] for e in expenses_copy) + original["cgst"] + original["sgst"] + original["igst"],
            "status": original["status"]
        }
        
        update_res = requests.put(
            f"{self.base_url}/api/invoices/{invoice_id}",
            json=update_payload
        )
        assert update_res.status_code == 200, f"Failed to update: {update_res.text}"
        
        # Verify
        verify_res = requests.get(f"{self.base_url}/api/invoices/{invoice_id}")
        verified = verify_res.json()
        
        first_expense = verified["expenses"][0]
        print(f"First expense currency: {first_expense.get('currency')}")
        print(f"First expense exchange rate: {first_expense.get('exchangeRate')}")
        
    def test_update_nonexistent_invoice_returns_404(self):
        """Test PUT for non-existent invoice returns 404"""
        fake_id = str(uuid.uuid4())
        update_payload = {
            "invoiceNo": "FAKE-001",
            "invoiceDate": "2026-02-21",
            "voucherType": "Tax Invoice",
            "shipmentDetails": {
                "refNo": "", "beNo": "", "beDate": "", "pol": "", "pod": "",
                "noOfContainers": "", "containerType": "20 FT", "noOfPackages": "",
                "mbl": "", "hbl": ""
            },
            "expenses": [],
            "subtotal": 0,
            "cgst": 0,
            "sgst": 0,
            "igst": 0,
            "total": 0,
            "status": "Pending"
        }
        
        response = requests.put(
            f"{self.base_url}/api/invoices/{fake_id}",
            json=update_payload
        )
        assert response.status_code == 404
        print("404 returned correctly for updating non-existent invoice")


class TestCustomersAndExpenses:
    """Test customers and expense heads endpoints - prerequisites for invoice operations"""
    
    def test_get_customers(self):
        """Test GET all customers"""
        response = requests.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2, "Expected at least 2 customers"
        
        # Verify customer structure
        customer = data[0]
        assert "id" in customer
        assert "name" in customer
        assert "state" in customer
        print(f"Found {len(data)} customers: {[c['name'] for c in data]}")
        
    def test_get_expense_heads(self):
        """Test GET all expense heads"""
        response = requests.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2, "Expected at least 2 expense heads"
        
        # Verify expense structure
        expense = data[0]
        assert "id" in expense
        assert "name" in expense
        assert "hsnSac" in expense
        assert "gstRate" in expense
        print(f"Found {len(data)} expense heads")


class TestCleanup:
    """Cleanup test-created invoices"""
    
    def test_cleanup_test_invoices(self):
        """Delete test-created invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        invoices = response.json()
        
        deleted_count = 0
        for inv in invoices:
            if "TEST" in inv.get("invoiceNo", "") or "UPDATE-TEST" in inv.get("invoiceNo", ""):
                del_res = requests.delete(f"{BASE_URL}/api/invoices/{inv['id']}")
                if del_res.status_code in [200, 204]:
                    deleted_count += 1
                    print(f"Deleted test invoice: {inv['invoiceNo']}")
        
        print(f"Cleanup complete: deleted {deleted_count} test invoices")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
