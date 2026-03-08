import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Eye, Download, Trash2, Search, Printer } from 'lucide-react';
import { invoicesAPI, customersAPI } from '../utils/api';
import { toast } from 'sonner';

// Helper function to format date as dd/mm/yyyy
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const Reports = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [expenseCustomerFilter, setExpenseCustomerFilter] = useState('');
  const [expenseDateFrom, setExpenseDateFrom] = useState('');
  const [expenseDateTo, setExpenseDateTo] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesRes, customersRes] = await Promise.all([
        invoicesAPI.getAll(),
        customersAPI.getAll()
      ]);
      setInvoices(invoicesRes.data);
      setCustomers(customersRes.data);
      setFilteredInvoices(invoicesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = [...invoices];

    if (searchTerm) {
      filtered = filtered.filter(inv => {
        const customer = customers.find(c => c.id === inv.customerId);
        return inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (customer && customer.name.toLowerCase().includes(searchTerm.toLowerCase()));
      });
    }

    if (dateFrom) {
      filtered = filtered.filter(inv => new Date(inv.invoiceDate) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter(inv => new Date(inv.invoiceDate) <= new Date(dateTo));
    }

    if (selectedCustomer) {
      filtered = filtered.filter(inv => inv.customerId === selectedCustomer);
    }

    setFilteredInvoices(filtered);
  }, [searchTerm, dateFrom, dateTo, selectedCustomer, invoices]);

  const handleDelete = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoicesAPI.delete(invoiceId);
        toast.success('Invoice deleted successfully');
        await fetchData();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.error('Failed to delete invoice');
      }
    }
  };

  const handleView = (invoiceId) => {
    window.location.href = `/invoice/${invoiceId}`;
  };

  const handleDownload = async (invoiceId, invoiceNo) => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/invoices/${invoiceId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoiceNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Feature coming soon!');
    }
  };

  const handlePrint = (invoiceId) => {
    // Open invoice in new window and print
    const printWindow = window.open(`/invoice/${invoiceId}`, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }
  };

  const calculateExpenseSummary = () => {
    const expenseMap = {};
    
    // Filter invoices based on date range and customer
    let filteredInvoices = [...invoices];
    
    if (expenseDateFrom) {
      filteredInvoices = filteredInvoices.filter(inv => new Date(inv.invoiceDate) >= new Date(expenseDateFrom));
    }
    
    if (expenseDateTo) {
      filteredInvoices = filteredInvoices.filter(inv => new Date(inv.invoiceDate) <= new Date(expenseDateTo));
    }
    
    if (expenseCustomerFilter) {
      filteredInvoices = filteredInvoices.filter(inv => inv.customerId === expenseCustomerFilter);
    }
    
    filteredInvoices.forEach(invoice => {
      invoice.expenses.forEach(expense => {
        const headName = expense.expenseName;
        if (!expenseMap[headName]) {
          expenseMap[headName] = {
            name: headName,
            hsnSac: expense.hsnSac,
            gstRate: expense.gstRate,
            count: 0,
            totalAmount: 0,
            customers: new Set()
          };
        }
        expenseMap[headName].count += 1;
        expenseMap[headName].totalAmount += expense.amount;
        const customer = customers.find(c => c.id === invoice.customerId);
        if (customer) {
          expenseMap[headName].customers.add(customer.name);
        }
      });
    });

    // Convert Set to array for customers
    return Object.values(expenseMap).map(expense => ({
      ...expense,
      customers: Array.from(expense.customers)
    }));
  };

  const calculatePartyWiseSummary = () => {
    const partyMap = {};
    
    invoices.forEach(invoice => {
      const customer = customers.find(c => c.id === invoice.customerId);
      const partyName = customer?.name || 'Unknown';
      if (!partyMap[partyName]) {
        partyMap[partyName] = {
          name: partyName,
          invoiceCount: 0,
          totalAmount: 0,
          pendingAmount: 0,
          expenses: {} // Add expense breakdown
        };
      }
      partyMap[partyName].invoiceCount += 1;
      partyMap[partyName].totalAmount += invoice.total;
      if (invoice.status === 'Pending') {
        partyMap[partyName].pendingAmount += invoice.total;
      }
      
      // Add expense breakdown for this party
      invoice.expenses.forEach(expense => {
        const expenseName = expense.expenseName;
        if (!partyMap[partyName].expenses[expenseName]) {
          partyMap[partyName].expenses[expenseName] = {
            name: expenseName,
            count: 0,
            totalAmount: 0
          };
        }
        partyMap[partyName].expenses[expenseName].count += 1;
        partyMap[partyName].expenses[expenseName].totalAmount += expense.amount;
      });
    });

    return Object.values(partyMap);
  };

  const expenseSummary = calculateExpenseSummary();

  const getFilteredPeriodText = () => {
    if (expenseDateFrom && expenseDateTo) {
      return `${formatDate(expenseDateFrom)} to ${formatDate(expenseDateTo)}`;
    } else if (expenseDateFrom) {
      return `From ${formatDate(expenseDateFrom)}`;
    } else if (expenseDateTo) {
      return `Until ${formatDate(expenseDateTo)}`;
    }
    return 'All Time';
  };

  // Tally Export Function
  const exportToTally = () => {
    // Create XML for Tally import
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<ENVELOPE>\n';
    xml += '  <HEADER>\n';
    xml += '    <TALLYREQUEST>Import Data</TALLYREQUEST>\n';
    xml += '  </HEADER>\n';
    xml += '  <BODY>\n';
    xml += '    <IMPORTDATA>\n';
    xml += '      <REQUESTDESC>\n';
    xml += '        <REPORTNAME>All Masters</REPORTNAME>\n';
    xml += '      </REQUESTDESC>\n';
    xml += '      <REQUESTDATA>\n';
    
    filteredInvoices.forEach(invoice => {
      const customer = customers.find(c => c.id === invoice.customerId);
      xml += '        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n';
      xml += '          <VOUCHER REMOTEID="" VCHKEY="" VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">\n';
      xml += `            <DATE>${invoice.invoiceDate.split('T')[0].replace(/-/g, '')}</DATE>\n`;
      xml += `            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>\n`;
      xml += `            <VOUCHERNUMBER>${invoice.invoiceNo}</VOUCHERNUMBER>\n`;
      xml += `            <PARTYLEDGERNAME>${customer?.name || 'Unknown'}</PARTYLEDGERNAME>\n`;
      xml += '            <ALLLEDGERENTRIES.LIST>\n';
      xml += `              <LEDGERNAME>${customer?.name || 'Unknown'}</LEDGERNAME>\n`;
      xml += `              <AMOUNT>-${invoice.total.toFixed(2)}</AMOUNT>\n`;
      xml += '            </ALLLEDGERENTRIES.LIST>\n';
      
      invoice.expenses.forEach(expense => {
        xml += '            <ALLLEDGERENTRIES.LIST>\n';
        xml += `              <LEDGERNAME>${expense.expenseName}</LEDGERNAME>\n`;
        xml += `              <AMOUNT>${expense.amount.toFixed(2)}</AMOUNT>\n`;
        xml += '            </ALLLEDGERENTRIES.LIST>\n';
      });
      
      if (invoice.cgst > 0) {
        xml += '            <ALLLEDGERENTRIES.LIST>\n';
        xml += '              <LEDGERNAME>CGST</LEDGERNAME>\n';
        xml += `              <AMOUNT>${invoice.cgst.toFixed(2)}</AMOUNT>\n`;
        xml += '            </ALLLEDGERENTRIES.LIST>\n';
        xml += '            <ALLLEDGERENTRIES.LIST>\n';
        xml += '              <LEDGERNAME>SGST</LEDGERNAME>\n';
        xml += `              <AMOUNT>${invoice.sgst.toFixed(2)}</AMOUNT>\n`;
        xml += '            </ALLLEDGERENTRIES.LIST>\n';
      }
      
      if (invoice.igst > 0) {
        xml += '            <ALLLEDGERENTRIES.LIST>\n';
        xml += '              <LEDGERNAME>IGST</LEDGERNAME>\n';
        xml += `              <AMOUNT>${invoice.igst.toFixed(2)}</AMOUNT>\n`;
        xml += '            </ALLLEDGERENTRIES.LIST>\n';
      }
      
      xml += '          </VOUCHER>\n';
      xml += '        </TALLYMESSAGE>\n';
    });
    
    xml += '      </REQUESTDATA>\n';
    xml += '    </IMPORTDATA>\n';
    xml += '  </BODY>\n';
    xml += '</ENVELOPE>\n';
    
    const blob = new Blob([xml], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Tally_Export_${new Date().toISOString().split('T')[0]}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    toast.success('Exported to Tally format');
  };

  // GST Report Calculation
  const calculateGSTReport = () => {
    const gstData = [];
    const periodFrom = dateFrom || expenseDateFrom;
    const periodTo = dateTo || expenseDateTo;
    
    let filteredForGST = [...invoices];
    if (periodFrom) {
      filteredForGST = filteredForGST.filter(inv => new Date(inv.invoiceDate) >= new Date(periodFrom));
    }
    if (periodTo) {
      filteredForGST = filteredForGST.filter(inv => new Date(inv.invoiceDate) <= new Date(periodTo));
    }
    
    filteredForGST.forEach(invoice => {
      const customer = customers.find(c => c.id === invoice.customerId);
      gstData.push({
        invoiceNo: invoice.invoiceNo,
        invoiceDate: invoice.invoiceDate,
        customerName: customer?.name || 'N/A',
        customerGSTIN: customer?.gstNo || 'N/A',
        voucherType: invoice.voucherType,
        taxableAmount: invoice.subtotal,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        igst: invoice.igst,
        totalTax: invoice.cgst + invoice.sgst + invoice.igst,
        totalAmount: invoice.total
      });
    });
    
    return gstData;
  };

  const gstReportData = calculateGSTReport();
  const totalTaxableAmount = gstReportData.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalCGST = gstReportData.reduce((sum, item) => sum + item.cgst, 0);
  const totalSGST = gstReportData.reduce((sum, item) => sum + item.sgst, 0);
  const totalIGST = gstReportData.reduce((sum, item) => sum + item.igst, 0);
  const totalGST = totalCGST + totalSGST + totalIGST;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">View and analyze your invoicing data</p>
      </div>

      <Tabs defaultValue="all-invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all-invoices">All Invoices</TabsTrigger>
          <TabsTrigger value="expense-report">Expense Report</TabsTrigger>
          <TabsTrigger value="gst-report">GST Report</TabsTrigger>
        </TabsList>

        {/* All Invoices Tab */}
        <TabsContent value="all-invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Invoice No or Customer"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="dateFrom">Date From</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="customer">Customer</Label>
                  <select
                    id="customer"
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Customers</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Invoices ({filteredInvoices.length})</CardTitle>
              <Button onClick={exportToTally} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export to Tally
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Voucher No</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => {
                      const customer = customers.find(c => c.id === invoice.customerId);
                      return (
                        <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{invoice.invoiceNo}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{formatDate(invoice.invoiceDate)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{customer?.name || 'N/A'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{invoice.voucherType}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">₹{invoice.total.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invoice.status === 'Paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleView(invoice.id)}
                              title="View Invoice"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handlePrint(invoice.id)}
                              title="Print Invoice"
                            >
                              <Printer className="w-4 h-4 text-purple-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDownload(invoice.id, invoice.invoiceNo)}
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(invoice.id)} 
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredInvoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No invoices found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Report Tab */}
        <TabsContent value="expense-report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="expense-date-from">Date From</Label>
                  <Input
                    id="expense-date-from"
                    type="date"
                    value={expenseDateFrom}
                    onChange={(e) => setExpenseDateFrom(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="expense-date-to">Date To</Label>
                  <Input
                    id="expense-date-to"
                    type="date"
                    value={expenseDateTo}
                    onChange={(e) => setExpenseDateTo(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="expense-customer">Customer</Label>
                  <select
                    id="expense-customer"
                    value={expenseCustomerFilter}
                    onChange={(e) => setExpenseCustomerFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Customers</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {(expenseDateFrom || expenseDateTo || expenseCustomerFilter) && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <strong>Period:</strong> {getFilteredPeriodText()}
                    {expenseCustomerFilter && (
                      <span className="ml-4">
                        <strong>Customer:</strong> {customers.find(c => c.id === expenseCustomerFilter)?.name}
                      </span>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setExpenseDateFrom('');
                      setExpenseDateTo('');
                      setExpenseCustomerFilter('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Head Summary</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Showing expenses billed during the selected period
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Expense Head</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">HSN/SAC</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">GST Rate</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Count</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseSummary.map((expense, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{expense.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{expense.hsnSac}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-center">{expense.gstRate}%</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-center">{expense.count}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">₹{expense.totalAmount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          <div className="flex flex-wrap gap-1">
                            {expense.customers.slice(0, 2).map((customer, idx) => (
                              <span key={idx} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {customer}
                              </span>
                            ))}
                            {expense.customers.length > 2 && (
                              <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                +{expense.customers.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {expenseSummary.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-500">
                          No expense data available for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {expenseSummary.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-gray-50">
                        <td className="py-3 px-4 text-sm font-bold text-gray-900" colSpan="3">TOTAL</td>
                        <td className="py-3 px-4 text-sm font-bold text-gray-900 text-center">
                          {expenseSummary.reduce((sum, exp) => sum + exp.count, 0)}
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-blue-600 text-right">
                          ₹{expenseSummary.reduce((sum, exp) => sum + exp.totalAmount, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Report Tab */}
        <TabsContent value="gst-report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GST Report Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gstDateFrom">Period From</Label>
                  <Input
                    id="gstDateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gstDateTo">Period To</Label>
                  <Input
                    id="gstDateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GST Summary - {dateFrom || dateTo ? `${dateFrom || 'Start'} to ${dateTo || 'End'}` : 'All Time'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Taxable Amount</p>
                  <p className="text-2xl font-bold text-blue-600">₹{totalTaxableAmount.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">CGST</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalCGST.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">SGST</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalSGST.toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">IGST</p>
                  <p className="text-2xl font-bold text-purple-600">₹{totalIGST.toFixed(2)}</p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <p className="font-semibold text-gray-900">Total GST Liability: ₹{totalGST.toFixed(2)}</p>
                <p className="text-sm text-gray-600 mt-1">Use this report for GSTR-1 and GSTR-3B filing</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice No</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">GSTIN</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Taxable Amt</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">CGST</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">SGST</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">IGST</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Tax</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstReportData.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{item.invoiceNo}</td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(item.invoiceDate)}</td>
                        <td className="py-3 px-4 text-gray-900">{item.customerName}</td>
                        <td className="py-3 px-4 text-gray-600">{item.customerGSTIN}</td>
                        <td className="py-3 px-4 text-right text-gray-900">₹{item.taxableAmount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-green-600">₹{item.cgst.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-green-600">₹{item.sgst.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-purple-600">₹{item.igst.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">₹{item.totalTax.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-blue-600">₹{item.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                    {gstReportData.length === 0 && (
                      <tr>
                        <td colSpan="10" className="text-center py-8 text-gray-500">
                          No invoices found for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {gstReportData.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-gray-50">
                        <td className="py-3 px-4 font-bold text-gray-900" colSpan="4">TOTAL</td>
                        <td className="py-3 px-4 text-right font-bold text-gray-900">₹{totalTaxableAmount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-green-600">₹{totalCGST.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-green-600">₹{totalSGST.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-purple-600">₹{totalIGST.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-orange-600">₹{totalGST.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600">₹{(totalTaxableAmount + totalGST).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
