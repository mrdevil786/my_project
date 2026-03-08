import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { quotationsAPI, customersAPI } from '../utils/api';
import { toast } from 'sonner';

const Quotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [quotationsRes, customersRes] = await Promise.all([
          quotationsAPI.getAll(),
          customersAPI.getAll()
        ]);
        setQuotations(quotationsRes.data);
        setCustomers(customersRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load quotations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

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
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-600 mt-1">Manage your customer quotations</p>
        </div>
        <Link to="/quotations/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Quotation
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quotations ({quotations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Quotation No</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Title</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quotation) => {
                  const customer = customers.find(c => c.id === quotation.customerId);
                  return (
                    <tr key={quotation.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{quotation.quotationNo}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{new Date(quotation.quotationDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{customer?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{quotation.title}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          quotation.status === 'Accepted' 
                            ? 'bg-green-100 text-green-800' 
                            : quotation.status === 'Sent'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {quotation.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Link to={`/quotations/${quotation.id}`}>
                            <Button variant="ghost" size="sm" title="View">
                              <Eye className="w-4 h-4 text-blue-600" />
                            </Button>
                          </Link>
                          <Link to={`/quotations/edit/${quotation.id}`}>
                            <Button variant="ghost" size="sm" title="Edit">
                              <Edit className="w-4 h-4 text-green-600" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Delete"
                            onClick={() => handleDelete(quotation.id)}
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
            {quotations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No quotations found. Create your first quotation!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Quotations;
