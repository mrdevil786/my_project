import "./App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { FileText, Users, BarChart3, Package, DollarSign, FileCheck, Hash, Upload } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import Dashboard from "./pages/Dashboard";
import CustomerMaster from "./pages/CustomerMaster";
import ExpenseMaster from "./pages/ExpenseMaster";
import InvoiceForm from "./pages/InvoiceForm";
import InvoiceView from "./pages/InvoiceView";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Quotations from "./pages/Quotations";
import QuotationForm from "./pages/QuotationForm";
import QuotationView from "./pages/QuotationView";
import SeriesManagement from "./pages/SeriesManagement";
import ImportInvoices from "./pages/ImportInvoices";

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: BarChart3 },
    { path: "/customers", label: "Customers", icon: Users },
    { path: "/expenses", label: "Expense Master", icon: Package },
    { path: "/invoice/new", label: "New Invoice", icon: FileText },
    { path: "/quotations", label: "Quotations", icon: FileCheck },
    { path: "/payments", label: "Payments", icon: DollarSign },
    { path: "/series", label: "Series", icon: Hash },
    { path: "/import", label: "Import", icon: Upload },
    { path: "/reports", label: "Reports", icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600" />
              <h1 className="ml-3 text-xl font-bold text-gray-900">Invoice Manager</h1>
            </div>
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700 font-semibold"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600">
            © 2024 Invoice Manager - Broker Xpress and Logistics
          </p>
        </div>
      </footer>

      <Toaster position="top-right" />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<CustomerMaster />} />
            <Route path="/expenses" element={<ExpenseMaster />} />
            <Route path="/invoice/new" element={<InvoiceForm />} />
            <Route path="/invoice/edit/:id" element={<InvoiceForm />} />
            <Route path="/invoice/:id" element={<InvoiceView />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/quotations/new" element={<QuotationForm />} />
            <Route path="/quotations/:id" element={<QuotationView />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/series" element={<SeriesManagement />} />
            <Route path="/import" element={<ImportInvoices />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
