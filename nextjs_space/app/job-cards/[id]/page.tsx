'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ClipboardList,
  User,
  Calendar,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  Edit2,
  Trash2,
  X,
  Save,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface StockItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  description?: string;
}

interface StockAllocation {
  id: string;
  stockItemId: string;
  stockItem?: StockItem;
  quantity: number;
  allocatedBy?: string;
  createdAt: string;
}

interface JobCard {
  id: string;
  title: string;
  description?: string;
  customerName?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToUserId?: string;
  assignedTo?: { id: string; name: string; email: string };
  companyId: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  stockAllocations?: StockAllocation[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const priorityConfig = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-700' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

export default function JobCardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const jobCardId = params?.id as string;

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Modals
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Allocate/Return form
  const [selectedStockItem, setSelectedStockItem] = useState('');
  const [allocateQty, setAllocateQty] = useState(1);
  const [returnQty, setReturnQty] = useState(1);
  const [selectedAllocation, setSelectedAllocation] = useState<StockAllocation | null>(null);

  // Edit form
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    customerName: '',
    priority: 'MEDIUM',
    status: 'PENDING',
    assignedToUserId: ''
  });

  const fetchJobCard = useCallback(async () => {
    if (!jobCardId) return;
    try {
      setLoading(true);
      const response = await apiClient.getJobCard(jobCardId);
      setJobCard(response);
      setEditForm({
        title: response.title || '',
        description: response.description || '',
        customerName: response.customerName || '',
        priority: response.priority || 'MEDIUM',
        status: response.status || 'PENDING',
        assignedToUserId: response.assignedToUserId || ''
      });
    } catch (error: any) {
      console.error('Error fetching job card:', error);
      toast.error(error.message || 'Failed to load job card');
    } finally {
      setLoading(false);
    }
  }, [jobCardId]);

  const fetchStockItems = useCallback(async () => {
    try {
      const response = await apiClient.getStockItems({ limit: 100 });
      const items = Array.isArray(response) ? response : (response?.data || response?.stockItems || response?.items || []);
      setStockItems(items);
    } catch (error) {
      console.error('Error fetching stock items:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await apiClient.getUsers();
      const userList = Array.isArray(response) ? response : (response?.data || response?.users || []);
      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  useEffect(() => {
    fetchJobCard();
    fetchStockItems();
    fetchUsers();
  }, [fetchJobCard, fetchStockItems, fetchUsers]);

  const handleAllocateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem || allocateQty < 1) {
      toast.error('Please select a stock item and quantity');
      return;
    }

    try {
      setUpdating(true);
      await apiClient.allocateStockToJob(jobCardId, {
        stockItemId: selectedStockItem,
        quantity: allocateQty
      });
      toast.success('Stock allocated successfully');
      setShowAllocateModal(false);
      setSelectedStockItem('');
      setAllocateQty(1);
      fetchJobCard();
      fetchStockItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to allocate stock');
    } finally {
      setUpdating(false);
    }
  };

  const handleReturnStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocation || returnQty < 1) {
      toast.error('Please select an allocation and quantity');
      return;
    }

    try {
      setUpdating(true);
      await apiClient.returnStockFromJob(jobCardId, {
        stockItemId: selectedAllocation.stockItemId,
        quantity: returnQty
      });
      toast.success('Stock returned successfully');
      setShowReturnModal(false);
      setSelectedAllocation(null);
      setReturnQty(1);
      fetchJobCard();
      fetchStockItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to return stock');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateJobCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setUpdating(true);
      await apiClient.updateJobCard(jobCardId, {
        title: editForm.title,
        description: editForm.description || undefined,
        customerName: editForm.customerName || undefined,
        priority: editForm.priority,
        status: editForm.status,
        assignedToUserId: editForm.assignedToUserId || undefined
      });
      toast.success('Job card updated successfully');
      setShowEditModal(false);
      fetchJobCard();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update job card');
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteJob = async () => {
    try {
      setUpdating(true);
      await apiClient.completeJobCard(jobCardId);
      toast.success('Job marked as completed');
      fetchJobCard();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete job');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteJob = async () => {
    try {
      setUpdating(true);
      await apiClient.deleteJobCard(jobCardId);
      toast.success('Job card deleted');
      router.push('/job-cards');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete job card');
    } finally {
      setUpdating(false);
    }
  };

  const canManage = hasRole(['MANAGER', 'OWNER']);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!jobCard) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Card Not Found</h2>
          <Link href="/job-cards" className="text-blue-600 hover:underline">
            Back to Job Cards
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const StatusIcon = statusConfig[jobCard.status]?.icon || Clock;
  const allocations = jobCard.stockAllocations || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/job-cards" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Job Cards
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{jobCard.title}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${statusConfig[jobCard.status]?.color}`}>
                <StatusIcon className="h-4 w-4" />
                {statusConfig[jobCard.status]?.label}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${priorityConfig[jobCard.priority]?.color}`}>
                {priorityConfig[jobCard.priority]?.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {jobCard.status !== 'COMPLETED' && jobCard.status !== 'CANCELLED' && (
              <button
                onClick={handleCompleteJob}
                disabled={updating}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Job
              </button>
            )}
            {canManage && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Job Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
              {jobCard.description ? (
                <p className="text-gray-700 whitespace-pre-wrap">{jobCard.description}</p>
              ) : (
                <p className="text-gray-500 italic">No description provided</p>
              )}
              <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-200">
                {jobCard.customerName && (
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium text-gray-900">{jobCard.customerName}</p>
                  </div>
                )}
                {jobCard.assignedTo && (
                  <div>
                    <p className="text-sm text-gray-500">Assigned To</p>
                    <p className="font-medium text-gray-900">{jobCard.assignedTo.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">{new Date(jobCard.createdAt).toLocaleString()}</p>
                </div>
                {jobCard.completedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Completed</p>
                    <p className="font-medium text-gray-900">{new Date(jobCard.completedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stock Allocations */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Allocated Stock ({allocations.length})
                </h2>
                {jobCard.status !== 'COMPLETED' && jobCard.status !== 'CANCELLED' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAllocateModal(true)}
                      className="inline-flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Allocate
                    </button>
                    {allocations.length > 0 && (
                      <button
                        onClick={() => setShowReturnModal(true)}
                        className="inline-flex items-center gap-1 text-sm bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                        Return
                      </button>
                    )}
                  </div>
                )}
              </div>

              {allocations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No stock allocated to this job</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allocations.map((alloc) => (
                    <div key={alloc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{alloc.stockItem?.name || 'Unknown Item'}</p>
                        <p className="text-sm text-gray-500">SKU: {alloc.stockItem?.sku || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">Qty: {alloc.quantity}</p>
                        <p className="text-sm text-gray-500">{new Date(alloc.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[jobCard.status]?.color}`}>
                    {statusConfig[jobCard.status]?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Priority</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[jobCard.priority]?.color}`}>
                    {priorityConfig[jobCard.priority]?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Allocated Items</span>
                  <span className="font-medium text-gray-900">{allocations.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Qty</span>
                  <span className="font-medium text-gray-900">
                    {allocations.reduce((sum, a) => sum + a.quantity, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Allocate Stock Modal */}
        {showAllocateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Allocate Stock</h2>
                  <button onClick={() => setShowAllocateModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleAllocateStock} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Item *</label>
                  <select
                    value={selectedStockItem}
                    onChange={(e) => setSelectedStockItem(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select stock item</option>
                    {stockItems.filter(item => item.quantity > 0).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (SKU: {item.sku}) - {item.quantity} available
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={allocateQty}
                    onChange={(e) => setAllocateQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAllocateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Allocate Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Return Stock Modal */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Return Stock</h2>
                  <button onClick={() => setShowReturnModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleReturnStock} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Allocation *</label>
                  <select
                    value={selectedAllocation?.id || ''}
                    onChange={(e) => {
                      const alloc = allocations.find(a => a.id === e.target.value);
                      setSelectedAllocation(alloc || null);
                      if (alloc) setReturnQty(Math.min(returnQty, alloc.quantity));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select allocation</option>
                    {allocations.map((alloc) => (
                      <option key={alloc.id} value={alloc.id}>
                        {alloc.stockItem?.name || 'Unknown'} - Qty: {alloc.quantity}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Return *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedAllocation?.quantity || 1}
                    value={returnQty}
                    onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {selectedAllocation && (
                    <p className="text-sm text-gray-500 mt-1">Max: {selectedAllocation.quantity}</p>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Return Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Edit Job Card</h2>
                  <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleUpdateJobCard} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select
                    value={editForm.assignedToUserId}
                    onChange={(e) => setEditForm({ ...editForm, assignedToUserId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle className="h-6 w-6" />
                <h2 className="text-xl font-bold">Delete Job Card</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this job card? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteJob}
                  disabled={updating}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
