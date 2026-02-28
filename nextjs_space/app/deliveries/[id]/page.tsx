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
import { useCurrency } from '@/contexts/currency-context';
import toast from 'react-hot-toast';
import Image from 'next/image';
import {
  Truck,
  ArrowLeft,
  Loader2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  User,
  Package,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  PenTool,
  Save,
  Play,
  Square,
} from 'lucide-react';

interface LineItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  unitPrice: number;
}

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
  updatedAt: string;
  lineItems: LineItem[];
  createdBy?: { name: string };
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-800', bgColor: 'bg-yellow-100', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-800', bgColor: 'bg-blue-100', icon: Truck },
  COMPLETED: { label: 'Completed', color: 'text-green-800', bgColor: 'bg-green-100', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-red-800', bgColor: 'bg-red-100', icon: XCircle },
};

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const { formatPrice } = useCurrency();
  const deliveryId = params.id as string;

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: '',
    deliveryAddress: '',
    contactPhone: '',
    contactEmail: '',
    scheduledDate: '',
    notes: '',
  });

  // Signature modal
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signedBy, setSignedBy] = useState('');

  // Add line item modal
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [isAddingItem, setIsAddingItem] = useState(false);

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
        deliveryAddress: data.deliveryAddress || '',
        contactPhone: data.contactPhone || '',
        contactEmail: data.contactEmail || '',
        scheduledDate: data.scheduledDate ? data.scheduledDate.split('T')[0] : '',
        notes: data.notes || '',
      });
    } catch (error: any) {
      toast.error('Failed to load delivery details');
      router.push('/deliveries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDelivery = async () => {
    if (!editForm.customerName || !editForm.deliveryAddress) {
      toast.error('Customer name and address are required');
      return;
    }

    setIsUpdating(true);
    try {
      await apiClient.updateDelivery(deliveryId, {
        customerName: editForm.customerName,
        deliveryAddress: editForm.deliveryAddress,
        contactPhone: editForm.contactPhone || undefined,
        contactEmail: editForm.contactEmail || undefined,
        scheduledDate: editForm.scheduledDate || undefined,
        notes: editForm.notes || undefined,
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

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await apiClient.updateDelivery(deliveryId, {
        status: newStatus,
        completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
      });
      toast.success(`Status changed to ${statusConfig[newStatus]?.label || newStatus}`);
      fetchDelivery();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCaptureSignature = async (signatureData: string) => {
    if (!signedBy.trim()) {
      toast.error('Please enter the name of the person signing');
      return;
    }

    setIsUpdating(true);
    try {
      await apiClient.captureDeliverySignature(deliveryId, {
        signature: signatureData,
        signedBy: signedBy.trim(),
      });
      toast.success('Signature captured successfully');
      setShowSignatureModal(false);
      setSignedBy('');
      fetchDelivery();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save signature');
    } finally {
      setIsUpdating(false);
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

  // Line items
  const fetchProducts = async () => {
    try {
      const response = await apiClient.getProducts({ limit: 100 });
      const productList = response?.products || response?.data || (Array.isArray(response) ? response : []);
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const handleAddLineItem = async () => {
    if (!selectedProduct || itemQuantity <= 0) {
      toast.error('Please select a product and enter a valid quantity');
      return;
    }

    setIsAddingItem(true);
    try {
      await apiClient.addDeliveryLineItem(deliveryId, {
        productId: selectedProduct,
        quantity: itemQuantity,
        unitPrice: itemPrice,
      });
      toast.success('Item added');
      setShowAddItemModal(false);
      setSelectedProduct('');
      setItemQuantity(1);
      setItemPrice(0);
      fetchDelivery();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add item');
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteLineItem = async (lineItemId: string) => {
    if (!confirm('Remove this item?')) return;

    try {
      await apiClient.deleteDeliveryLineItem(deliveryId, lineItemId);
      toast.success('Item removed');
      fetchDelivery();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove item');
    }
  };

  const canManage = hasRole(['MANAGER', 'OWNER']);
  const canEdit = canManage && delivery?.status !== 'COMPLETED' && delivery?.status !== 'CANCELLED';

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
  const totalValue = delivery.lineItems?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;

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
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-800 font-mono text-lg px-3 py-1">
                {delivery.deliveryNumber}
              </Badge>
              <Badge className={`${status.bgColor} ${status.color}`}>
                <StatusIcon className="h-4 w-4 mr-1" />
                {status.label}
              </Badge>
              {delivery.signature && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Signed
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">{delivery.customerName}</h1>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              {delivery.status === 'PENDING' && (
                <Button
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isUpdating}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start Delivery
                </Button>
              )}
              {delivery.status === 'IN_PROGRESS' && !delivery.signature && (
                <Button
                  onClick={() => setShowSignatureModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <PenTool className="h-4 w-4 mr-1" />
                  Capture Signature
                </Button>
              )}
              {delivery.status === 'IN_PROGRESS' && delivery.signature && (
                <Button
                  onClick={() => handleStatusChange('COMPLETED')}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isUpdating}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete Delivery
                </Button>
              )}
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
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Delivery Address</p>
                      <p className="font-medium text-gray-900">{delivery.deliveryAddress}</p>
                    </div>
                  </div>

                  {delivery.contactPhone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium text-gray-900">{delivery.contactPhone}</p>
                      </div>
                    </div>
                  )}

                  {delivery.contactEmail && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{delivery.contactEmail}</p>
                      </div>
                    </div>
                  )}

                  {delivery.scheduledDate && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Scheduled Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(delivery.scheduledDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {delivery.notes && (
                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Notes</p>
                        <p className="text-gray-700">{delivery.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Line Items ({delivery.lineItems?.length || 0})
                </CardTitle>
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={() => {
                      fetchProducts();
                      setShowAddItemModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {delivery.lineItems?.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No items added yet</p>
                ) : (
                  <div className="space-y-3">
                    {delivery.lineItems?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                        </div>
                        <div className="text-right mr-4">
                          <p className="font-medium">{item.quantity} x {formatPrice(item.unitPrice)}</p>
                          <p className="text-sm text-gray-500">
                            Total: {formatPrice(item.quantity * item.unitPrice)}
                          </p>
                        </div>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLineItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    <div className="pt-3 border-t flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total Value</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatPrice(totalValue)}
                      </span>
                    </div>
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
                {delivery.signature ? (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-2 bg-white">
                      <Image
                        src={delivery.signature}
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
                    {delivery.completedAt && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>Completed: {new Date(delivery.completedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <PenTool className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No signature captured yet</p>
                    {delivery.status === 'IN_PROGRESS' && canManage && (
                      <Button
                        size="sm"
                        className="mt-3 bg-green-600 hover:bg-green-700"
                        onClick={() => setShowSignatureModal(true)}
                      >
                        <PenTool className="h-4 w-4 mr-1" />
                        Capture Signature
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
                  <span className="font-medium">{delivery.lineItems?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Value</span>
                  <span className="font-medium text-green-600">{formatPrice(totalValue)}</span>
                </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={editForm.deliveryAddress}
                onChange={(e) => setEditForm({ ...editForm, deliveryAddress: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  value={editForm.contactPhone}
                  onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={editForm.contactEmail}
                  onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
              <Input
                type="date"
                value={editForm.scheduledDate}
                onChange={(e) => setEditForm({ ...editForm, scheduledDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
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

        {/* Signature Modal */}
        <Modal
          isOpen={showSignatureModal}
          onClose={() => {
            setShowSignatureModal(false);
            setSignedBy('');
          }}
          title="Capture Customer Signature"
        >
          <div className="space-y-4">
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
                onSave={handleCaptureSignature}
                onCancel={() => {
                  setShowSignatureModal(false);
                  setSignedBy('');
                }}
                width={400}
                height={200}
                disabled={isUpdating}
              />
            </div>
          </div>
        </Modal>

        {/* Add Line Item Modal */}
        <Modal
          isOpen={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          title="Add Line Item"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  const product = products.find(p => p.id === e.target.value);
                  if (product) {
                    setItemPrice(product.price || 0);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={itemPrice}
                  onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Line Total: <strong className="text-green-600">{formatPrice(itemQuantity * itemPrice)}</strong>
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddItemModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddLineItem} disabled={isAddingItem}>
                {isAddingItem ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Item
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
