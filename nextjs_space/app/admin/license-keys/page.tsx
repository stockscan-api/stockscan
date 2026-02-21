'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api-client';
import { KeyRound, Plus, Copy, Trash2, Loader2, CheckCircle, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';

interface LicenseKey {
  id: string;
  key: string;
  tier: string;
  duration: number;
  isRedeemed: boolean;
  redeemedBy?: string;
  redeemedAt?: string;
  notes?: string;
  createdAt: string;
  expiresAt: string;
  company?: {
    name: string;
    email: string;
  };
}

export default function LicenseKeysPage() {
  const searchParams = useSearchParams();
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showKeyDetailsModal, setShowKeyDetailsModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<LicenseKey | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<any[]>([]);

  const [generateForm, setGenerateForm] = useState({
    tier: 'PROFESSIONAL',
    duration: 365,
    count: 1,
    notes: '',
  });

  useEffect(() => {
    if (searchParams.get('action') === 'generate') {
      setShowGenerateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchLicenses();
  }, [page, tierFilter, statusFilter]);

  const fetchLicenses = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getAllLicenseKeys({
        page,
        limit: 20,
        tier: tierFilter !== 'all' ? tierFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setLicenses(res?.licenses || []);
      setTotalPages(Math.ceil((res?.total || 0) / 20));
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch license keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.generateLicenseKeys({
        tier: generateForm.tier,
        duration: generateForm.duration,
        count: generateForm.count,
        notes: generateForm.notes || undefined,
      });
      setGeneratedKeys(res?.keys || []);
      toast.success(`Generated ${generateForm.count} license key(s)`);
      fetchLicenses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate license keys');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('License key copied to clipboard');
  };

  const handleViewKey = async (key: string) => {
    try {
      const details = await apiClient.checkLicenseKey(key);
      setSelectedKey(details);
      setShowKeyDetailsModal(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch key details');
    }
  };

  const handleDelete = async () => {
    if (!keyToDelete) return;
    try {
      await apiClient.deleteLicenseKey(keyToDelete.id);
      toast.success('License key deleted');
      setShowDeleteConfirm(false);
      setKeyToDelete(null);
      fetchLicenses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete license key');
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ENTERPRISE': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'PROFESSIONAL': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'BASIC': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (license: LicenseKey) => {
    if (license.isRedeemed) {
      return <Badge className="bg-blue-100 text-blue-800">Redeemed</Badge>;
    }
    
    // Only check expiry if expiresAt is valid
    if (license.expiresAt) {
      const now = new Date();
      const expiry = new Date(license.expiresAt);
      // Check if date is valid (not NaN)
      if (!isNaN(expiry.getTime()) && expiry < now) {
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
      }
    }
    
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <KeyRound className="h-6 w-6" />
              License Keys
            </h1>
            <p className="text-gray-500">Generate and manage license keys</p>
          </div>
          <Button onClick={() => {
            setGeneratedKeys([]);
            setShowGenerateModal(true);
          }} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="h-4 w-4 mr-2" />
            Generate Keys
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="all">All Tiers</option>
                <option value="BASIC">Basic</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="redeemed">Redeemed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* License Keys Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : licenses.length === 0 ? (
              <div className="text-center py-12">
                <KeyRound className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No license keys found</p>
                <Button onClick={() => setShowGenerateModal(true)} className="mt-4 bg-amber-500 hover:bg-amber-600">
                  Generate Your First Key
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Redeemed By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {licenses.map((license) => (
                      <tr key={license.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{license.key}</code>
                            <button
                              onClick={() => handleCopyKey(license.key)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                          {license.notes && (
                            <p className="text-xs text-gray-500 mt-1">{license.notes}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getTierColor(license.tier)}>{license.tier}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {license.duration} days
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(license)}
                        </td>
                        <td className="px-6 py-4">
                          {license.company ? (
                            <div>
                              <p className="text-sm font-medium">{license.company.name}</p>
                              <p className="text-xs text-gray-500">{license.company.email}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {format(new Date(license.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleViewKey(license.key)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!license.isRedeemed && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setKeyToDelete(license);
                                  setShowDeleteConfirm(true);
                                }}
                                title="Delete"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Generate Modal */}
        <Modal
          isOpen={showGenerateModal}
          onClose={() => {
            setShowGenerateModal(false);
            setGeneratedKeys([]);
          }}
          title="Generate License Keys"
        >
          {generatedKeys.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Generated {generatedKeys.length} license key(s)</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {generatedKeys.map((key: any) => (
                  <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <code className="font-mono text-sm">{key.key}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyKey(key.key)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setShowGenerateModal(false);
                  setGeneratedKeys([]);
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                <select
                  value={generateForm.tier}
                  onChange={(e) => setGenerateForm({ ...generateForm, tier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="BASIC">Basic - 100 products, 3 users, 1 location</option>
                  <option value="PROFESSIONAL">Professional - Unlimited products, 10 users, 10 locations</option>
                  <option value="ENTERPRISE">Enterprise - Everything unlimited</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <select
                  value={generateForm.duration}
                  onChange={(e) => setGenerateForm({ ...generateForm, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value={30}>30 days (Monthly)</option>
                  <option value={90}>90 days (Quarterly)</option>
                  <option value={180}>180 days (Semi-annual)</option>
                  <option value={365}>365 days (Annual)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Keys</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={generateForm.count}
                  onChange={(e) => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <Input
                  placeholder="Customer name or purpose"
                  value={generateForm.notes}
                  onChange={(e) => setGenerateForm({ ...generateForm, notes: e.target.value })}
                />
              </div>
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><KeyRound className="h-4 w-4 mr-2" /> Generate Keys</>
                )}
              </Button>
            </div>
          )}
        </Modal>

        {/* Key Details Modal */}
        <Modal
          isOpen={showKeyDetailsModal}
          onClose={() => setShowKeyDetailsModal(false)}
          title="License Key Details"
        >
          {selectedKey && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <code className="font-mono text-lg font-bold">{selectedKey.key}</code>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Tier</p>
                  <Badge className={getTierColor(selectedKey.tier)}>{selectedKey.tier}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{selectedKey.duration} days</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">
                    {selectedKey.isRedeemed ? 'Redeemed' : selectedKey.isExpired ? 'Expired' : 'Active'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expires</p>
                  <p className="font-medium">
                    {selectedKey.expiresAt ? format(new Date(selectedKey.expiresAt), 'MMM d, yyyy') : '-'}
                  </p>
                </div>
                {selectedKey.redeemedBy && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Redeemed By</p>
                      <p className="font-medium">{selectedKey.redeemedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Redeemed At</p>
                      <p className="font-medium">
                        {selectedKey.redeemedAt ? format(new Date(selectedKey.redeemedAt), 'MMM d, yyyy HH:mm') : '-'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setKeyToDelete(null);
          }}
          onConfirm={handleDelete}
          title="Delete License Key"
          message={`Are you sure you want to delete this license key? This action cannot be undone.`}
          confirmText="Delete"
        />
      </div>
    </AdminLayout>
  );
}
