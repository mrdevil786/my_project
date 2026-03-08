import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { expensesAPI } from '../utils/api';
import { toast } from 'sonner';

const ExpenseMaster = () => {
  const [expenseHeads, setExpenseHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    hsnSac: '',
    gstRate: 18,
    isAlwaysIGST: false
  });

  const fetchExpenseHeads = async () => {
    try {
      setLoading(true);
      const response = await expensesAPI.getAll();
      setExpenseHeads(response.data);
    } catch (error) {
      console.error('Error fetching expense heads:', error);
      toast.error('Failed to load expense heads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseHeads();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.hsnSac) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        gstRate: parseFloat(formData.gstRate)
      };

      if (editingExpense) {
        await expensesAPI.update(editingExpense.id, dataToSend);
        toast.success('Expense head updated successfully');
      } else {
        await expensesAPI.create(dataToSend);
        toast.success('Expense head added successfully');
      }

      await fetchExpenseHeads();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving expense head:', error);
      toast.error('Failed to save expense head');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      name: expense.name,
      hsnSac: expense.hsnSac,
      gstRate: expense.gstRate,
      isAlwaysIGST: expense.isAlwaysIGST || false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense head?')) {
      try {
        await expensesAPI.delete(expenseId);
        toast.success('Expense head deleted successfully');
        await fetchExpenseHeads();
      } catch (error) {
        console.error('Error deleting expense head:', error);
        toast.error('Failed to delete expense head');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      hsnSac: '',
      gstRate: 18,
      isAlwaysIGST: false
    });
    setEditingExpense(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Master</h1>
          <p className="text-gray-600 mt-1">Manage your expense heads and GST rates</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense Head
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Edit Expense Head' : 'Add New Expense Head'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Expense Head Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., AGENCY CHARGES"
                />
              </div>
              
              <div>
                <Label htmlFor="hsnSac">HSN/SAC Code <span className="text-red-500">*</span></Label>
                <Input
                  id="hsnSac"
                  name="hsnSac"
                  value={formData.hsnSac}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 996511"
                />
              </div>

              <div>
                <Label htmlFor="gstRate">GST Rate (%) <span className="text-red-500">*</span></Label>
                <Input
                  id="gstRate"
                  name="gstRate"
                  type="number"
                  step="0.01"
                  value={formData.gstRate}
                  onChange={handleInputChange}
                  required
                  placeholder="18"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isAlwaysIGST"
                  name="isAlwaysIGST"
                  checked={formData.isAlwaysIGST}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="isAlwaysIGST" className="cursor-pointer">
                  Always apply IGST (irrespective of state)
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Check this for import/export services like Ocean Freight
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  {editingExpense ? 'Update' : 'Add'} Expense Head
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expense Heads ({expenseHeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Expense Head</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">HSN/SAC Code</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">GST Rate</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Tax Type</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenseHeads.map((expense) => (
                  <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{expense.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{expense.hsnSac}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-center">{expense.gstRate}%</td>
                    <td className="py-3 px-4 text-center">
                      {expense.isAlwaysIGST ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          Always IGST
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          State-based
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenseHeads.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No expense heads found. Add your first expense head!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseMaster;
