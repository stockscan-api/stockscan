'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { SignaturePad } from '@/components/signature-pad';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import toast from 'react-hot-toast';
import Image from 'next/image';
import {
  Truck,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Calendar,
  Phone,
  Mail,
  User,
  Package,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  PenTool,
  Save,
  Download,
  Send,
  Ban,
  Warehouse,
} from 'lucide-react';

interface DeliveryItem {
  id: string;
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
  status: 'PENDING' | 'DELIVERED' | 'COLLECTED' | 'CANCELLED';
  deliveryType?: 'CUSTOMER' | 'TRANSFER';
  fulfillmentMethod?: 'DELIVERY' | 'COLLECTION';
  sourceWarehouse?: { id: string; name: string; code?: string };
  destinationWarehouse?: { id: string; name: string; code?: string };
  stockTransferId?: string;
  deliveryDate?: string;
  signatureUrl?: string;
  signedBy?: string;
  signedAt?: string;
  items: DeliveryItem[];
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// v1.14.1 status config: PENDING | DELIVERED | COLLECTED | CANCELLED
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-800', bgColor: 'bg-yellow-100', icon: Clock },
  DELIVERED: { label: 'Delivered', color: 'text-green-800', bgColor: 'bg-green-100', icon: CheckCircle },
  COLLECTED: { label: 'Collected', color: 'text-green-800', bgColor: 'bg-green-100', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-red-800', bgColor: 'bg-red-100', icon: XCircle },
};

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const deliveryId = params.id as string;

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    sageOrderReference: '',
    deliveryDate: '',
  });

  // Signature/Collect modal
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [signedBy, setSignedBy] = useState('');

  // Email PDF modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (deliveryId) {
      fetchDelivery();
    }
  }, [deliveryId]);

  const fetchDelivery = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getDelivery(deliveryId);
      setDelivery(data);
      setEditForm({
        customerName: data.customerName || '',
        customerEmail: data.customerEmail || '',
        customerPhone: data.customerPhone || '',
        sageOrderReference: data.sageOrderReference || '',
        deliveryDate: data.deliveryDate ? data.deliveryDate.split('T')[0] : '',
      });
      setEmailRecipient(data.customerEmail || '');
    } catch (error: any) {
      toast.error('Failed to load delivery details');
      router.push('/deliveries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDelivery = async () => {
    if (!editForm.customerName) {
      toast.error('Customer name is required');
      return;
    }

    setIsUpdating(true);
    try {
      await apiClient.updateDelivery(deliveryId, {
        customerName: editForm.customerName,
        customerEmail: editForm.customerEmail || undefined,
        customerPhone: editForm.customerPhone || undefined,
        sageOrderReference: editForm.sageOrderReference || undefined,
        deliveryDate: editForm.deliveryDate || undefined,
      });
      toast.success('Delivery updated');
      setShowEditModal(false);
      fetchDelivery();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update delivery');
    } finally {
      setIsUpdating(false);
    }
  };

  // Collect delivery with signature (v1.2.25)
  const handleCollectDelivery = async (signatureData: string) => {
    if (!signedBy.trim()) {
      toast.error('Please enter the name of the person signing');
      return;
    }

    setIsUpdating(true);
    try {
      await apiClient.collectDelivery(deliveryId, {
        signatureBase64: signatureData,
        signedBy: signedBy.trim(),
      });
      toast.success('Delivery collected successfully');
      setShowCollectModal(false);
      setSignedBy('');
      fetchDelivery();
    } catch (error: any) {
      toast.error(error.message || 'Failed to collect delivery');
    } finally {
      setIsUpdating(false);
    }
  };

  // Cancel delivery (v1.2.25)
  const handleCancelDelivery = async () => {
    if (!confirm('Are you sure you want to cancel this delivery?')) return;

    setIsUpdating(true);
    try {
      await apiClient.cancelDelivery(deliveryId);
      toast.success('Delivery cancelled');
      fetchDelivery();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel delivery');
    } finally {
      setIsUpdating(false);
    }
  };

  // Export PDF (v1.2.25)
  const handleExportPdf = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf' });
      const result = await apiClient.exportDeliveryPdf(deliveryId);
      
      // Download the PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${result.pdfBase64}`;
      link.download = result.filename || `delivery-${delivery?.deliveryNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('PDF downloaded', { id: 'pdf' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to export PDF', { id: 'pdf' });
    }
  };

  // Email PDF (v1.2.25)
  const handleEmailPdf = async () => {
    if (!emailRecipient.trim()) {
      toast.error('Please enter a recipient email');
      return;
    }

    setIsSendingEmail(true);
    try {
      const result = await apiClient.emailDeliveryPdf(deliveryId, emailRecipient.trim());
      toast.success(result.message || 'Email sent successfully');
      setShowEmailModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDeleteDelivery = async () => {
    if (!confirm('Are you sure you want to delete this delivery?')) return;

    try {
      await apiClient.deleteDelivery(deliveryId);
      toast.success('Delivery deleted');
      router.push('/deliveries');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete delivery');
    }
  };

  const canManage = hasRole(['MANAGER', 'OWNER']);
  const canCollect = hasRole(['STAFF', 'MANAGER', 'OWNER', 'DELIVERY_CLERK']);
  const canEdit = canManage && delivery?.status === 'PENDING';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!delivery) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Delivery not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const status = statusConfig[delivery.status] || statusConfig.PENDING;
  const StatusIcon = status.icon;
  const isTransfer = delivery.deliveryType === 'TRANSFER';
  const isDeliveryFulfillment = delivery.fulfillmentMethod === 'DELIVERY';
  const signatureActionLabel = isDeliveryFulfillment ? 'Mark Delivered' : 'Collect with Signature';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <button
              onClick={() => router.push('/deliveries')}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Deliveries
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className="bg-blue-100 text-blue-800 font-mono text-lg px-3 py-1">
                {delivery.deliveryNumber}
              </Badge>
              {/* Type badge */}
              {isTransfer ? (
                <Badge className="bg-orange-100 text-orange-800">
                  <Warehouse className="h-4 w-4 mr-1" />
                  Stock Transfer
                </Badge>
              ) : (
                <Badge className="bg-indigo-100 text-indigo-800">
                  <Truck className="h-4 w-4 mr-1" />
                  Customer
                </Badge>
              )}
              {/* Fulfillment badge */}
              {delivery.fulfillmentMethod && (
                <Badge className={isDeliveryFulfillment ? 'bg-cyan-100 text-cyan-800' : 'bg-teal-100 text-teal-800'}>
                  {isDeliveryFulfillment ? 'Delivery' : 'Collection'}
                </Badge>
              )}
              <Badge className={`${status.bgColor} ${status.color}`}>
                <StatusIcon className="h-4 w-4 mr-1" />
                {status.label}
              </Badge>
              {delivery.signatureUrl && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Signed
                </Badge>
              )}
              {delivery.sageOrderReference && (
                <Badge className="bg-purple-100 text-purple-800">
                  <FileText className="h-4 w-4 mr-1" />
                  {delivery.sageOrderReference}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">{delivery.customerName}</h1>

            {/* Warehouse route for transfers */}
            {isTransfer && (delivery.sourceWarehouse || delivery.destinationWarehouse) && (
              <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 px-3 py-2 rounded-md w-fit mt-2">
                <Warehouse className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{delivery.sourceWarehouse?.name || 'Unknown'}</span>
                <ArrowRight className="h-3 w-3 flex-shrink-0" />
                <span className="font-medium">{delivery.destinationWarehouse?.name || 'Unknown'}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* PDF Actions - available to all who can view */}
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <Download className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEmailModal(true)}>
              <Send className="h-4 w-4 mr-1" />
              Email PDF
            </Button>

            {/* Signature action - only for PENDING deliveries */}
            {delivery.status === 'PENDING' && canCollect && (
              <Button
                onClick={() => setShowCollectModal(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <PenTool className="h-4 w-4 mr-1" />
                {signatureActionLabel}
              </Button>
            )}

            {/* Cancel - only for PENDING deliveries */}
            {delivery.status === 'PENDING' && canCollect && (
              <Button
                variant="outline"
                onClick={handleCancelDelivery}
                disabled={isUpdating}
                className="text-red-600 hover:bg-red-50"
              >
                <Ban className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}

            {/* Edit/Delete - only for managers on PENDING */}
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteDelivery}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  {isTransfer ? 'Transfer Details' : 'Customer Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {delivery.customerPhone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium text-gray-900">{delivery.customerPhone}</p>
                      </div>
                    </div>
                  )}

                  {delivery.customerEmail && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{delivery.customerEmail}</p>
                      </div>
                    </div>
                  )}

                  {delivery.deliveryDate && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Delivery Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(delivery.deliveryDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {delivery.sageOrderReference && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Sage Order Reference</p>
                        <p className="font-medium text-gray-900">{delivery.sageOrderReference}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Delivery Items ({delivery.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {delivery.items?.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No items in this delivery</p>
                ) : (
                  <div className="space-y-3">
                    {delivery.items?.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.productName || `Product ${item.productId}`}</p>
                          {item.notes && <p className="text-sm text-gray-500">{item.notes}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Signature Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-green-600" />
                  Signature
                </CardTitle>
              </CardHeader>
              <CardContent>
                {delivery.signatureUrl ? (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-2 bg-white">
                      <Image
                        src={delivery.signatureUrl}
                        alt="Customer signature"
                        width={300}
                        height={150}
                        className="w-full h-auto"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>Signed by: <strong>{delivery.signedBy}</strong></span>
                    </div>
                    {delivery.signedAt && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>At: {new Date(delivery.signedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <PenTool className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No signature captured yet</p>
                    {delivery.status === 'PENDING' && canCollect && (
                      <Button
                        size="sm"
                        className="mt-3 bg-green-600 hover:bg-green-700"
                        onClick={() => setShowCollectModal(true)}
                      >
                        <PenTool className="h-4 w-4 mr-1" />
                        {isDeliveryFulfillment ? 'Capture Delivery Signature' : 'Collect Now'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {delivery.deliveryType && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium">{isTransfer ? 'Stock Transfer' : 'Customer'}</span>
                  </div>
                )}
                {delivery.fulfillmentMethod && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fulfillment</span>
                    <span className="font-medium">{isDeliveryFulfillment ? 'Delivery' : 'Collection'}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="font-medium">
                    {new Date(delivery.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="font-medium">
                    {new Date(delivery.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Items</span>
                  <span className="font-medium">{delivery.items?.length || 0}</span>
                </div>
                {delivery.createdBy && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created By</span>
                    <span className="font-medium">{delivery.createdBy.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Delivery"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={editForm.customerName}
                onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={editForm.customerEmail}
                  onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sage Order Reference</label>
              <Input
                value={editForm.sageOrderReference}
                onChange={(e) => setEditForm({ ...editForm, sageOrderReference: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
              <Input
                type="date"
                value={editForm.deliveryDate}
                onChange={(e) => setEditForm({ ...editForm, deliveryDate: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateDelivery} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>

        {/* Collect/Signature Modal */}
        <Modal
          isOpen={showCollectModal}
          onClose={() => {
            setShowCollectModal(false);
            setSignedBy('');
          }}
          title={isDeliveryFulfillment ? 'Mark Delivered - Capture Signature' : 'Collect Delivery - Capture Signature'}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                {isDeliveryFulfillment ? 'Confirming delivery of' : 'Collecting delivery'}{' '}
                <strong>{delivery.deliveryNumber}</strong> for <strong>{delivery.customerName}</strong>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name of Person Signing <span className="text-red-500">*</span>
              </label>
              <Input
                value={signedBy}
                onChange={(e) => setSignedBy(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Signature
              </label>
              <SignaturePad
                onSave={handleCollectDelivery}
                onCancel={() => {
                  setShowCollectModal(false);
                  setSignedBy('');
                }}
                width={400}
                height={200}
                disabled={isUpdating}
              />
            </div>
          </div>
        </Modal>

        {/* Email PDF Modal */}
        <Modal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          title="Email Delivery Note"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Send the delivery note PDF for <strong>{delivery.deliveryNumber}</strong> via email.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEmailModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleEmailPdf} disabled={isSendingEmail}>
                {isSendingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send Email
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
