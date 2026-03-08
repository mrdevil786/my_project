import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Printer, Mail, MessageCircle, ArrowLeft, Loader2, Copy, Edit } from 'lucide-react';
import { companyDetails, bankDetails, termsAndConditions } from '../utils/mockData';
import { invoicesAPI, customersAPI } from '../utils/api';
import { toast } from 'sonner';

// Helper function to format date as dd/mm/yyyy
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const invoiceRes = await invoicesAPI.getById(id);
        const invoiceData = invoiceRes.data;
        setInvoice(invoiceData);
        
        // Fetch customer details
        const customerRes = await customersAPI.getById(invoiceData.customerId);
        setCustomer(customerRes.data);
        
        setEmailData(prev => ({
          ...prev,
          to: customerRes.data.email || '',
          subject: `${invoiceData.voucherType} ${invoiceData.invoiceNo} from ${companyDetails.name}`,
          message: `Dear ${customerRes.data.name},\n\nPlease find attached your ${invoiceData.voucherType.toLowerCase()} ${invoiceData.invoiceNo} dated ${formatDate(invoiceData.invoiceDate)}.\n\nTotal Amount: ₹${invoiceData.total.toFixed(2)}\n\nThank you for your business!\n\nBest regards,\n${companyDetails.name}`
        }));
      } catch (error) {
        console.error('Error fetching invoice:', error);
        toast.error('Failed to load invoice');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoice();
  }, [id, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/invoices/${id}/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.invoiceNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleEmailSend = async () => {
    if (!emailData.to) {
      toast.error('Please enter recipient email address');
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/send-invoice-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          to: emailData.to,
          subject: emailData.subject,
          message: emailData.message,
          invoiceData: invoice
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      toast.success('Invoice sent successfully via email!');
      setIsEmailDialogOpen(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleWhatsAppSend = () => {
    const phone = customer?.phone?.replace(/[^0-9]/g, '') || '';
    if (!phone) {
      toast.error('Customer phone number not available');
      return;
    }

    const message = `Hello ${customer?.name},%0A%0AYour ${invoice.voucherType.toLowerCase()} ${invoice.invoiceNo} is ready.%0A%0AAmount: ₹${invoice.total.toFixed(2)}%0A%0AThank you for your business!%0A%0A${companyDetails.name}`;
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDuplicateInvoice = () => {
    // Store invoice data for duplication in localStorage
    const duplicateData = {
      customerId: invoice.customerId,
      voucherType: invoice.voucherType,
      withGst: invoice.withGst,
      expenses: invoice.expenses.map(exp => ({
        expenseHeadId: exp.expenseHeadId,
        qty: exp.qty,
        rate: exp.rate,
        currency: exp.currency || 'INR',
        exchangeRate: exp.exchangeRate
      }))
    };
    
    localStorage.setItem('duplicateInvoiceData', JSON.stringify(duplicateData));
    toast.success('Invoice data copied! Redirecting to create new invoice...');
    
    // Navigate to invoice creation form
    setTimeout(() => {
      navigate('/invoice/new');
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Invoice not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Action Buttons - Hidden on print */}
      <div className="no-print mb-6 flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate('/reports')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Reports
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/invoice/edit/${invoice.id}`)} className="bg-blue-50 hover:bg-blue-100 border-blue-200">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDuplicateInvoice} className="bg-purple-50 hover:bg-purple-100 border-purple-200">
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={() => setIsEmailDialogOpen(true)}>
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" onClick={handleWhatsAppSend}>
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Invoice Content - Printable */}
      <Card className="print-content max-w-4xl mx-auto shadow-lg">
        <CardContent className="p-8">
          {/* Header */}
          <div className="border-b-4 border-blue-600 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                <img src="/assets/company-logo.jpg" alt="Company Logo" className="w-24 h-24 object-contain border-2 border-gray-200 rounded-lg p-1" />
                <div>
                  <h1 className="text-3xl font-bold text-blue-700 mb-2">{companyDetails.name}</h1>
                  <p className="text-sm text-gray-700 leading-relaxed max-w-md">{companyDetails.address}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-700"><span className="font-semibold">GSTIN:</span> {companyDetails.gstin}</p>
                    <p className="text-sm text-gray-700"><span className="font-semibold">Email:</span> {companyDetails.email}</p>
                    <p className="text-sm text-gray-700"><span className="font-semibold">Phone:</span> {companyDetails.phone}</p>
                  </div>
                </div>
              </div>
              <div className="text-right bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <h2 className="text-2xl font-bold text-blue-900 mb-3">{invoice.voucherType}</h2>
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Voucher No:</span> 
                    <span className="ml-2 text-blue-600 font-bold">{invoice.invoiceNo}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Date:</span> 
                    <span className="ml-2 font-semibold">{formatDate(invoice.invoiceDate)}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide border-b pb-2">Bill To:</h3>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-lg border border-gray-200">
              {customer?.name && <p className="font-bold text-lg text-gray-900 mb-2">{customer.name}</p>}
              {customer?.address && <p className="text-sm text-gray-700 mb-1">{customer.address}</p>}
              {customer?.state && <p className="text-sm text-gray-700 mb-3">{customer.state}</p>}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-300">
                {customer?.gstNo && (
                  <p className="text-sm text-gray-700"><span className="font-semibold">GSTIN:</span> {customer.gstNo}</p>
                )}
                {customer?.panNo && (
                  <p className="text-sm text-gray-700"><span className="font-semibold">PAN:</span> {customer.panNo}</p>
                )}
                {customer?.iecNo && (
                  <p className="text-sm text-gray-700"><span className="font-semibold">IEC:</span> {customer.iecNo}</p>
                )}
                {customer?.phone && (
                  <p className="text-sm text-gray-700"><span className="font-semibold">Phone:</span> {customer.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Shipment Details - Only show if at least one field has data */}
          {invoice.shipmentDetails && (
            invoice.shipmentDetails.beNo || 
            invoice.shipmentDetails.beDate || 
            invoice.shipmentDetails.pol || 
            invoice.shipmentDetails.pod || 
            invoice.shipmentDetails.noOfContainers || 
            invoice.shipmentDetails.noOfPackages || 
            invoice.shipmentDetails.mbl || 
            invoice.shipmentDetails.hbl
          ) && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide border-b pb-2">Shipment Details:</h3>
              <div className="bg-blue-50 p-5 rounded-lg border border-blue-200 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div className="space-y-2">
                  {invoice.shipmentDetails.beNo && (
                    <p className="text-gray-700"><span className="font-semibold">BE/SB No:</span> <span className="ml-2">{invoice.shipmentDetails.beNo}</span></p>
                  )}
                  {invoice.shipmentDetails.beDate && (
                    <p className="text-gray-700"><span className="font-semibold">BE/SB Date:</span> <span className="ml-2">{formatDate(invoice.shipmentDetails.beDate)}</span></p>
                  )}
                  {invoice.shipmentDetails.pol && (
                    <p className="text-gray-700"><span className="font-semibold">Port of Loading:</span> <span className="ml-2">{invoice.shipmentDetails.pol}</span></p>
                  )}
                  {invoice.shipmentDetails.pod && (
                    <p className="text-gray-700"><span className="font-semibold">Port of Discharge:</span> <span className="ml-2">{invoice.shipmentDetails.pod}</span></p>
                  )}
                </div>
                <div className="space-y-2">
                  {invoice.shipmentDetails.noOfContainers && (
                    <p className="text-gray-700"><span className="font-semibold">Containers:</span> <span className="ml-2">{invoice.shipmentDetails.noOfContainers} x {invoice.shipmentDetails.containerType}</span></p>
                  )}
                  {invoice.shipmentDetails.noOfPackages && (
                    <p className="text-gray-700"><span className="font-semibold">Packages:</span> <span className="ml-2">{invoice.shipmentDetails.noOfPackages}</span></p>
                  )}
                  {invoice.shipmentDetails.mbl && (
                    <p className="text-gray-700"><span className="font-semibold">MBL:</span> <span className="ml-2">{invoice.shipmentDetails.mbl}</span></p>
                  )}
                  {invoice.shipmentDetails.hbl && (
                    <p className="text-gray-700"><span className="font-semibold">HBL:</span> <span className="ml-2">{invoice.shipmentDetails.hbl}</span></p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Expense Table */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">Particulars:</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-gray-300">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                  <tr>
                    <th className="border border-gray-300 px-3 py-3 text-left text-sm font-bold text-white">Description</th>
                    <th className="border border-gray-300 px-3 py-3 text-center text-sm font-bold text-white">HSN/SAC</th>
                    <th className="border border-gray-300 px-3 py-3 text-center text-sm font-bold text-white">Qty</th>
                    <th className="border border-gray-300 px-3 py-3 text-right text-sm font-bold text-white">Rate</th>
                    <th className="border border-gray-300 px-3 py-3 text-right text-sm font-bold text-white">Amount</th>
                    <th className="border border-gray-300 px-3 py-3 text-center text-sm font-bold text-white">GST %</th>
                    <th className="border border-gray-300 px-3 py-3 text-right text-sm font-bold text-white">Tax Amount</th>
                    <th className="border border-gray-300 px-3 py-3 text-right text-sm font-bold text-white">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {invoice.expenses.map((expense, index) => {
                    const taxAmount = invoice.withGst ? (expense.amount * expense.gstRate) / 100 : 0;
                    const netAmount = expense.amount + taxAmount;
                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="border border-gray-300 px-3 py-3 text-sm font-medium text-gray-900">{expense.expenseName}</td>
                        <td className="border border-gray-300 px-3 py-3 text-center text-sm text-gray-700">{expense.hsnSac}</td>
                        <td className="border border-gray-300 px-3 py-3 text-center text-sm text-gray-700">{expense.qty}</td>
                        <td className="border border-gray-300 px-3 py-3 text-right text-sm text-gray-700">
                          {expense.currency === 'USD' ? '$' : '₹'}{expense.rate.toFixed(2)}
                          {expense.currency === 'USD' && expense.exchangeRate > 1 && (
                            <span className="text-xs text-gray-500 block">(@₹{expense.exchangeRate})</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-3 py-3 text-right text-sm font-semibold text-gray-900">₹{expense.amount.toFixed(2)}</td>
                        <td className="border border-gray-300 px-3 py-3 text-center text-sm text-gray-700">{expense.gstRate}%</td>
                        <td className="border border-gray-300 px-3 py-3 text-right text-sm text-gray-700">₹{taxAmount.toFixed(2)}</td>
                        <td className="border border-gray-300 px-3 py-3 text-right text-sm font-bold text-blue-600">₹{netAmount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-96 bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg border-2 border-blue-300">
              <div className="flex justify-between py-2 border-b border-blue-300">
                <span className="text-sm font-semibold text-gray-800">Subtotal:</span>
                <span className="text-sm font-bold text-gray-900">₹{invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.withGst && invoice.cgst > 0 && (
                <>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-gray-700">CGST:</span>
                    <span className="text-sm text-gray-700">₹{invoice.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-gray-700">SGST:</span>
                    <span className="text-sm text-gray-700">₹{invoice.sgst.toFixed(2)}</span>
                  </div>
                </>
              )}
              {invoice.withGst && invoice.igst > 0 && (
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-700">IGST:</span>
                  <span className="text-sm text-gray-700">₹{invoice.igst.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-blue-400 mt-2 bg-blue-600 -mx-5 px-5 rounded-b-lg">
                <span className="font-bold text-lg text-white">Total Amount:</span>
                <span className="font-bold text-xl text-white">₹{invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="mb-6 bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg border-2 border-green-300">
            <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">Bank Details:</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p className="text-gray-700"><span className="font-semibold">Bank Name:</span> <span className="ml-2">{bankDetails.bankName}</span></p>
              <p className="text-gray-700"><span className="font-semibold">Account Name:</span> <span className="ml-2">{bankDetails.accountName}</span></p>
              <p className="text-gray-700"><span className="font-semibold">Account Number:</span> <span className="ml-2 font-mono">{bankDetails.accountNumber}</span></p>
              <p className="text-gray-700"><span className="font-semibold">IFSC Code:</span> <span className="ml-2 font-mono">{bankDetails.ifscCode}</span></p>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="mb-6 bg-gray-50 p-5 rounded-lg border border-gray-300">
            <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">Terms and Conditions:</h3>
            <ol className="text-xs text-gray-700 space-y-1.5 leading-relaxed">
              {termsAndConditions.map((term, index) => (
                <li key={index}><span className="font-semibold">{index + 1}.</span> {term}</li>
              ))}
            </ol>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end border-t-2 border-gray-300 pt-6 mt-8">
            <div>
              <p className="text-sm text-gray-700 font-semibold">Thank you for your business!</p>
              <p className="text-xs text-gray-600 mt-1">For any queries, please contact us.</p>
            </div>
            <div className="text-right">
              <img src="/assets/seal-sign.png" alt="Seal & Signature" className="w-48 h-auto ml-auto mb-3 border border-gray-200 rounded p-2 bg-white" />
              <p className="text-sm font-bold text-gray-900">Authorized Signatory</p>
              <p className="text-xs text-blue-600 mt-1 font-semibold">{companyDetails.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Invoice via Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-to">To <span className="text-red-500">*</span></Label>
              <Input
                id="email-to"
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                placeholder="customer@example.com"
              />
            </div>

            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="email-message">Message</Label>
              <textarea
                id="email-message"
                value={emailData.message}
                onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleEmailSend} 
                disabled={isSendingEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceView;
