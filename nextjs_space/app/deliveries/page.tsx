'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Eye,
  Loader2,
  Calendar,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  FileText,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  X,
} from 'lucide-react';

interface DeliveryItem {
  productId: string;
  productName: string;
  quantity: number;
  notes?: string;
}

interface Delivery {
  id: string;
  deliveryNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  sageOrderReference?: string;
  status: 'PENDING' | 'COLLECTED' | 'CANCELLED';
  deliveryDate?: string;
  signatureUrl?: string;
  signedBy?: string;
  signedAt?: string;
  items: DeliveryItem[];
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// v1.2.25 status config: PENDING | COLLECTED | CANCELLED
const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  COLLECTED: { label: 'Collected', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function DeliveriesPage() {
  const { hasRole } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    sageOrderReference: '',
    deliveryDate: '',
  });

  // Sage auto-fill
  const [isLoadingSage, setIsLoadingSage] = useState(false);
  const [sageItems, setSageItems] = useState<any[]>([]);
  
  // Excel file import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  useEffect(() => {
    fetchDeliveries();
  }, [page, statusFilter]);

  const fetchDeliveries = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getDeliveries({
        page,
        limit: 10,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });

      const deliveryList = response?.deliveries || response?.data || (Array.isArray(response) ? response : []);
      setDeliveries(Array.isArray(deliveryList) ? deliveryList : []);
      setTotalPages(Math.ceil((response?.total || deliveryList.length) / 10));
    } catch (error: any) {
      toast.error('Failed to fetch deliveries');
      setDeliveries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchDeliveries();
  };

  // Handle Excel file selection for Sage Sales Order import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    parseExcelFile(file);
  };

  // Parse Sage Sales Order Excel file
  const parseExcelFile = async (file: File) => {
    setIsParsingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Send to backend for parsing
      const response = await apiClient.parseSageOrderExcel(formData);
      
      if (response?.items && response.items.length > 0) {
        setSageItems(response.items);
        // Extract order reference from filename if present (e.g., "SO-12345.xlsx")
        const fileNameMatch = file.name.match(/([A-Z]{2,3}[-_]?\d+)/i);
        if (fileNameMatch) {
          setFormData(prev => ({
            ...prev,
            sageOrderReference: fileNameMatch[1].toUpperCase(),
          }));
        }
        toast.success(`${response.items.length} items loaded from Excel file`);
      } else {
        toast.error('No valid items found in Excel file');
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      toast.error(error.message || 'Failed to parse Excel file');
    } finally {
      setIsParsingFile(false);
    }
  };

  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setSageItems([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateDelivery = async () => {
    if (!formData.customerName) {
      toast.error('Customer name is required');
      return;
    }

    setIsCreating(true);
    try {
      // Map parsed items to the delivery item format
      const deliveryItems = sageItems.length > 0 ? sageItems.map(item => ({
        productCode: item.productCode || item.partNumber || item.productId,
        productName: item.description || item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes,
      })) : undefined;

      await apiClient.createDelivery({
        customerName: formData.customerName,
        customerEmail: formData.customerEmail || undefined,
        customerPhone: formData.customerPhone || undefined,
        sageOrderReference: formData.sageOrderReference || undefined,
        deliveryDate: formData.deliveryDate || undefined,
        items: deliveryItems,
      });
      toast.success('Delivery created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchDeliveries();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create delivery');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      sageOrderReference: '',
      deliveryDate: '',
    });
    setSageItems([]);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // DELIVERY_CLERK can only access deliveries
  const canCreateDelivery = hasRole(['STAFF', 'MANAGER', 'OWNER', 'DELIVERY_CLERK']);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="h-7 w-7 text-blue-600" />
              Deliveries
            </h1>
            <p className="text-gray-500">Manage customer collections with signature capture</p>
          </div>
          {canCreateDelivery && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Delivery
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by customer name or delivery number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="COLLECTED">Collected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <Button variant="outline" onClick={handleSearch}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : deliveries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Truck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No deliveries found</h3>
              <p className="text-gray-500">Create a new delivery to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {deliveries.map((delivery) => {
              const status = statusConfig[delivery.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;
              const itemCount = delivery.items?.length || 0;

              return (
                <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className="bg-blue-100 text-blue-800 font-mono">
                            {delivery.deliveryNumber}
                          </Badge>
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          {delivery.signatureUrl && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Signed
                            </Badge>
                          )}
                          {delivery.sageOrderReference && (
                            <Badge className="bg-purple-100 text-purple-800">
                              <FileText className="h-3 w-3 mr-1" />
                              {delivery.sageOrderReference}
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-semibold text-gray-900">{delivery.customerName}</h3>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          {delivery.customerPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {delivery.customerPhone}
                            </span>
                          )}
                          {delivery.customerEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {delivery.customerEmail}
                            </span>
                          )}
                          {delivery.deliveryDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(delivery.deliveryDate).toLocaleDateString()}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/deliveries/${delivery.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* Create Delivery Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          title="Create New Delivery"
        >
          <div className="space-y-4">
            {/* Sage Sales Order Excel Import */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <label className="block text-sm font-medium text-purple-800 mb-2">
                <FileSpreadsheet className="h-4 w-4 inline mr-1" />
                Import from Sage Sales Order (Optional)
              </label>
              <p className="text-xs text-purple-600 mb-3">
                Upload an Excel file exported from Sage 50 to auto-fill delivery items
              </p>
              
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center cursor-pointer hover:bg-purple-100 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto text-purple-400 mb-2" />
                  <p className="text-sm text-purple-700 font-medium">Click to upload Excel file</p>
                  <p className="text-xs text-purple-500 mt-1">.xlsx or .xls (max 5MB)</p>
                </div>
              ) : (
                <div className="bg-white border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSelectedFile}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {isParsingFile && (
                    <div className="flex items-center gap-2 mt-2 text-purple-600 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Parsing Excel file...
                    </div>
                  )}
                  {sageItems.length > 0 && !isParsingFile && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {sageItems.length} items loaded successfully
                    </p>
                  )}
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {/* Sage Order Reference (manual or extracted from filename) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sage Order Reference
              </label>
              <Input
                value={formData.sageOrderReference}
                onChange={(e) => setFormData({ ...formData, sageOrderReference: e.target.value })}
                placeholder="e.g., SO-12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Phone
                </label>
                <Input
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Email
                </label>
                <Input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Date
              </label>
              <Input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
              />
            </div>

            {/* Show loaded Sage items */}
            {sageItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Items from Sage Sales Order ({sageItems.length} items)
                </label>
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600">
                    <div className="col-span-3">Code</div>
                    <div className="col-span-7">Description</div>
                    <div className="col-span-2 text-right">Qty</div>
                  </div>
                  <div className="max-h-48 overflow-auto">
                    {sageItems.map((item, idx) => (
                      <div key={idx} className="px-3 py-2 grid grid-cols-12 gap-2 text-sm border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <div className="col-span-3 font-mono text-xs text-purple-700">{item.productCode || item.partNumber || '-'}</div>
                        <div className="col-span-7 text-gray-800 truncate">{item.description || item.productName || '-'}</div>
                        <div className="col-span-2 text-right font-semibold">{item.quantity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreateDelivery} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Delivery
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
