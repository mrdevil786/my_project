import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { DollarSign, Plus, Edit, Receipt } from 'lucide-react';
import { invoicesAPI, paymentsAPI, customersAPI } from '../utils/api';
import { toast } from 'sonner';

const Payments = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amountReceived: '',
    tdsAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesRes, customersRes, paymentsRes] = await Promise.all([
        invoicesAPI.getAll(),
        customersAPI.getAll(),
        paymentsAPI.getAll()
      ]);
      setInvoices(invoicesRes.data);
      setCustomers(customersRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({ ...prev, [name]: value }));
  };

  const openPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    
    // Calculate remaining balance
    const invoicePayments = payments.filter(p => p.invoiceId === invoice.id);
    const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amountReceived, 0);
    const remaining = invoice.total - totalPaid;
    
    setPaymentForm({
      amountReceived: remaining > 0 ? remaining.toFixed(2) : '0',
      tdsAmount: '0',
      paymentDate: new Date().toISOString().split('T')[0],
      remarks: ''
    });
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    const amountReceived = parseFloat(paymentForm.amountReceived) || 0;
    const tdsAmount = parseFloat(paymentForm.tdsAmount) || 0;
    
    if (amountReceived < 0 || tdsAmount < 0) {
      toast.error('Amount cannot be negative');
      return;
    }

    try {
      await paymentsAPI.create({
        invoiceId: selectedInvoice.id,
        amountReceived,
        tdsAmount,
        paymentDate: paymentForm.paymentDate,
        remarks: paymentForm.remarks
      });
      
      toast.success('Payment recorded successfully!');
      await fetchData();
      setIsPaymentDialogOpen(false);
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const getTotalPaid = (invoiceId) => {
    return payments
      .filter(p => p.invoiceId === invoiceId)
      .reduce((sum, p) => sum + p.amountReceived, 0);
  };

  const getTotalTDS = (invoiceId) => {
    return payments
      .filter(p => p.invoiceId === invoiceId)
      .reduce((sum, p) => sum + (p.tdsAmount || 0), 0);
  };

  const getPaymentStatus = (invoice) => {
    const paid = getTotalPaid(invoice.id);
    const balance = invoice.total - paid;
    
    if (balance <= 0) return { text: 'Paid', color: 'bg-green-100 text-green-800' };
    if (paid > 0) return { text: 'Partial', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Pending', color: 'bg-red-100 text-red-800' };
  };

  const calculateBalance = (invoice) => {
    const paid = getTotalPaid(invoice.id);
    return invoice.total - paid;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Tracking</h1>
          <p className="text-gray-600 mt-1">Record payments received against invoices</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Outstanding</CardTitle>
            <Receipt className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ₹{invoices.reduce((sum, inv) => sum + calculateBalance(inv), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Received</CardTitle>
            <DollarSign className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ₹{payments.reduce((sum, p) => sum + p.amountReceived, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total TDS</CardTitle>
            <Receipt className="w-5 h-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ₹{payments.reduce((sum, p) => sum + (p.tdsAmount || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Invoices</CardTitle>
            <Receipt className="w-5 h-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {invoices.filter(inv => calculateBalance(inv) > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invoice No</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount Paid</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">TDS Deducted</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Balance Due</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const customer = customers.find(c => c.id === invoice.customerId);
                  const totalPaid = getTotalPaid(invoice.id);
                  const totalTDS = getTotalTDS(invoice.id);
                  const balance = calculateBalance(invoice);
                  const status = getPaymentStatus(invoice);
                  
                  return (
                    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{invoice.invoiceNo}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{customer?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">₹{invoice.total.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm text-green-700 text-right">₹{totalPaid.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm text-orange-700 text-right">₹{totalTDS.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-red-700 text-right">₹{balance.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openPaymentDialog(invoice)}
                          disabled={balance <= 0}
                        >
                          <Plus className="w-4 h-4 text-blue-600" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No invoices found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Invoice:</span>
                    <span className="font-semibold ml-2">{selectedInvoice.invoiceNo}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-semibold ml-2">{customers.find(c => c.id === selectedInvoice.customerId)?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold ml-2">₹{selectedInvoice.total.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Balance Due:</span>
                    <span className="font-semibold ml-2 text-red-600">₹{calculateBalance(selectedInvoice).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="amountReceived">Amount Received <span className="text-red-500">*</span></Label>
                <Input
                  id="amountReceived"
                  name="amountReceived"
                  type="number"
                  step="0.01"
                  value={paymentForm.amountReceived}
                  onChange={handlePaymentInputChange}
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="tdsAmount">TDS Deducted</Label>
                <Input
                  id="tdsAmount"
                  name="tdsAmount"
                  type="number"
                  step="0.01"
                  value={paymentForm.tdsAmount}
                  onChange={handlePaymentInputChange}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Enter TDS amount if tax was deducted at source</p>
              </div>

              <div>
                <Label htmlFor="paymentDate">Payment Date <span className="text-red-500">*</span></Label>
                <Input
                  id="paymentDate"
                  name="paymentDate"
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={handlePaymentInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <textarea
                  id="remarks"
                  name="remarks"
                  value={paymentForm.remarks}
                  onChange={handlePaymentInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this payment..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
};

export default Payments;
