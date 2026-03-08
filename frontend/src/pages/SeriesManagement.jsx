import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Edit, Plus, Save, X } from 'lucide-react';
import { seriesAPI } from '../utils/api';
import { toast } from 'sonner';

const SeriesManagement = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState(null);
  const [formData, setFormData] = useState({
    voucherType: 'Tax Invoice',
    prefix: '',
    currentNumber: 1,
    suffix: ''
  });

  const voucherTypes = [
    'Tax Invoice',
    'Credit Note',
    'Debit Note',
    'Reimbursement Note',
    'Quotation'
  ];

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const response = await seriesAPI.getAll();
      setSeries(response.data);
    } catch (error) {
      console.error('Error fetching series:', error);
      toast.error('Failed to load series data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (seriesItem) => {
    setEditingSeries(seriesItem);
    setFormData({
      voucherType: seriesItem.voucherType,
      prefix: seriesItem.prefix,
      currentNumber: seriesItem.currentNumber,
      suffix: seriesItem.suffix || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleAdd = () => {
    setFormData({
      voucherType: 'Tax Invoice',
      prefix: 'INV-',
      currentNumber: 1,
      suffix: ''
    });
    setIsAddDialogOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'currentNumber' ? parseInt(value) || 0 : value
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    
    try {
      await seriesAPI.update(editingSeries.id, {
        prefix: formData.prefix,
        currentNumber: formData.currentNumber,
        suffix: formData.suffix
      });
      
      toast.success('Series updated successfully');
      setIsEditDialogOpen(false);
      fetchSeries();
    } catch (error) {
      console.error('Error updating series:', error);
      toast.error('Failed to update series');
    }
  };

  const handleAddSeries = async (e) => {
    e.preventDefault();
    
    if (!formData.prefix) {
      toast.error('Please enter a prefix');
      return;
    }

    try {
      await seriesAPI.create(formData);
      toast.success('Series created successfully');
      setIsAddDialogOpen(false);
      fetchSeries();
    } catch (error) {
      console.error('Error creating series:', error);
      toast.error(error.response?.data?.detail || 'Failed to create series');
    }
  };

  const getNextNumber = (seriesItem) => {
    return `${seriesItem.prefix}${seriesItem.currentNumber}${seriesItem.suffix || ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Series Management</h1>
          <p className="text-gray-600 mt-1">Manage voucher number series and prefixes</p>
        </div>
        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add New Series
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>What is Series Management?</strong> Configure how your voucher numbers are generated. 
            Each voucher type (Tax Invoice, Credit Note, etc.) can have its own prefix, starting number, and suffix. 
            For example: "INV-21" uses prefix "INV-" and number "21".
          </p>
        </CardContent>
      </Card>

      {/* Series List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Series Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : series.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No series configured yet. Click "Add New Series" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Voucher Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Prefix</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Current Number</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Suffix</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Next Voucher No</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((seriesItem) => (
                    <tr key={seriesItem.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{seriesItem.voucherType}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 font-mono">{seriesItem.prefix}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 font-semibold">{seriesItem.currentNumber}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 font-mono">{seriesItem.suffix || '-'}</td>
                      <td className="py-3 px-4 text-sm font-bold text-blue-600">{getNextNumber(seriesItem)}</td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(seriesItem)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Series - {editingSeries?.voucherType}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <Label htmlFor="edit-prefix">Prefix <span className="text-red-500">*</span></Label>
              <Input
                id="edit-prefix"
                name="prefix"
                value={formData.prefix}
                onChange={handleInputChange}
                required
                placeholder="e.g., INV-, CN-, Q-"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">The text that appears before the number</p>
            </div>

            <div>
              <Label htmlFor="edit-currentNumber">Current Number <span className="text-red-500">*</span></Label>
              <Input
                id="edit-currentNumber"
                name="currentNumber"
                type="number"
                value={formData.currentNumber}
                onChange={handleInputChange}
                required
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">The next voucher will use this number</p>
            </div>

            <div>
              <Label htmlFor="edit-suffix">Suffix (Optional)</Label>
              <Input
                id="edit-suffix"
                name="suffix"
                value={formData.suffix}
                onChange={handleInputChange}
                placeholder="e.g., -2024"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Optional text that appears after the number</p>
            </div>

            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Preview:</strong> Next voucher number will be{' '}
                <span className="font-bold text-blue-600">
                  {formData.prefix}{formData.currentNumber}{formData.suffix}
                </span>
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Series</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSeries} className="space-y-4">
            <div>
              <Label htmlFor="add-voucherType">Voucher Type <span className="text-red-500">*</span></Label>
              <select
                id="add-voucherType"
                name="voucherType"
                value={formData.voucherType}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {voucherTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="add-prefix">Prefix <span className="text-red-500">*</span></Label>
              <Input
                id="add-prefix"
                name="prefix"
                value={formData.prefix}
                onChange={handleInputChange}
                required
                placeholder="e.g., INV-, CN-, Q-"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">The text that appears before the number</p>
            </div>

            <div>
              <Label htmlFor="add-currentNumber">Starting Number <span className="text-red-500">*</span></Label>
              <Input
                id="add-currentNumber"
                name="currentNumber"
                type="number"
                value={formData.currentNumber}
                onChange={handleInputChange}
                required
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">The first voucher will use this number</p>
            </div>

            <div>
              <Label htmlFor="add-suffix">Suffix (Optional)</Label>
              <Input
                id="add-suffix"
                name="suffix"
                value={formData.suffix}
                onChange={handleInputChange}
                placeholder="e.g., -2024"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Optional text that appears after the number</p>
            </div>

            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Preview:</strong> First voucher number will be{' '}
                <span className="font-bold text-blue-600">
                  {formData.prefix}{formData.currentNumber}{formData.suffix}
                </span>
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Series
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeriesManagement;
