import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Plus, Trash2, Save, FileSpreadsheet } from 'lucide-react';
import { customersAPI, quotationsAPI, seriesAPI } from '../utils/api';
import { toast } from 'sonner';

const QuotationForm = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [quotationData, setQuotationData] = useState({
    quotationNo: '',
    quotationDate: new Date().toISOString().split('T')[0],
    customerId: '',
    title: 'QUOTATION FOR CUSTOMS CLEARANCE',
    validityDays: 30,
    notes: 'ALL ABOVE CHARGES ARE SUBJECT TO GST AS APPLICABLE'
  });

  const [items, setItems] = useState([
    { id: Date.now(), description: 'AGENCY CHARGES', unit: 'Per Container', rate: '', remarks: '' }
  ]);

  const [documents, setDocuments] = useState([
    { name: 'Commercial Invoice', remarks: '' },
    { name: 'Packing List', remarks: '' },
    { name: 'Bill of Lading / Airway Bill', remarks: '' }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const customersRes = await customersAPI.getAll();
        setCustomers(customersRes.data);
        
        // Auto-fetch next quotation number
        try {
          const seriesRes = await seriesAPI.getNextNumber('Quotation');
          setQuotationData(prev => ({
            ...prev,
            quotationNo: seriesRes.data.nextNumber
          }));
        } catch (error) {
          console.error('Error fetching series:', error);
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

  const handleQuotationChange = (e) => {
    const { name, value } = e.target;
    setQuotationData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addItem = () => {
    setItems(prev => [...prev, { 
      id: Date.now(), 
      description: '', 
      unit: 'Per Container', 
      rate: '', 
      remarks: '' 
    }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleDocumentChange = (index, field, value) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  const addDocument = () => {
    setDocuments(prev => [...prev, { name: '', remarks: '' }]);
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!quotationData.customerId) {
      toast.error('Please select a customer');
      return;
    }

    if (!quotationData.quotationNo) {
      toast.error('Please enter quotation number');
      return;
    }

    try {
      const newQuotation = {
        ...quotationData,
        items: items.map(({ id, ...item }) => item),
        documents,
        status: 'Draft'
      };

      await quotationsAPI.create(newQuotation);
      toast.success('Quotation created successfully');
      navigate('/quotations');
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast.error('Failed to create quotation');
    }
  };

  const exportToExcel = () => {
    // Create CSV content
    let csvContent = `${quotationData.title}\n\n`;
    csvContent += `Quotation No:,${quotationData.quotationNo}\n`;
    csvContent += `Date:,${new Date(quotationData.quotationDate).toLocaleDateString()}\n`;
    const customer = customers.find(c => c.id === quotationData.customerId);
    csvContent += `Customer:,${customer?.name || ''}\n\n`;
    
    csvContent += `Description,Unit,Rate (INR),Remarks\n`;
    items.forEach(item => {
      csvContent += `"${item.description}","${item.unit}","${item.rate}","${item.remarks}"\n`;
    });
    
    csvContent += `\n${quotationData.notes}\n\n`;
    csvContent += `DOCUMENTS REQUIRED:\n`;
    documents.forEach(doc => {
      csvContent += `"${doc.name}","${doc.remarks}"\n`;
    });

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Quotation_${quotationData.quotationNo}.csv`;
    link.click();
    toast.success('Quotation exported to Excel');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Quotation</h1>
          <p className="text-gray-600 mt-1">Create a customs clearance quotation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quotation Details */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quotationNo">Quotation No <span className="text-red-500">*</span></Label>
              <Input
                id="quotationNo"
                name="quotationNo"
                value={quotationData.quotationNo}
                onChange={handleQuotationChange}
                placeholder="Q-001"
                required
              />
            </div>

            <div>
              <Label htmlFor="quotationDate">Date <span className="text-red-500">*</span></Label>
              <Input
                id="quotationDate"
                name="quotationDate"
                type="date"
                value={quotationData.quotationDate}
                onChange={handleQuotationChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="customerId">Customer <span className="text-red-500">*</span></Label>
              <select
                id="customerId"
                name="customerId"
                value={quotationData.customerId}
                onChange={handleQuotationChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="validityDays">Validity (Days)</Label>
              <Input
                id="validityDays"
                name="validityDays"
                type="number"
                value={quotationData.validityDays}
                onChange={handleQuotationChange}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="title">Quotation Title</Label>
              <Input
                id="title"
                name="title"
                value={quotationData.title}
                onChange={handleQuotationChange}
                placeholder="QUOTATION FOR CUSTOMS CLEARANCE"
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Quotation Items</CardTitle>
            <Button type="button" onClick={addItem} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg relative">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="absolute top-2 right-2"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="Service description"
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Per Container">Per Container</option>
                        <option value="Per BL">Per BL</option>
                        <option value="Per Shipping Bill">Per Shipping Bill</option>
                        <option value="Lump Sum">Lump Sum</option>
                        <option value="At actuals">At actuals</option>
                      </select>
                    </div>
                    <div>
                      <Label>Rate (INR)</Label>
                      <Input
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                        placeholder="Enter amount or 'At actuals'"
                      />
                    </div>
                    <div>
                      <Label>Remarks</Label>
                      <Input
                        value={item.remarks}
                        onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Required Documents</CardTitle>
            <Button type="button" onClick={addDocument} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <div className="flex-1">
                    <Input
                      value={doc.name}
                      onChange={(e) => handleDocumentChange(index, 'name', e.target.value)}
                      placeholder="Document name"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={doc.remarks}
                      onChange={(e) => handleDocumentChange(index, 'remarks', e.target.value)}
                      placeholder="Remarks"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes & Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              name="notes"
              value={quotationData.notes}
              onChange={handleQuotationChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter terms and conditions, notes, disclaimers..."
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/quotations')}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={exportToExcel} disabled={!quotationData.customerId}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            Save Quotation
          </Button>
        </div>
      </form>
    </div>
  );
};

export default QuotationForm;
