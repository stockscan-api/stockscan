'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  AlertTriangle,
  FileText,
  Download,
  Activity,
  MessageSquare,
  Send,
  PlayCircle,
  Lock
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
  stockItemId?: string;
  productId?: string;
  stockItem?: StockItem;
  product?: { id: string; name: string; sku: string; barcode?: string };
  quantity?: number;
  quantityAllocated?: number;
  quantityReturned?: number;
  quantityOnJob?: number;
  unitCost?: string;
  unitCostAtAllocation?: string;
  totalCost?: string;
  allocatedBy?: string;
  allocatedById?: string;
  allocatedAt?: string;
  createdAt?: string;
}

interface LabourEntry {
  id: string;
  staffMemberId: string;
  staffMember?: { id: string; name: string; email: string };
  hoursWorked: number;
  hourlyRate: number;
  labourCost: number;
  dateWorked: string;
  description?: string;
  createdAt: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  details: string;
  performedByUser?: { id: string; name: string };
  performedByUserId?: string;
  performedAt: string;
  createdAt: string;
}

interface JobCard {
  id: string;
  jobReference?: string;
  title: string;
  jobName?: string;
  customer?: string;
  description?: string;
  customerName?: string;
  contactNumber?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OPEN' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToUserId?: string;
  assignedTo?: { id: string; name: string; email: string };
  companyId: string;
  completedAt?: string;
  actualCompletionDate?: string;
  startDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  stockAllocations?: StockAllocation[];
  allocations?: StockAllocation[];
  labourEntries?: LabourEntry[];
  materialsCost?: string;
  labourCost?: string;
  totalCost?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  OPEN: { label: 'Open', color: 'bg-blue-100 text-blue-700', icon: Clock },
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-indigo-100 text-indigo-700', icon: Loader2 },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-700', icon: Lock },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-700' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

// Status workflow: OPEN → IN_PROGRESS → COMPLETED → CLOSED
const getNextStatusAction = (status: string) => {
  switch (status) {
    case 'OPEN': return { nextStatus: 'IN_PROGRESS', label: 'Start Job', color: 'bg-blue-600 hover:bg-blue-700', icon: PlayCircle };
    case 'PENDING': return { nextStatus: 'IN_PROGRESS', label: 'Start Job', color: 'bg-blue-600 hover:bg-blue-700', icon: PlayCircle };
    case 'IN_PROGRESS': return { nextStatus: 'COMPLETED', label: 'Mark Completed', color: 'bg-green-600 hover:bg-green-700', icon: CheckCircle2 };
    case 'COMPLETED': return { nextStatus: 'CLOSED', label: 'Close Job', color: 'bg-gray-600 hover:bg-gray-700', icon: Lock };
    default: return null;
  }
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
  const [showLabourModal, setShowLabourModal] = useState(false);
  const [editingLabour, setEditingLabour] = useState<LabourEntry | null>(null);

  // Search state for stock item picker
  const [stockSearch, setStockSearch] = useState('');
  const [stockSearchResults, setStockSearchResults] = useState<StockItem[]>([]);
  const [isSearchingStock, setIsSearchingStock] = useState(false);
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [selectedStockLabel, setSelectedStockLabel] = useState('');
  const stockSearchRef = useRef<HTMLDivElement>(null);

  // Allocate/Return form
  const [selectedStockItem, setSelectedStockItem] = useState('');
  const [allocateQty, setAllocateQty] = useState(1);
  const [returnQty, setReturnQty] = useState(1);
  const [selectedAllocation, setSelectedAllocation] = useState<StockAllocation | null>(null);

  // Labour form
  const [labourForm, setLabourForm] = useState({
    staffMemberId: '',
    hoursWorked: '',
    hourlyRate: '25.00',
    dateWorked: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Active tab
  const [activeTab, setActiveTab] = useState<'materials' | 'labour' | 'activity' | 'notes'>('materials');

  // Activity log
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Notes
  const [notesText, setNotesText] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // Invoice & Export
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [exportingSage, setExportingSage] = useState(false);

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
      setNotesText(response.notes || '');
      setEditForm({
        title: response.title || '',
        description: response.description || '',
        customerName: response.customerName || response.customer || '',
        priority: response.priority || 'MEDIUM',
        status: response.status || 'PENDING',
        assignedToUserId: response.assignedToUserId || ''
      });
    } catch (error: any) {
      console.error('Error fetching job card:', error);
      toast.error(error.message || 'Failed to load job card');
      router.push('/job-cards');
    } finally {
      setLoading(false);
    }
  }, [jobCardId, router]);

  const fetchActivity = useCallback(async () => {
    if (!jobCardId) return;
    try {
      setLoadingActivity(true);
      const response = await apiClient.getJobCardActivity(jobCardId);
      const entries = Array.isArray(response) ? response : (response?.data || response?.activities || []);
      setActivityLog(entries);
    } catch (error: any) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  }, [jobCardId]);

  const fetchStockItems = useCallback(async () => {
    try {
      const response = await apiClient.getStockItems({ limit: 100 });
      // Products API returns {products: [...]}
      const items = Array.isArray(response) ? response : (response?.products || response?.data || response?.stockItems || response?.items || []);
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

  // Debounced stock search
  const searchStockDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const handleStockSearchChange = useCallback((query: string) => {
    setStockSearch(query);
    setShowStockDropdown(true);
    if (searchStockDebounceRef.current) clearTimeout(searchStockDebounceRef.current);
    if (!query.trim()) {
      // Show initial items from cache
      setStockSearchResults(stockItems.filter(i => i.quantity > 0).slice(0, 20));
      return;
    }
    searchStockDebounceRef.current = setTimeout(async () => {
      setIsSearchingStock(true);
      try {
        const response = await apiClient.getStockItems({ search: query, limit: 30 });
        const items = Array.isArray(response) ? response : (response?.products || response?.data || response?.stockItems || response?.items || []);
        setStockSearchResults(items.filter((i: StockItem) => i.quantity > 0));
      } catch {
        // Fall back to client-side filter
        const q = query.toLowerCase();
        setStockSearchResults(stockItems.filter(i => i.quantity > 0 && (i.name?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q))));
      } finally {
        setIsSearchingStock(false);
      }
    }, 300);
  }, [stockItems]);

  // Close stock dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stockSearchRef.current && !stockSearchRef.current.contains(e.target as Node)) {
        setShowStockDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchJobCard();
    fetchStockItems();
    fetchUsers();
  }, [fetchJobCard, fetchStockItems, fetchUsers]);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivity();
    }
  }, [activeTab, fetchActivity]);

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
      setSelectedStockLabel('');
      setStockSearch('');
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
        stockItemId: selectedAllocation.stockItemId || selectedAllocation.productId || selectedAllocation.product?.id || '',
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

  const handleChangeStatus = async (nextStatus: string) => {
    try {
      setUpdating(true);
      const payload: any = { status: nextStatus };
      if (nextStatus === 'COMPLETED') {
        payload.actualCompletionDate = new Date().toISOString();
      }
      await apiClient.updateJobCardStatus(jobCardId, payload);
      const labels: Record<string, string> = {
        IN_PROGRESS: 'Job started',
        COMPLETED: 'Job marked as completed',
        CLOSED: 'Job closed',
      };
      toast.success(labels[nextStatus] || `Status changed to ${nextStatus}`);
      fetchJobCard();
      if (activeTab === 'activity') fetchActivity();
    } catch (error: any) {
      toast.error(error.message || 'Failed to change status');
    } finally {
      setUpdating(false);
    }
  };

  // ========== Notes Functions ==========

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await apiClient.updateJobCardNotes(jobCardId, notesText);
      toast.success('Notes saved');
      setEditingNotes(false);
      fetchJobCard();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  // ========== Invoice & Export Functions ==========

  const handleGenerateInvoice = async () => {
    try {
      setGeneratingInvoice(true);
      const invoice = await apiClient.getJobCardInvoice(jobCardId);
      // If invoice returns content for display/download
      if (invoice?.content || invoice?.html) {
        const content = invoice.content || invoice.html;
        const blob = new Blob([content], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${jobCard?.jobReference || 'invoice'}_invoice.html`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (invoice?.url) {
        window.open(invoice.url, '_blank');
      } else {
        // Display invoice data in a new window
        const invoiceWindow = window.open('', '_blank');
        if (invoiceWindow) {
          const ref = invoice?.jobReference || jobCard?.jobReference || '';
          const cust = invoice?.customer || jobCard?.customerName || jobCard?.customer || '';
          const items = invoice?.items || [];
          const labour = invoice?.labour || [];
          invoiceWindow.document.write(`
            <html><head><title>Invoice - ${ref}</title>
            <style>body{font-family:Arial,sans-serif;max-width:800px;margin:auto;padding:20px}
            table{width:100%;border-collapse:collapse;margin:15px 0}
            th,td{border:1px solid #ddd;padding:8px;text-align:left}
            th{background:#f5f5f5}
            .total{font-weight:bold;font-size:1.2em}
            @media print{button{display:none}}</style></head><body>
            <h1>Invoice: ${ref}</h1>
            <p><strong>Customer:</strong> ${cust}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <h3>Materials</h3>
            <table><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
            ${items.map((i: any) => `<tr><td>${i.description || i.name || ''}</td><td>${i.quantity || ''}</td><td>£${parseFloat(i.unitPrice || 0).toFixed(2)}</td><td>£${parseFloat(i.total || i.lineTotal || 0).toFixed(2)}</td></tr>`).join('')}
            </table>
            <h3>Labour</h3>
            <table><tr><th>Description</th><th>Hours</th><th>Rate</th><th>Total</th></tr>
            ${labour.map((l: any) => `<tr><td>${l.description || ''}</td><td>${l.hours || l.hoursWorked || ''}</td><td>£${parseFloat(l.rate || l.hourlyRate || 0).toFixed(2)}</td><td>£${parseFloat(l.total || l.labourCost || 0).toFixed(2)}</td></tr>`).join('')}
            </table>
            <hr/>
            <p>Subtotal: £${parseFloat(invoice?.subtotal || invoice?.totalCost || '0').toFixed(2)}</p>
            ${invoice?.tax ? `<p>VAT: £${parseFloat(invoice.tax).toFixed(2)}</p>` : ''}
            <p class="total">Total: £${parseFloat(invoice?.total || invoice?.totalCost || '0').toFixed(2)}</p>
            <br/><button onclick="window.print()">Print Invoice</button>
            </body></html>
          `);
        }
      }
      toast.success('Invoice generated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleExportSageCSV = async () => {
    try {
      setExportingSage(true);
      const result = await apiClient.exportJobCardSageCSV(jobCardId);
      const csvContent = result?.content || result?.csv || '';
      const filename = result?.filename || `${jobCard?.jobReference || 'job'}_sage_export.csv`;
      
      if (csvContent) {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Sage CSV exported');
      } else if (result?.url) {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = filename;
        a.click();
        toast.success('Sage CSV exported');
      } else {
        toast.error('No export data returned');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to export Sage CSV');
    } finally {
      setExportingSage(false);
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

  // ========== Labour Tracking Functions ==========

  const handleAddLabour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labourForm.staffMemberId || !labourForm.hoursWorked || !labourForm.hourlyRate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setUpdating(true);
      await apiClient.addLabourEntry(jobCardId, {
        staffMemberId: labourForm.staffMemberId,
        hoursWorked: parseFloat(labourForm.hoursWorked),
        hourlyRate: parseFloat(labourForm.hourlyRate),
        dateWorked: new Date(labourForm.dateWorked).toISOString(),
        description: labourForm.description || undefined
      });
      toast.success('Labour entry added successfully');
      setShowLabourModal(false);
      resetLabourForm();
      fetchJobCard();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add labour entry');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateLabour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLabour) return;

    try {
      setUpdating(true);
      await apiClient.updateLabourEntry(jobCardId, editingLabour.id, {
        hoursWorked: parseFloat(labourForm.hoursWorked),
        hourlyRate: parseFloat(labourForm.hourlyRate),
        dateWorked: new Date(labourForm.dateWorked).toISOString(),
        description: labourForm.description || undefined
      });
      toast.success('Labour entry updated');
      setShowLabourModal(false);
      setEditingLabour(null);
      resetLabourForm();
      fetchJobCard();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update labour entry');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteLabour = async (labourId: string) => {
    if (!confirm('Are you sure you want to delete this labour entry?')) return;

    try {
      setUpdating(true);
      await apiClient.deleteLabourEntry(jobCardId, labourId);
      toast.success('Labour entry deleted');
      fetchJobCard();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete labour entry');
    } finally {
      setUpdating(false);
    }
  };

  const resetLabourForm = () => {
    setLabourForm({
      staffMemberId: '',
      hoursWorked: '',
      hourlyRate: '25.00',
      dateWorked: new Date().toISOString().split('T')[0],
      description: ''
    });
  };

  const openEditLabour = (entry: LabourEntry) => {
    setEditingLabour(entry);
    setLabourForm({
      staffMemberId: entry.staffMemberId,
      hoursWorked: entry.hoursWorked.toString(),
      hourlyRate: entry.hourlyRate.toString(),
      dateWorked: new Date(entry.dateWorked).toISOString().split('T')[0],
      description: entry.description || ''
    });
    setShowLabourModal(true);
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
  const allocations = jobCard.stockAllocations || jobCard.allocations || [];
  const labourEntries = jobCard.labourEntries || [];

  // Calculate totals
  const materialsCost = parseFloat(jobCard.materialsCost || '0');
  const labourCost = parseFloat(jobCard.labourCost || '0');
  const totalCost = parseFloat(jobCard.totalCost || '0') || (materialsCost + labourCost);
  const totalLabourHours = labourEntries.reduce((sum, e) => sum + e.hoursWorked, 0);

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
            <div className="flex items-center gap-2 mb-1">
              {jobCard.jobReference && (
                <span className="text-sm font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{jobCard.jobReference}</span>
              )}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${statusConfig[jobCard.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                <StatusIcon className="h-4 w-4" />
                {statusConfig[jobCard.status]?.label || jobCard.status}
              </span>
              {jobCard.priority && (
                <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${priorityConfig[jobCard.priority]?.color || 'bg-gray-100 text-gray-700'}`}>
                  {priorityConfig[jobCard.priority]?.label || jobCard.priority}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{jobCard.jobName || jobCard.title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(() => {
              const nextAction = getNextStatusAction(jobCard.status);
              if (nextAction) {
                const ActionIcon = nextAction.nextStatus === 'IN_PROGRESS' ? PlayCircle 
                  : nextAction.nextStatus === 'COMPLETED' ? CheckCircle2 
                  : Lock;
                return (
                  <button
                    onClick={() => handleChangeStatus(nextAction.nextStatus)}
                    disabled={updating}
                    className={`inline-flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                      nextAction.nextStatus === 'IN_PROGRESS' ? 'bg-blue-600 hover:bg-blue-700'
                      : nextAction.nextStatus === 'COMPLETED' ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    <ActionIcon className="h-4 w-4" />
                    {nextAction.label}
                  </button>
                );
              }
              return null;
            })()}
            {(jobCard.status === 'COMPLETED' || jobCard.status === 'CLOSED') && (
              <>
                <button
                  onClick={handleGenerateInvoice}
                  disabled={generatingInvoice}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {generatingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Invoice
                </button>
                <button
                  onClick={handleExportSageCSV}
                  disabled={exportingSage}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {exportingSage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Sage CSV
                </button>
              </>
            )}
            {canManage && jobCard.status !== 'CLOSED' && (
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

            {/* Materials, Labour, Activity & Notes Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Tab Headers */}
              <div className="border-b border-gray-200 flex">
                {([
                  { key: 'materials' as const, icon: Package, label: `Materials (${allocations.length})` },
                  { key: 'labour' as const, icon: Clock, label: `Labour (${labourEntries.length})` },
                  { key: 'activity' as const, icon: Activity, label: 'Activity' },
                  { key: 'notes' as const, icon: MessageSquare, label: 'Notes' },
                ]).map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 px-3 py-3 text-sm font-medium flex items-center justify-center gap-1.5 ${
                        activeTab === tab.key 
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <TabIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'materials' && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Allocated Stock</h2>
                      {jobCard.status !== 'COMPLETED' && jobCard.status !== 'CANCELLED' && jobCard.status !== 'CLOSED' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowAllocateModal(true); setStockSearch(''); setSelectedStockItem(''); setSelectedStockLabel(''); setAllocateQty(1); setShowStockDropdown(false); }}
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
                        {allocations.map((alloc, idx) => {
                          const name = alloc.product?.name || alloc.stockItem?.name || 'Unknown Item';
                          const sku = alloc.product?.sku || alloc.stockItem?.sku || 'N/A';
                          const qty = alloc.quantityAllocated ?? alloc.quantityOnJob ?? alloc.quantity ?? 0;
                          const returned = alloc.quantityReturned ?? 0;
                          const cost = alloc.unitCostAtAllocation || alloc.unitCost || alloc.totalCost;
                          const dateStr = alloc.allocatedAt || alloc.createdAt;
                          return (
                            <div key={alloc.id || idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{name}</p>
                                <p className="text-sm text-gray-500">SKU: {sku}</p>
                                {cost && <p className="text-xs text-gray-400">Unit cost: £{cost}</p>}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">Qty: {qty}{returned > 0 ? ` (${returned} returned)` : ''}</p>
                                {dateStr && <p className="text-sm text-gray-500">{new Date(dateStr).toLocaleDateString()}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'labour' && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Labour Entries</h2>
                      {jobCard.status !== 'COMPLETED' && jobCard.status !== 'CANCELLED' && jobCard.status !== 'CLOSED' && (
                        <button
                          onClick={() => {
                            setEditingLabour(null);
                            resetLabourForm();
                            setShowLabourModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add Labour
                        </button>
                      )}
                    </div>

                    {labourEntries.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No labour entries recorded</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {labourEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{entry.staffMember?.name || 'Staff Member'}</p>
                              <p className="text-sm text-gray-500">
                                {entry.hoursWorked} hrs @ £{entry.hourlyRate.toFixed(2)}/hr
                              </p>
                              {entry.description && (
                                <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">£{entry.labourCost.toFixed(2)}</p>
                              <p className="text-sm text-gray-500">{new Date(entry.dateWorked).toLocaleDateString()}</p>
                            </div>
                            {jobCard.status !== 'COMPLETED' && jobCard.status !== 'CANCELLED' && jobCard.status !== 'CLOSED' && (
                              <div className="flex items-center gap-1 ml-4">
                                <button
                                  onClick={() => openEditLabour(entry)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLabour(entry.id)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Labour Summary */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Hours:</span>
                            <span className="font-semibold">{totalLabourHours.toFixed(1)} hrs</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-600">Labour Cost:</span>
                            <span className="font-semibold text-green-600">£{labourCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'activity' && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
                    {loadingActivity ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      </div>
                    ) : activityLog.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No activity recorded yet</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                        <div className="space-y-4">
                          {activityLog.map((entry, idx) => (
                            <div key={idx} className="relative pl-10">
                              <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{entry.action}</p>
                                    {entry.details && (
                                      <p className="text-sm text-gray-600 mt-0.5">{entry.details}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  {entry.performedByUser && (
                                    <span>by {typeof entry.performedByUser === 'object' ? (entry.performedByUser as any).name : entry.performedByUser}</span>
                                  )}
                                  <span>{new Date(entry.performedAt).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Job Notes</h2>
                      {!editingNotes && jobCard.status !== 'CLOSED' && (
                        <button
                          onClick={() => setEditingNotes(true)}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      )}
                    </div>
                    {editingNotes ? (
                      <div className="space-y-3">
                        <textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          rows={8}
                          placeholder="Add notes about this job..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingNotes(false);
                              setNotesText(jobCard.notes || '');
                            }}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveNotes}
                            disabled={savingNotes}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Save Notes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 min-h-[120px]">
                        {notesText ? (
                          <p className="text-gray-700 whitespace-pre-wrap text-sm">{notesText}</p>
                        ) : (
                          <p className="text-gray-400 italic text-sm">No notes added yet. Click Edit to add notes.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Costing Summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Job Costing</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Materials</span>
                  <span className="font-medium text-gray-900">£{materialsCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Labour ({totalLabourHours.toFixed(1)} hrs)</span>
                  <span className="font-medium text-gray-900">£{labourCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total Cost</span>
                  <span className="font-bold text-lg text-green-600">£{totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[jobCard.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                    {statusConfig[jobCard.status]?.label || jobCard.status}
                  </span>
                </div>
                {jobCard.priority && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Priority</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[jobCard.priority]?.color || 'bg-gray-100 text-gray-700'}`}>
                      {priorityConfig[jobCard.priority]?.label || jobCard.priority}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Allocated Items</span>
                  <span className="font-medium text-gray-900">{allocations.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Labour Entries</span>
                  <span className="font-medium text-gray-900">{labourEntries.length}</span>
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
                <div ref={stockSearchRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Item *</label>
                  <input
                    type="text"
                    value={selectedStockItem ? selectedStockLabel : stockSearch}
                    onChange={(e) => {
                      if (selectedStockItem) {
                        setSelectedStockItem('');
                        setSelectedStockLabel('');
                      }
                      handleStockSearchChange(e.target.value);
                    }}
                    onFocus={() => {
                      if (!selectedStockItem) {
                        setShowStockDropdown(true);
                        if (!stockSearch.trim()) {
                          setStockSearchResults(stockItems.filter(i => i.quantity > 0).slice(0, 20));
                        }
                      }
                    }}
                    placeholder="Search by name or SKU..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoComplete="off"
                  />
                  {selectedStockItem && (
                    <button
                      type="button"
                      onClick={() => { setSelectedStockItem(''); setSelectedStockLabel(''); setStockSearch(''); setShowStockDropdown(false); }}
                      className="absolute right-2 top-8 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {isSearchingStock && (
                    <div className="absolute right-2 top-8">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                  {showStockDropdown && !selectedStockItem && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {stockSearchResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          {stockSearch.trim() ? 'No matching items found' : 'Type to search stock items'}
                        </div>
                      ) : (
                        stockSearchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedStockItem(item.id);
                              setSelectedStockLabel(`${item.name} (SKU: ${item.sku})`);
                              setStockSearch('');
                              setShowStockDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">SKU: {item.sku} · {item.quantity} available</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {/* Hidden required input for form validation */}
                  <input type="hidden" value={selectedStockItem} required />
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
                      if (alloc) {
                        const onJob = (alloc.quantityAllocated ?? alloc.quantityOnJob ?? alloc.quantity ?? 0) - (alloc.quantityReturned ?? 0);
                        setReturnQty(Math.min(returnQty, onJob));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select allocation</option>
                    {allocations.map((alloc) => {
                      const aName = alloc.product?.name || alloc.stockItem?.name || 'Unknown';
                      const onJob = (alloc.quantityAllocated ?? alloc.quantityOnJob ?? alloc.quantity ?? 0) - (alloc.quantityReturned ?? 0);
                      return (
                        <option key={alloc.id} value={alloc.id}>
                          {aName} - Qty on job: {onJob}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Return *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedAllocation ? ((selectedAllocation.quantityAllocated ?? selectedAllocation.quantityOnJob ?? selectedAllocation.quantity ?? 0) - (selectedAllocation.quantityReturned ?? 0)) : 1}
                    value={returnQty}
                    onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {selectedAllocation && (
                    <p className="text-sm text-gray-500 mt-1">Max: {(selectedAllocation.quantityAllocated ?? selectedAllocation.quantityOnJob ?? selectedAllocation.quantity ?? 0) - (selectedAllocation.quantityReturned ?? 0)}</p>
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
                      <option value="OPEN">Open</option>
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CLOSED">Closed</option>
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

        {/* Labour Entry Modal */}
        {showLabourModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingLabour ? 'Edit Labour Entry' : 'Add Labour Entry'}
                  </h2>
                  <button 
                    onClick={() => {
                      setShowLabourModal(false);
                      setEditingLabour(null);
                      resetLabourForm();
                    }} 
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <form onSubmit={editingLabour ? handleUpdateLabour : handleAddLabour} className="p-6 space-y-4">
                {!editingLabour && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
                    <select
                      value={labourForm.staffMemberId}
                      onChange={(e) => setLabourForm({ ...labourForm, staffMemberId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select staff member</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={labourForm.hoursWorked}
                      onChange={(e) => setLabourForm({ ...labourForm, hoursWorked: e.target.value })}
                      placeholder="e.g., 8.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (£) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={labourForm.hourlyRate}
                      onChange={(e) => setLabourForm({ ...labourForm, hourlyRate: e.target.value })}
                      placeholder="e.g., 25.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Worked *</label>
                  <input
                    type="date"
                    value={labourForm.dateWorked}
                    onChange={(e) => setLabourForm({ ...labourForm, dateWorked: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={labourForm.description}
                    onChange={(e) => setLabourForm({ ...labourForm, description: e.target.value })}
                    placeholder="e.g., Cabinet installation, plumbing work..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {labourForm.hoursWorked && labourForm.hourlyRate && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Calculated Cost:</span>
                      <span className="font-bold text-green-700">
                        £{(parseFloat(labourForm.hoursWorked) * parseFloat(labourForm.hourlyRate)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLabourModal(false);
                      setEditingLabour(null);
                      resetLabourForm();
                    }}
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
                    {editingLabour ? 'Update Entry' : 'Add Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
