import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const ImportInvoices = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState([]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setResults([]); // Clear previous results
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );
    setFiles(droppedFiles);
    setResults([]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (files.length === 0) {
      toast.error('Please select PDF files to import');
      return;
    }

    setImporting(true);
    const importResults = [];

    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
      
      // Process each file
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await axios.post(`${API_URL}/import-invoices`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          if (response.data.success) {
            importResults.push({
              filename: file.name,
              status: 'success',
              message: response.data.message,
              invoiceNo: response.data.invoiceNo
            });
          } else {
            importResults.push({
              filename: file.name,
              status: 'error',
              message: response.data.message || 'Import failed'
            });
          }
        } catch (error) {
          console.error(`Error importing ${file.name}:`, error);
          importResults.push({
            filename: file.name,
            status: 'error',
            message: error.response?.data?.message || error.message || 'Failed to import'
          });
        }
      }

      setResults(importResults);
      
      const successCount = importResults.filter(r => r.status === 'success').length;
      const failCount = importResults.filter(r => r.status === 'error').length;
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} invoice(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to import ${failCount} invoice(s)`);
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error('An error occurred during import');
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setResults([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Historical Invoices</h1>
          <p className="text-gray-600 mt-1">
            Upload PDF invoices to automatically import them into the system
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Select Invoice PDFs</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => document.getElementById('fileInput').click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop PDF files here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports multiple files. Only PDF format is accepted.
            </p>
            <input
              id="fileInput"
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Selected Files ({files.length})
                </h3>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  Clear All
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="flex-1 text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {files.length > 0 && (
            <div className="mt-6 flex gap-3">
              <Button
                onClick={handleImport}
                disabled={importing}
                className="flex-1"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {files.length} Invoice{files.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    result.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  {result.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{result.filename}</p>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    {result.invoiceNo && (
                      <p className="text-xs text-green-700 mt-1">
                        Invoice No: {result.invoiceNo}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-6 flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Import Summary</span>
              </div>
              <div className="flex gap-6 text-sm">
                <span className="text-green-700">
                  Success: {results.filter(r => r.status === 'success').length}
                </span>
                <span className="text-red-700">
                  Failed: {results.filter(r => r.status === 'error').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImportInvoices;
