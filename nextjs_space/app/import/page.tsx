'use client';

import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface PreviewData {
  totalRows: number;
  columns: string[];
  preview: any[];
  mappedFields: Record<string, string>;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      const validExtensions = ['.csv', '.xlsx', '.xls'];
      const hasValidExtension = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
      
      if (validTypes.includes(selectedFile.type) || hasValidExtension) {
        setFile(selectedFile);
        setPreviewData(null);
        setImportResult(null);
      } else {
        toast.error('Please select a CSV or Excel file');
      }
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const result = await apiClient.previewImport(file);
      setPreviewData(result);
      toast.success('File preview loaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to preview file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const result = await apiClient.importProducts(file);
      setImportResult(result);
      toast.success(`Successfully imported ${result.imported || result.created || 0} products`);
      setFile(null);
      setPreviewData(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import products');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <DashboardLayout allowedRoles={['MANAGER', 'OWNER']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Products</h1>
          <p className="text-gray-500">Import products from CSV or Excel files (Sage compatible)</p>
        </div>

        {/* Import Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              Supported Formats
            </CardTitle>
            <CardDescription>
              Import products from Sage 50 exports or custom spreadsheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Supported File Types</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> CSV files (.csv)</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Excel files (.xlsx, .xls)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Recognized Columns</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Product Code / SKU / Item Code</li>
                  <li>Description / Product Name / Name</li>
                  <li>Cost Price / Unit Cost</li>
                  <li>Sale Price / Selling Price / Unit Price</li>
                  <li>Quantity / Stock / Qty</li>
                  <li>Category</li>
                  <li>Barcode</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  {file ? (
                    <div>
                      <p className="font-medium text-blue-600">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-gray-700">Click to upload or drag and drop</p>
                      <p className="text-sm text-gray-500">CSV or Excel files</p>
                    </div>
                  )}
                </label>
              </div>

              <div className="flex gap-3">
                <Button onClick={handlePreview} disabled={!file || isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!file && !previewData}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {previewData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Preview ({previewData.totalRows} rows found)</span>
                <Button onClick={handleImport} disabled={isImporting} className="bg-green-600 hover:bg-green-700">
                  {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Import All Products
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Column Mapping */}
              {previewData.mappedFields && Object.keys(previewData.mappedFields).length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Detected Column Mappings</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(previewData.mappedFields).map(([field, column]) => (
                      <span key={field} className="px-2 py-1 bg-white rounded text-sm">
                        <span className="text-gray-500">{column}</span> → <span className="font-medium">{field}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewData.columns?.map((col, i) => (
                        <th key={i} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.preview?.map((row, i) => (
                      <tr key={i}>
                        {previewData.columns?.map((col, j) => (
                          <td key={j} className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                            {row[col] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">Showing first {previewData.preview?.length || 0} rows</p>
            </CardContent>
          </Card>
        )}

        {/* Import Result */}
        {importResult && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Import Successful</h3>
                  <p className="text-green-700">
                    {importResult.imported || importResult.created || 0} products imported successfully
                    {importResult.skipped > 0 && `, ${importResult.skipped} skipped (duplicates)`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
