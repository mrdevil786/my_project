import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Loader2, FileText, FileSpreadsheet, Printer } from 'lucide-react';
import { quotationsAPI, customersAPI } from '../utils/api';
import { companyDetails } from '../utils/mockData';
import { toast } from 'sonner';

const QuotationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        setLoading(true);
        const quotationRes = await quotationsAPI.getById(id);
        const quotationData = quotationRes.data;
        setQuotation(quotationData);
        
        const customerRes = await customersAPI.getById(quotationData.customerId);
        setCustomer(customerRes.data);
      } catch (error) {
        console.error('Error fetching quotation:', error);
        toast.error('Failed to load quotation');
        navigate('/quotations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuotation();
  }, [id, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleConvertToInvoice = () => {
    // Store quotation data for conversion with items
    const invoiceData = {
      fromQuotation: true,
      customerId: quotation.customerId,
      voucherType: 'Tax Invoice',
      withGst: true,
      quotationItems: quotation.items.map(item => ({
        description: item.description,
        unit: item.unit,
        rate: item.rate === 'At actuals' ? '0' : item.rate,
        remarks: item.remarks
      }))
    };
    
    localStorage.setItem('convertQuotationData', JSON.stringify(invoiceData));
    toast.success('Converting quotation to invoice...');
    
    setTimeout(() => {
      navigate('/invoice/new');
    }, 500);
  };

  const exportToExcel = () => {
    let csvContent = `${quotation.title}\n\n`;
    csvContent += `Quotation No:,${quotation.quotationNo}\n`;
    csvContent += `Date:,${new Date(quotation.quotationDate).toLocaleDateString()}\n`;
    csvContent += `Customer:,${customer?.name || ''}\n`;
    csvContent += `Valid for:,${quotation.validityDays} days\n\n`;
    
    csvContent += `Description,Unit,Rate (INR),Remarks\n`;
    quotation.items.forEach(item => {
      csvContent += `"${item.description}","${item.unit}","${item.rate}","${item.remarks}"\n`;
    });
    
    csvContent += `\n${quotation.notes}\n\n`;
    csvContent += `DOCUMENTS REQUIRED:\n`;
    quotation.documents.forEach(doc => {
      csvContent += `"${doc.name}","${doc.remarks}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Quotation_${quotation.quotationNo}.csv`;
    link.click();
    toast.success('Quotation exported');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Quotation not found</p>
        <Button onClick={() => navigate('/quotations')} className="mt-4">
          Back to Quotations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex justify-between items-center print:hidden">
        <Button variant="outline" onClick={() => navigate('/quotations')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quotations
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={handleConvertToInvoice} className="bg-green-600 hover:bg-green-700 text-white">
            <FileText className="w-4 h-4 mr-2" />
            Convert to Invoice
          </Button>
        </div>
      </div>

      {/* Quotation Content */}
      <Card className="print-container">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-start gap-4">
              <img src="/assets/company-logo.jpg" alt="Company Logo" className="w-20 h-20 object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-blue-600">{companyDetails.name}</h1>
                <p className="text-sm text-gray-600 mt-2">{companyDetails.address}</p>
                <p className="text-sm text-gray-600">GSTIN: {companyDetails.gstin}</p>
                <p className="text-sm text-gray-600">Email: {companyDetails.email}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-900">QUOTATION</h2>
              <p className="text-sm text-gray-600 mt-2">Quotation No: <span className="font-semibold">{quotation.quotationNo}</span></p>
              <p className="text-sm text-gray-600">Date: <span className="font-semibold">{new Date(quotation.quotationDate).toLocaleDateString()}</span></p>
              <p className="text-sm text-gray-600">Valid for: <span className="font-semibold">{quotation.validityDays} days</span></p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">TO:</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-semibold text-gray-900">{customer?.name}</p>
              <p className="text-sm text-gray-600">{customer?.address}</p>
              <p className="text-sm text-gray-600">{customer?.state}</p>
              <p className="text-sm text-gray-600">GSTIN: {customer?.gstNo}</p>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-center text-gray-900 py-3 bg-blue-50 rounded">
              {quotation.title}
            </h2>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Sr.</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Description</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Unit</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Rate (INR)</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{index + 1}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{item.description}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">{item.unit}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">{item.rate}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{item.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {quotation.notes && (
            <div className="mb-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            </div>
          )}

          {/* Documents Required */}
          {quotation.documents && quotation.documents.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">DOCUMENTS REQUIRED:</h3>
              <div className="bg-gray-50 p-4 rounded">
                <ul className="list-disc list-inside space-y-1">
                  {quotation.documents.map((doc, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      <span className="font-medium">{doc.name}</span>
                      {doc.remarks && <span className="text-gray-600"> - {doc.remarks}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              For {companyDetails.name}
            </p>
            <div className="mt-8 text-right">
              <img src="/assets/seal-sign.png" alt="Seal & Signature" className="w-40 h-auto ml-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">Authorized Signatory</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotationView;
