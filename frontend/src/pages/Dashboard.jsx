import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, Users, TrendingUp, Plus, Eye } from 'lucide-react';
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [invoicesRes, customersRes] = await Promise.all([
          invoicesAPI.getAll(),
          customersAPI.getAll()
        ]);
        setInvoices(invoicesRes.data);
        setCustomers(customersRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const pendingAmount = invoices
    .filter(inv => inv.status === 'Pending')
    .reduce((sum, inv) => sum + inv.total, 0);
  const paidAmount = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to your invoicing dashboard</p>
        </div>
        <Link to="/invoice/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card 
              className="border-l-4 border-l-blue-600 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/reports')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
                <FileText className="w-5 h-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{invoices.length}</div>
                <p className="text-xs text-gray-500 mt-1">Click to view all</p>
              </CardContent>
            </Card>

            <Card 
              className="border-l-4 border-l-green-600 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/reports')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">₹{totalAmount.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">Click to view details</p>
              </CardContent>
            </Card>

            <Card 
              className="border-l-4 border-l-orange-600 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/reports')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
                <FileText className="w-5 h-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">₹{pendingAmount.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">Click to view pending</p>
              </CardContent>
            </Card>

            <Card 
              className="border-l-4 border-l-purple-600 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/customers')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Customers</CardTitle>
                <Users className="w-5 h-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{customers.length}</div>
                <p className="text-xs text-gray-500 mt-1">Click to manage customers</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Invoices */}
          <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Invoices</CardTitle>
            <Link to="/reports">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
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
                {invoices.slice(0, 5).map((invoice) => {
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
                        <Link to={`/invoice/${invoice.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No invoices found. Create your first invoice!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
