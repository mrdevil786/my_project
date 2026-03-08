import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Trash2, Save, Upload, Loader2, Copy } from 'lucide-react';
import { calculateGST, companyDetails } from '../utils/mockData';
import { customersAPI, expensesAPI, invoicesAPI, extractShipmentDetails, seriesAPI } from '../utils/api';
import { toast } from 'sonner';

const InvoiceForm = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // For edit mode
  const [customers, setCustomers] = useState([]);
  const [expenseHeads, setExpenseHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
    name: '',
    hsnSac: '',
    gstRate: 18,
    isAlwaysIGST: false
  });
  
  const [invoiceData, setInvoiceData] = useState({
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    customerId: '',
    voucherType: 'Tax Invoice',
    withGst: true
  });

  const [shipmentDetails, setShipmentDetails] = useState({
    refNo: '',
    beNo: '',
    beDate: '',
    pol: '',
    pod: '',
    noOfContainers: '',
    containerType: '20 FT',
    noOfPackages: '',
    mbl: '',
    hbl: ''
  });

  const [expenses, setExpenses] = useState([
    { id: Date.now(), expenseHeadId: '', customName: '', qty: 1, rate: 0, currency: 'INR', exchangeRate: 1 }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [customersRes, expensesRes] = await Promise.all([
          customersAPI.getAll(),
          expensesAPI.getAll()
        ]);
        setCustomers(customersRes.data);
        setExpenseHeads(expensesRes.data);
        
        // Check if we're in edit mode
        if (id) {
          setIsEditMode(true);
          try {
            const invoiceRes = await invoicesAPI.getById(id);
            const invoiceData = invoiceRes.data;
            
            // Load invoice data
            setInvoiceData({
              invoiceNo: invoiceData.invoiceNo,
              invoiceDate: invoiceData.invoiceDate,
              customerId: invoiceData.customerId,
              voucherType: invoiceData.voucherType,
              withGst: invoiceData.withGst
            });
            
            setShipmentDetails(invoiceData.shipmentDetails);
            
            // Load expenses
            const loadedExpenses = invoiceData.expenses.map((exp, index) => ({
              id: Date.now() + index,
              expenseHeadId: exp.expenseHeadId,
              qty: exp.qty,
              rate: exp.rate,
              currency: exp.currency || 'INR',
              exchangeRate: exp.exchangeRate
            }));
            setExpenses(loadedExpenses);
            
            toast.success('Invoice loaded for editing');
          } catch (error) {
            console.error('Error loading invoice:', error);
            toast.error('Failed to load invoice');
            navigate('/');
          }
        } else {
          // Auto-fetch next invoice number preview for new invoice (without incrementing)
          try {
            const seriesRes = await seriesAPI.preview(invoiceData.voucherType);
            setInvoiceData(prev => ({
              ...prev,
              invoiceNo: seriesRes.data.nextNumber
            }));
          } catch (error) {
            console.error('Error fetching series preview:', error);
          }
        }
        
        // Check if we're converting from quotation
        const convertDataStr = localStorage.getItem('convertQuotationData');
        if (convertDataStr) {
          try {
            const convertData = JSON.parse(convertDataStr);
            
            setInvoiceData(prev => ({
              ...prev,
              customerId: convertData.customerId,
              voucherType: convertData.voucherType,
              withGst: convertData.withGst
            }));
            
            // Try to auto-match quotation items with expense heads
            if (convertData.quotationItems && expensesRes.data.length > 0) {
              const matchedExpenses = convertData.quotationItems.map((item, index) => {
                // Try to find matching expense head by name
                const matchingHead = expensesRes.data.find(head => 
                  head.name.toLowerCase().includes(item.description.toLowerCase()) ||
                  item.description.toLowerCase().includes(head.name.toLowerCase())
                );
                
                return {
                  id: Date.now() + index,
                  expenseHeadId: matchingHead?.id || '',
                  customName: matchingHead ? '' : item.description,
                  qty: 1,
                  rate: item.rate || '0',
                  currency: 'INR',
                  exchangeRate: 1
                };
              });
              
              setExpenses(matchedExpenses);
              
              if (matchedExpenses.some(exp => !exp.expenseHeadId)) {
                toast.info('Some items could not be auto-matched. Please select expense heads manually.');
              } else {
                toast.success('Quotation items auto-matched with expense heads!');
              }
            }
            
            localStorage.removeItem('convertQuotationData');
          } catch (error) {
            console.error('Error loading quotation data:', error);
          }
        }
        
        // Check if we're duplicating an invoice
        const duplicateDataStr = localStorage.getItem('duplicateInvoiceData');
        if (duplicateDataStr) {
          setIsDuplicating(true);
          try {
            const duplicateData = JSON.parse(duplicateDataStr);
            
            // Set customer (locked for duplication)
            setInvoiceData(prev => ({
              ...prev,
              customerId: duplicateData.customerId,
              voucherType: duplicateData.voucherType,
              withGst: duplicateData.withGst
            }));
            
            // Set expenses
            const duplicatedExpenses = duplicateData.expenses.map((exp, index) => ({
              id: Date.now() + index,
              expenseHeadId: exp.expenseHeadId,
              qty: exp.qty,
              rate: exp.rate,
              currency: exp.currency || 'INR',
              exchangeRate: exp.exchangeRate
            }));
            setExpenses(duplicatedExpenses);
            
            // Clear the duplicate data
            localStorage.removeItem('duplicateInvoiceData');
            
            toast.success('Invoice duplicated! Customer is locked. Update invoice number and shipment details.');
          } catch (error) {
            console.error('Error loading duplicate data:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleInvoiceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInvoiceData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleShipmentChange = (e) => {
    const { name, value } = e.target;
    setShipmentDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleExpenseChange = (id, field, value) => {
    // Check if user selected "add_new" option
    if (field === 'expenseHeadId' && value === 'add_new') {
      setIsAddExpenseDialogOpen(true);
      return;
    }
    
    setExpenses(prev => prev.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  const handleNewExpenseInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewExpenseForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleAddNewExpense = async (e) => {
    e.preventDefault();
    
    if (!newExpenseForm.name || !newExpenseForm.hsnSac) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const newExpenseData = {
        name: newExpenseForm.name,
        hsnSac: newExpenseForm.hsnSac,
        gstRate: parseFloat(newExpenseForm.gstRate),
        isAlwaysIGST: newExpenseForm.isAlwaysIGST
      };

      const response = await expensesAPI.create(newExpenseData);
      
      // Add to local state
      setExpenseHeads(prev => [...prev, response.data]);
      
      toast.success('Expense head added successfully!');
      
      // Reset form
      setNewExpenseForm({
        name: '',
        hsnSac: '',
        gstRate: 18,
        isAlwaysIGST: false
      });
      
      setIsAddExpenseDialogOpen(false);
    } catch (error) {
      console.error('Error adding expense head:', error);
      toast.error('Failed to add expense head');
    }
  };

  const addExpenseRow = () => {
    setExpenses(prev => [
      ...prev,
      { id: Date.now(), expenseHeadId: '', customName: '', qty: 1, rate: 0, currency: 'INR', exchangeRate: 1 }
    ]);
  };

  const removeExpenseRow = (id) => {
    if (expenses.length > 1) {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    }
  };

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsUploadingPDF(true);

    try {
      const response = await extractShipmentDetails(file);
      const data = response.data;
      
      // Auto-fill shipment details
      setShipmentDetails(prev => ({
        ...prev,
        beNo: data.beNo || prev.beNo,
        beDate: data.beDate || prev.beDate,
        pol: data.pol || prev.pol,
        pod: data.pod || prev.pod,
        noOfContainers: data.noOfContainers || prev.noOfContainers,
        containerType: data.containerType || prev.containerType,
        noOfPackages: data.noOfPackages || prev.noOfPackages,
        mbl: data.mbl || prev.mbl,
        hbl: data.hbl || prev.hbl
      }));

      toast.success('Shipment details extracted successfully!');
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error('Failed to extract data from PDF. Please fill manually.');
    } finally {
      setIsUploadingPDF(false);
    }
  };

  const calculateTotals = () => {
    const selectedCustomer = customers.find(c => c.id === invoiceData.customerId);
    if (!selectedCustomer) return { subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };

    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    expenses.forEach(expense => {
      const expenseHead = expenseHeads.find(h => h.id === expense.expenseHeadId);
      if (!expenseHead) return;

      const amount = parseFloat(expense.qty) * parseFloat(expense.rate) * parseFloat(expense.exchangeRate);
      subtotal += amount;

      if (invoiceData.withGst && expenseHead.gstRate > 0) {
        const gst = calculateGST(
          amount, 
          expenseHead.gstRate, 
          selectedCustomer.state, 
          companyDetails.state,
          expenseHead.isAlwaysIGST
        );
        totalCgst += gst.cgst;
        totalSgst += gst.sgst;
        totalIgst += gst.igst;
      }
    });

    const total = subtotal + totalCgst + totalSgst + totalIgst;

    return {
      subtotal: subtotal.toFixed(2),
      cgst: totalCgst.toFixed(2),
      sgst: totalSgst.toFixed(2),
      igst: totalIgst.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!invoiceData.customerId) {
      toast.error('Please select a customer');
      return;
    }

    if (!invoiceData.invoiceNo) {
      toast.error('Please enter invoice number');
      return;
    }

    try {
      const totals = calculateTotals();

      const invoicePayload = {
        ...invoiceData,
        shipmentDetails,
        expenses: expenses.map(exp => {
          const expenseHead = expenseHeads.find(h => h.id === exp.expenseHeadId);
          return {
            expenseHeadId: exp.expenseHeadId,
            expenseName: expenseHead?.name || exp.customName || '',
            hsnSac: expenseHead?.hsnSac || '',
            gstRate: expenseHead?.gstRate || 0,
            isAlwaysIGST: expenseHead?.isAlwaysIGST || false,
            qty: parseFloat(exp.qty),
            rate: parseFloat(exp.rate),
            currency: exp.currency,
            exchangeRate: parseFloat(exp.exchangeRate),
            amount: parseFloat(exp.qty) * parseFloat(exp.rate) * parseFloat(exp.exchangeRate)
          };
        }),
        subtotal: parseFloat(totals.subtotal),
        cgst: parseFloat(totals.cgst),
        sgst: parseFloat(totals.sgst),
        igst: parseFloat(totals.igst),
        total: parseFloat(totals.total),
        status: 'Pending'
      };

      if (isEditMode) {
        await invoicesAPI.update(id, invoicePayload);
        toast.success('Invoice updated successfully');
        navigate(`/invoice/${id}`);
      } else {
        // For new invoices, get and increment the series number
        const seriesRes = await seriesAPI.getNextNumber(invoiceData.voucherType);
        invoicePayload.invoiceNo = seriesRes.data.nextNumber;
        
        await invoicesAPI.create(invoicePayload);
        toast.success('Invoice created successfully');
        navigate('/');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} invoice:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} invoice`);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Invoice' : isDuplicating ? 'Duplicate Invoice' : 'Create Invoice'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditMode
              ? 'Update invoice details and save changes'
              : isDuplicating 
              ? 'Creating a copy with same customer and expenses. Update invoice number and shipment details.' 
              : 'Fill in the details to generate a new invoice'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Voucher Details */}
        <Card>
          <CardHeader>
            <CardTitle>Voucher Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="invoiceNo">Voucher No <span className="text-red-500">*</span></Label>
                <Input
                  id="invoiceNo"
                  name="invoiceNo"
                  value={invoiceData.invoiceNo}
                  onChange={handleInvoiceChange}
                  required
                  placeholder="INV-21"
                />
              </div>

              <div>
                <Label htmlFor="invoiceDate">Voucher Date <span className="text-red-500">*</span></Label>
                <Input
                  id="invoiceDate"
                  name="invoiceDate"
                  type="date"
                  value={invoiceData.invoiceDate}
                  onChange={handleInvoiceChange}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Format: DD/MM/YYYY</p>
              </div>

              <div>
                <Label htmlFor="customerId">Customer <span className="text-red-500">*</span></Label>
                <select
                  id="customerId"
                  name="customerId"
                  value={invoiceData.customerId}
                  onChange={handleInvoiceChange}
                  required
                  disabled={isDuplicating}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDuplicating ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
                {isDuplicating && (
                  <p className="text-xs text-purple-600 mt-1 flex items-center">
                    <Copy className="w-3 h-3 mr-1" />
                    Customer locked for duplicated invoice
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="voucherType">Voucher Type <span className="text-red-500">*</span></Label>
                <select
                  id="voucherType"
                  name="voucherType"
                  value={invoiceData.voucherType}
                  onChange={handleInvoiceChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Tax Invoice">Tax Invoice</option>
                  <option value="Credit Note">Credit Note</option>
                  <option value="Debit Note">Debit Note</option>
                  <option value="Reimbursement Note">Reimbursement Note</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Select the type of voucher</p>
              </div>

              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="withGst"
                  name="withGst"
                  checked={invoiceData.withGst}
                  onChange={handleInvoiceChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="withGst" className="ml-2 cursor-pointer">With GST</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipment Details */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Shipment Details</CardTitle>
              <div className="flex items-center gap-2">
                <Label 
                  htmlFor="pdf-upload" 
                  className="cursor-pointer inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  {isUploadingPDF ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload BE/SB PDF
                    </>
                  )}
                </Label>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handlePDFUpload}
                  disabled={isUploadingPDF}
                  className="hidden"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Upload Bill of Entry or Shipping Bill PDF to auto-fill details
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="refNo">Ref No</Label>
                <Input
                  id="refNo"
                  name="refNo"
                  value={shipmentDetails.refNo}
                  onChange={handleShipmentChange}
                  placeholder="REF001"
                />
              </div>

              <div>
                <Label htmlFor="beNo">BE/SB No</Label>
                <Input
                  id="beNo"
                  name="beNo"
                  value={shipmentDetails.beNo}
                  onChange={handleShipmentChange}
                  placeholder="BE123456"
                />
              </div>

              <div>
                <Label htmlFor="beDate">BE/SB Date</Label>
                <Input
                  id="beDate"
                  name="beDate"
                  type="date"
                  value={shipmentDetails.beDate}
                  onChange={handleShipmentChange}
                />
              </div>

              <div>
                <Label htmlFor="pol">POL (Port of Loading)</Label>
                <Input
                  id="pol"
                  name="pol"
                  value={shipmentDetails.pol}
                  onChange={handleShipmentChange}
                  placeholder="QINGDAO"
                />
              </div>

              <div>
                <Label htmlFor="pod">POD (Port of Discharge)</Label>
                <Input
                  id="pod"
                  name="pod"
                  value={shipmentDetails.pod}
                  onChange={handleShipmentChange}
                  placeholder="MUNDRA"
                />
              </div>

              <div>
                <Label htmlFor="noOfContainers">No of Containers</Label>
                <Input
                  id="noOfContainers"
                  name="noOfContainers"
                  value={shipmentDetails.noOfContainers}
                  onChange={handleShipmentChange}
                  placeholder="2"
                />
              </div>

              <div>
                <Label htmlFor="containerType">Container Type</Label>
                <select
                  id="containerType"
                  name="containerType"
                  value={shipmentDetails.containerType}
                  onChange={handleShipmentChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="20 FT">20 FT (Standard)</option>
                  <option value="40 FT">40 FT (Standard)</option>
                  <option value="40 HC">40 HC (High Cube)</option>
                  <option value="20 HC">20 HC (High Cube)</option>
                  <option value="45 HC">45 HC (High Cube)</option>
                  <option value="20 OT">20 OT (Open Top)</option>
                  <option value="40 OT">40 OT (Open Top)</option>
                  <option value="20 RF">20 RF (Refrigerated)</option>
                  <option value="40 RF">40 RF (Refrigerated)</option>
                  <option value="20 FR">20 FR (Flat Rack)</option>
                  <option value="40 FR">40 FR (Flat Rack)</option>
                  <option value="LCL">LCL (Less than Container Load)</option>
                  <option value="BULK">BULK</option>
                </select>
              </div>

              <div>
                <Label htmlFor="noOfPackages">No of Packages</Label>
                <Input
                  id="noOfPackages"
                  name="noOfPackages"
                  value={shipmentDetails.noOfPackages}
                  onChange={handleShipmentChange}
                  placeholder="1120"
                />
              </div>

              <div>
                <Label htmlFor="mbl">MBL</Label>
                <Input
                  id="mbl"
                  name="mbl"
                  value={shipmentDetails.mbl}
                  onChange={handleShipmentChange}
                  placeholder="MBL123456"
                />
              </div>

              <div>
                <Label htmlFor="hbl">HBL</Label>
                <Input
                  id="hbl"
                  name="hbl"
                  value={shipmentDetails.hbl}
                  onChange={handleShipmentChange}
                  placeholder="HBL789012"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Expenses</CardTitle>
              <Button type="button" onClick={addExpenseRow} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Expense Head</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Qty</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Currency</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Rate</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Exchange Rate</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-gray-700">Amount (₹)</th>
                    <th className="text-center py-2 px-2 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => {
                    const amount = parseFloat(expense.qty) * parseFloat(expense.rate) * parseFloat(expense.exchangeRate);
                    return (
                      <tr key={expense.id} className="border-b border-gray-100">
                        <td className="py-2 px-2">
                          <select
                            value={expense.expenseHeadId}
                            onChange={(e) => handleExpenseChange(expense.id, 'expenseHeadId', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select</option>
                            {expenseHeads.map(head => (
                              <option key={head.id} value={head.id}>
                                {head.name} ({head.gstRate}%{head.isAlwaysIGST ? ' - IGST' : ''})
                              </option>
                            ))}
                            <option value="add_new" className="font-semibold text-blue-600">
                              + Add New Expense Head
                            </option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            value={expense.qty}
                            onChange={(e) => handleExpenseChange(expense.id, 'qty', e.target.value)}
                            className="w-20 text-sm"
                            min="1"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={expense.currency}
                            onChange={(e) => handleExpenseChange(expense.id, 'currency', e.target.value)}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="INR">₹ INR</option>
                            <option value="USD">$ USD</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            value={expense.rate}
                            onChange={(e) => handleExpenseChange(expense.id, 'rate', e.target.value)}
                            className="w-28 text-sm"
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            value={expense.exchangeRate}
                            onChange={(e) => handleExpenseChange(expense.id, 'exchangeRate', e.target.value)}
                            className="w-24 text-sm"
                            step="0.01"
                            min="0"
                            placeholder={expense.currency === 'USD' ? '83.50' : '1'}
                          />
                        </td>
                        <td className="py-2 px-2 text-right text-sm font-semibold">
                          ₹{amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExpenseRow(expense.id)}
                            disabled={expenses.length === 1}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-semibold">₹{totals.subtotal}</span>
                </div>
                {invoiceData.withGst && parseFloat(totals.cgst) > 0 && (
                  <>
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-gray-600">CGST:</span>
                      <span className="text-sm">₹{totals.cgst}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-gray-600">SGST:</span>
                      <span className="text-sm">₹{totals.sgst}</span>
                    </div>
                  </>
                )}
                {invoiceData.withGst && parseFloat(totals.igst) > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-gray-600">IGST:</span>
                    <span className="text-sm">₹{totals.igst}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t-2 border-gray-300">
                  <span className="font-bold text-lg">Total:</span>
                  <span className="font-bold text-lg text-blue-600">₹{totals.total}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            {isEditMode ? 'Update Invoice' : 'Save Invoice'}
          </Button>
        </div>
      </form>

      {/* Add New Expense Head Dialog */}
      <Dialog open={isAddExpenseDialogOpen} onOpenChange={setIsAddExpenseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Expense Head</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddNewExpense} className="space-y-4">
            <div>
              <Label htmlFor="new-name">Expense Head Name <span className="text-red-500">*</span></Label>
              <Input
                id="new-name"
                name="name"
                value={newExpenseForm.name}
                onChange={handleNewExpenseInputChange}
                required
                placeholder="e.g., CUSTOM CLEARANCE CHARGES"
              />
            </div>
            
            <div>
              <Label htmlFor="new-hsnSac">HSN/SAC Code <span className="text-red-500">*</span></Label>
              <Input
                id="new-hsnSac"
                name="hsnSac"
                value={newExpenseForm.hsnSac}
                onChange={handleNewExpenseInputChange}
                required
                placeholder="e.g., 996511"
              />
            </div>

            <div>
              <Label htmlFor="new-gstRate">GST Rate (%) <span className="text-red-500">*</span></Label>
              <Input
                id="new-gstRate"
                name="gstRate"
                type="number"
                step="0.01"
                value={newExpenseForm.gstRate}
                onChange={handleNewExpenseInputChange}
                required
                placeholder="18"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="new-isAlwaysIGST"
                name="isAlwaysIGST"
                checked={newExpenseForm.isAlwaysIGST}
                onChange={handleNewExpenseInputChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="new-isAlwaysIGST" className="cursor-pointer">
                Always apply IGST (irrespective of state)
              </Label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Check this for import/export services
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddExpenseDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense Head
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceForm;
