import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Customers API
export const customersAPI = {
  getAll: () => api.get('/customers'),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Expense Heads API
export const expensesAPI = {
  getAll: () => api.get('/expenses'),
  getById: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Invoices API
export const invoicesAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.customerId) params.append('customer_id', filters.customerId);
    if (filters.status) params.append('status', filters.status);
    return api.get(`/invoices?${params.toString()}`);
  },
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
};

// Payments API
export const paymentsAPI = {
  getAll: (invoiceId = null) => {
    const url = invoiceId ? `/payments?invoice_id=${invoiceId}` : '/payments';
    return api.get(url);
  },
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
};

// Quotations API
export const quotationsAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.customerId) params.append('customer_id', filters.customerId);
    if (filters.status) params.append('status', filters.status);
    return api.get(`/quotations?${params.toString()}`);
  },
  getById: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  update: (id, data) => api.put(`/quotations/${id}`, data),
  delete: (id) => api.delete(`/quotations/${id}`),
};

// Series API
export const seriesAPI = {
  getAll: () => api.get('/series'),
  getByVoucherType: (voucherType) => api.get(`/series/voucher/${voucherType}`),
  preview: (voucherType) => api.get(`/series/preview/${voucherType}`),
  getNextNumber: (voucherType) => api.post(`/series/next/${voucherType}`),
  create: (data) => api.post('/series', data),
  update: (id, data) => api.put(`/series/${id}`, data),
};

// PDF Extraction API
export const extractShipmentDetails = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/extract-shipment-details', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export default api;
