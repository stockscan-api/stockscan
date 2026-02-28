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
  MapPin,
  Phone,
  Mail,
  FileSpreadsheet,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Package,
} from 'lucide-react';

interface Delivery {
  id: string;
  deliveryNumber: string;
  customerName: string;
  deliveryAddress: string;
  contactPhone?: string;
  contactEmail?: string;
  scheduledDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  signature?: string;
  signedBy?: string;
  completedAt?: string;
  createdAt: string;
  lineItems?: Array<{
    id: string;
    product: { name: string; sku: string };
    quantity: number;
    unitPrice: number;
  }>;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Truck },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
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
    deliveryAddress: '',
    contactPhone: '',
    contactEmail: '',
    scheduledDate: '',
    notes: '',
  });

  // Sage import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCreateDelivery = async () => {
    if (!formData.customerName || !formData.deliveryAddress) {
      toast.error('Customer name and delivery address are required');
      return;
    }

    setIsCreating(true);
    try {
      await apiClient.createDelivery({
        customerName: formData.customerName,
        deliveryAddress: formData.deliveryAddress,
        contactPhone: formData.contactPhone || undefined,
        contactEmail: formData.contactEmail || undefined,
        scheduledDate: formData.scheduledDate || undefined,
        notes: formData.notes || undefined,
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
      deliveryAddress: '',
      contactPhone: '',
      contactEmail: '',
      scheduledDate: '',
      notes: '',
    });
  };

  // Sage Import handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setImportFile(file);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    try {
      const result = await apiClient.importSalesOrders(importFile);
      setImportResult(result);
      if (result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} sales orders`);
        fetchDeliveries();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import sales orders');
    } finally {
      setIsImporting(false);
    }
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canManageDeliveries = hasRole(['MANAGER', 'OWNER']);

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
            <p className="text-gray-500">Track and manage customer deliveries with signature capture</p>
          </div>
          {canManageDeliveries && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import from Sage
              </Button>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Delivery
              </Button>
            </div>
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
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
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
              <p className="text-gray-500">Create a new delivery or import from Sage to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {deliveries.map((delivery) => {
              const status = statusConfig[delivery.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;
              const itemCount = delivery.lineItems?.length || 0;

              return (
                <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-blue-100 text-blue-800 font-mono">
                            {delivery.deliveryNumber}
                          </Badge>
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          {delivery.signature && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Signed
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-semibold text-gray-900">{delivery.customerName}</h3>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {delivery.deliveryAddress}
                          </span>
                          {delivery.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {delivery.contactPhone}
                            </span>
                          )}
                          {delivery.scheduledDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(delivery.scheduledDate).toLocaleDateString()}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                placeholder="Enter full delivery address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <Input
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Date
              </label>
              <Input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

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

        {/* Sage Import Modal */}
        <Modal
          isOpen={showImportModal}
          onClose={resetImportModal}
          title="Import Sales Orders from Sage"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload a Sage 50 Sales Order export file (.xlsx or .xls) to automatically create delivery records with line items.
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="sage-file-input"
              />
              <label
                htmlFor="sage-file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {importFile ? importFile.name : 'Click to select a Sage export file'}
                </span>
                <span className="text-xs text-gray-400">Max file size: 10MB</span>
              </label>
            </div>

            {importResult && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-gray-900">Import Results</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Imported: {importResult.imported || 0}</span>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Errors: {importResult.errors.length}</span>
                    </div>
                  )}
                </div>
                {importResult.errors?.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-auto">
                    {importResult.errors.map((err: any, i: number) => (
                      <p key={i} className="text-xs text-red-600">
                        Row {err.row}: {err.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={resetImportModal}>
                {importResult ? 'Close' : 'Cancel'}
              </Button>
              {!importResult && (
                <Button
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Import
                </Button>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
