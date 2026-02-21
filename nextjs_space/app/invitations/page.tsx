'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { SelectInput } from '@/components/ui/select-input';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api-client';
import { Plus, Mail, Clock, Trash2, Copy, Loader2, UserPlus, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Invitation {
  id: string;
  code: string;
  email?: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  isUsed: boolean;
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    role: 'STAFF',
    expiresInDays: 7,
  });

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const data = await apiClient.getInvitations();
      setInvitations(Array.isArray(data) ? data : data.invitations || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await apiClient.createInvitation({
        email: formData.email || undefined,
        role: formData.role,
        expiresInDays: formData.expiresInDays,
      });
      toast.success('Invitation created successfully');
      setIsModalOpen(false);
      setFormData({ email: '', role: 'STAFF', expiresInDays: 7 });
      loadInvitations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invitation');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiClient.deleteInvitation(deleteId);
      toast.success('Invitation revoked');
      setDeleteId(null);
      loadInvitations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke invitation');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Invitation code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const roleColors: Record<string, string> = {
    STAFF: 'bg-green-100 text-green-800',
    MANAGER: 'bg-blue-100 text-blue-800',
    OWNER: 'bg-purple-100 text-purple-800',
  };

  const pendingInvitations = invitations.filter(inv => !inv.isUsed && new Date(inv.expiresAt) > new Date());
  const usedInvitations = invitations.filter(inv => inv.isUsed);
  const expiredInvitations = invitations.filter(inv => !inv.isUsed && new Date(inv.expiresAt) <= new Date());

  return (
    <DashboardLayout allowedRoles={['MANAGER', 'OWNER']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Invitations</h1>
            <p className="text-gray-500">Invite new team members to your company</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Invitation
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Pending Invitations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  Pending Invitations ({pendingInvitations.length})
                </CardTitle>
                <CardDescription>Active invitation codes that haven&apos;t been used yet</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingInvitations.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pending invitations</p>
                ) : (
                  <div className="space-y-3">
                    {pendingInvitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="font-mono text-lg font-medium text-blue-600">{inv.code}</div>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${roleColors[inv.role]}`}>
                            {inv.role}
                          </span>
                          {inv.email && (
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {inv.email}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Expires {format(new Date(inv.expiresAt), 'MMM d, yyyy')}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(inv.code)}
                          >
                            {copiedCode === inv.code ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteId(inv.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Used Invitations */}
            {usedInvitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Used Invitations ({usedInvitations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {usedInvitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="font-mono text-gray-500">{inv.code}</div>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${roleColors[inv.role]}`}>
                            {inv.role}
                          </span>
                          {inv.email && <span className="text-sm text-gray-500">{inv.email}</span>}
                        </div>
                        <span className="text-sm text-green-600 font-medium">Used</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expired Invitations */}
            {expiredInvitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-500">Expired Invitations ({expiredInvitations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {expiredInvitations.slice(0, 5).map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg opacity-60">
                        <div className="flex items-center gap-4">
                          <div className="font-mono text-gray-400">{inv.code}</div>
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-600">
                            {inv.role}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">Expired</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Create Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create Invitation"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <Input
                type="email"
                placeholder="newuser@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to create a generic invitation code</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <SelectInput
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                options={[
                  { value: 'STAFF', label: 'Staff - View products, adjust stock' },
                  { value: 'MANAGER', label: 'Manager - Full operational access' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires In</label>
              <SelectInput
                value={formData.expiresInDays.toString()}
                onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })}
                options={[
                  { value: '1', label: '1 day' },
                  { value: '3', label: '3 days' },
                  { value: '7', label: '7 days' },
                  { value: '14', label: '14 days' },
                  { value: '30', label: '30 days' },
                ]}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create Invitation
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title="Revoke Invitation"
          message="Are you sure you want to revoke this invitation? The code will no longer be valid."
          confirmText="Revoke"
        />
      </div>
    </DashboardLayout>
  );
}
