'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  ChevronRight,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  X
} from 'lucide-react';
import Link from 'next/link';

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

export default function JobCardsPage() {
  const { user, hasRole } = useAuth();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showMyJobs, setShowMyJobs] = useState(false);

  // Create form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customerName: '',
    priority: 'MEDIUM',
    assignedToUserId: ''
  });

  const fetchJobCards = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      
      if (showMyJobs) {
        response = await apiClient.getMyJobCards();
      } else {
        response = await apiClient.getJobCards({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        });
      }
      
      const cards = Array.isArray(response) ? response : (response?.data || response?.jobCards || []);
      setJobCards(cards);
    } catch (error: any) {
      console.error('Error fetching job cards:', error);
      // Don't show toast for 404 - just show empty state
      if (!error.message?.includes('Cannot GET') && !error.message?.includes('404')) {
        toast.error(error.message || 'Failed to load job cards');
      }
      setJobCards([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, showMyJobs]);

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
    fetchJobCards();
    fetchUsers();
  }, [fetchJobCards, fetchUsers]);

  const handleCreateJobCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setCreating(true);
      await apiClient.createJobCard({
        title: formData.title,
        description: formData.description || undefined,
        customerName: formData.customerName || undefined,
        priority: formData.priority,
        assignedToUserId: formData.assignedToUserId || undefined,
      });
      toast.success('Job card created successfully');
      setShowCreateModal(false);
      setFormData({ title: '', description: '', customerName: '', priority: 'MEDIUM', assignedToUserId: '' });
      fetchJobCards();
    } catch (error: any) {
      if (error.message?.includes('Cannot') || error.message?.includes('404')) {
        toast.error('Job Cards feature is not available yet. Backend API support pending.');
      } else {
        toast.error(error.message || 'Failed to create job card');
      }
    } finally {
      setCreating(false);
    }
  };

  const filteredJobCards = jobCards.filter(card => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        card.title.toLowerCase().includes(search) ||
        card.description?.toLowerCase().includes(search) ||
        card.customerName?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const canManage = hasRole(['MANAGER', 'OWNER']);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-7 w-7 text-blue-600" />
              Job Cards
            </h1>
            <p className="text-gray-600 mt-1">Manage jobs, allocate stock, and track progress</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Job Card
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search job cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            {/* My Jobs Toggle */}
            <button
              onClick={() => setShowMyJobs(!showMyJobs)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                showMyJobs
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {showMyJobs ? 'My Jobs' : 'All Jobs'}
            </button>
          </div>
        </div>

        {/* Job Cards List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredJobCards.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No job cards found</h3>
              <p className="text-gray-500">Create a new job card to get started</p>
            </div>
          ) : (
            filteredJobCards.map((card) => {
              const StatusIcon = statusConfig[card.status]?.icon || Clock;
              return (
                <Link
                  key={card.id}
                  href={`/job-cards/${card.id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{card.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[card.status]?.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[card.status]?.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[card.priority]?.color}`}>
                          {priorityConfig[card.priority]?.label}
                        </span>
                      </div>
                      {card.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{card.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        {card.customerName && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {card.customerName}
                          </span>
                        )}
                        {card.assignedTo && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4 text-blue-500" />
                            Assigned to: {card.assignedTo.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(card.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Create Job Card</h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleCreateJobCard} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter job title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter job description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Enter customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                    <select
                      value={formData.assignedToUserId}
                      onChange={(e) => setFormData({ ...formData, assignedToUserId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Job Card
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
