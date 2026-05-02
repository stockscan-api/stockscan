'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { SelectInput } from '@/components/ui/select-input';
import { apiClient } from '@/lib/api-client';
import { useCurrency } from '@/contexts/currency-context';
import {
  ShoppingBag,
  Plus,
  Loader2,
  Search,
  Truck,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Trash2,
  FileText,
  DollarSign,
  Hash,
  Eye,
  ArrowDownToLine,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PurchaseOrder {
  id: string;
  poNumber?: string;
  supplierId: string;
  supplier?: { id: string; name: string };
  warehouseId?: string;
  warehouse?: { id: string; name: string };
  status: string;
  totalAmount?: number;
  notes?: string;
  items?: Array<{
    id: string;
    productId: string;
    quantityOrdered: number;
    quantityReceived?: number;
    unitPrice?: number;
    product?: { name: string; sku?: string };
  }>;
  createdBy?: { name: string };
  createdAt?: string;
  orderDate?: string;
}

interface POItem {
  productId: string;
  productName: string;
  sku?: string;
  quantityOrdered: number;
  unitPrice: number;
}

export default function PurchaseOrdersPage() {
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Form state
  const [formSupplier, setFormSupplier] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<POItem[]>([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [poRes, suppRes, whRes, prodRes] = await Promise.all([
        apiClient.getPurchaseOrders({ limit: 100 }).catch(() => []),
        apiClient.getSuppliers({ limit: 200 }).catch(() => []),
        apiClient.getWarehouses().catch(() => []),
        apiClient.getProducts({ limit: 500 }).catch(() => []),
      ]);
      setOrders(Array.isArray(poRes) ? poRes : poRes?.data || poRes?.purchaseOrders || []);
      const suppList = Array.isArray(suppRes) ? suppRes : suppRes?.data || suppRes?.suppliers || [];
      setSuppliers(suppList);
      setWarehouses(Array.isArray(whRes) ? whRes : whRes?.data || whRes?.warehouses || []);
      const prodList = Array.isArray(prodRes) ? prodRes : prodRes?.products || prodRes?.data || [];
      setProducts(prodList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addProduct = (product: any) => {
    const id = product.id;
    if (formItems.some(i => i.productId === id)) {
      toast.error('Product already added');
      return;
    }
    setFormItems([
      ...formItems,
      {
        productId: id,
        productName: product.name || 'Unknown',
        sku: product.sku,
        quantityOrdered: 1,
        unitPrice: product.costPrice || product.unitPrice || product.price || 0,
      },
    ]);
    setProductSearch('');
  };

  const updateItem = (idx: number, field: string, value: number) => {
    const updated = [...formItems];
    (updated[idx] as any)[field] = Math.max(field === 'unitPrice' ? 0 : 1, value);
    setFormItems(updated);
  };

  const removeItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplier) {
      toast.error('Select a supplier');
      return;
    }
    if (formItems.length === 0) {
      toast.error('Add at least one product');
      return;
    }
    try {
      setIsSubmitting(true);
      await apiClient.createPurchaseOrder({
        supplierId: formSupplier,
        warehouseId: formWarehouse || undefined,
        items: formItems.map(i => ({
          productId: i.productId,
          quantityOrdered: i.quantityOrdered,
          unitPrice: i.unitPrice || undefined,
        })),
        notes: formNotes || undefined,
      });
      toast.success('Purchase order created');
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setFormSupplier('');
    setFormWarehouse('');
    setFormNotes('');
    setFormItems([]);
    setProductSearch('');
  };

  const getStatusConfig = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'RECEIVED' || s === 'COMPLETED') return { label: status, color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
    if (s === 'PARTIAL' || s === 'PARTIALLY_RECEIVED') return { label: 'Partial', color: 'bg-blue-100 text-blue-700', icon: ArrowDownToLine };
    if (s === 'PENDING' || s === 'DRAFT' || s === 'ORDERED') return { label: status, color: 'bg-amber-100 text-amber-700', icon: Clock };
    if (s === 'CANCELLED') return { label: status, color: 'bg-red-100 text-red-700', icon: XCircle };
    return { label: status || 'Unknown', color: 'bg-gray-100 text-gray-700', icon: Clock };
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter && o.status?.toUpperCase() !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.poNumber?.toLowerCase().includes(q) ||
        o.supplier?.name?.toLowerCase().includes(q) ||
        o.notes?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredProducts = products.filter(p => {
    if (!productSearch) return false;
    const q = productSearch.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
  }).slice(0, 10);

  const formTotal = formItems.reduce((sum, i) => sum + (i.quantityOrdered * i.unitPrice), 0);

  return (
    <DashboardLayout allowedRoles={['MANAGER', 'OWNER']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-gray-500 mt-1">Order stock from suppliers</p>
          </div>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Order
          </Button>
        </div>

        {/* Summary Cards */}
        {orders.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Orders</p>
                    <p className="text-xl font-bold">{orders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="text-xl font-bold">
                      {orders.filter(o => ['PENDING', 'DRAFT', 'ORDERED'].includes(o.status?.toUpperCase())).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Received</p>
                    <p className="text-xl font-bold">
                      {orders.filter(o => ['RECEIVED', 'COMPLETED'].includes(o.status?.toUpperCase())).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Value</p>
                    <p className="text-lg font-bold">
                      {formatPrice(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <SelectInput
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-48"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ORDERED">Ordered</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </SelectInput>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {orders.length === 0 ? 'No Purchase Orders Yet' : 'No Matching Orders'}
              </h3>
              <p className="text-gray-500">
                {orders.length === 0
                  ? 'Create your first purchase order to start ordering from suppliers.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const statusCfg = getStatusConfig(order.status);
              const StatusIcon = statusCfg.icon;
              const isSelected = selectedOrder?.id === order.id;
              return (
                <Card
                  key={order.id}
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    isSelected ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedOrder(isSelected ? null : order)}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-orange-100 rounded-xl">
                          <ShoppingBag className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {order.poNumber && (
                              <span className="font-mono text-sm font-semibold text-gray-900">{order.poNumber}</span>
                            )}
                            <Badge className={`${statusCfg.color} text-xs`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusCfg.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Truck className="h-3.5 w-3.5" />
                              {order.supplier?.name || 'Unknown Supplier'}
                            </span>
                            {order.warehouse?.name && (
                              <span className="text-gray-400">→ {order.warehouse.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {order.totalAmount != null && (
                          <span className="font-semibold text-gray-900">{formatPrice(order.totalAmount)}</span>
                        )}
                        {order.items && (
                          <span className="text-gray-500 flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {order.items.length} items
                          </span>
                        )}
                        {(order.orderDate || order.createdAt) && (
                          <span className="text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(order.orderDate || order.createdAt || '').toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Detail view */}
                    {isSelected && order.items && order.items.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Items</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left py-2 px-3 font-medium text-gray-600">Product</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Ordered</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Received</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Unit Price</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, idx) => (
                                <tr key={item.id || idx} className="border-b">
                                  <td className="py-2 px-3">
                                    <span className="font-medium">{item.product?.name || 'Unknown'}</span>
                                    {item.product?.sku && <span className="text-gray-400 ml-2 text-xs font-mono">{item.product.sku}</span>}
                                  </td>
                                  <td className="py-2 px-3 text-right">{item.quantityOrdered}</td>
                                  <td className="py-2 px-3 text-right">{item.quantityReceived ?? '—'}</td>
                                  <td className="py-2 px-3 text-right">{item.unitPrice != null ? formatPrice(item.unitPrice) : '—'}</td>
                                  <td className="py-2 px-3 text-right font-medium">
                                    {item.unitPrice != null ? formatPrice(item.quantityOrdered * item.unitPrice) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {order.notes && (
                          <p className="text-xs text-gray-500 mt-3">Notes: {order.notes}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create PO Modal */}
        <Modal isOpen={isModalOpen} onClose={resetForm} title="New Purchase Order">
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <SelectInput
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  required
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Warehouse</label>
                <SelectInput
                  value={formWarehouse}
                  onChange={(e) => setFormWarehouse(e.target.value)}
                >
                  <option value="">Default warehouse</option>
                  {warehouses.filter(w => w.isActive !== false).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </SelectInput>
              </div>
            </div>

            {/* Product Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Add Products</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {filteredProducts.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                  {filteredProducts.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => addProduct(prod)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 flex justify-between items-center text-sm border-b last:border-b-0"
                    >
                      <span>
                        <span className="font-medium">{prod.name}</span>
                        {prod.sku && <span className="text-gray-400 ml-2 font-mono text-xs">{prod.sku}</span>}
                      </span>
                      <span className="text-gray-500">{formatPrice(prod.costPrice || prod.unitPrice || prod.price || 0)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items */}
            {formItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Items ({formItems.length})</label>
                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{item.productName}</span>
                        {item.sku && <span className="text-xs text-gray-400 font-mono">{item.sku}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="text-xs text-gray-500">Qty</span>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantityOrdered}
                            onChange={(e) => updateItem(idx, 'quantityOrdered', parseInt(e.target.value) || 1)}
                            className="w-20 text-center"
                          />
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Price</span>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 text-center"
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-24 text-right">
                          {formatPrice(item.quantityOrdered * item.unitPrice)}
                        </span>
                      </div>
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="text-right pt-2 border-t">
                    <span className="text-sm text-gray-500">Total: </span>
                    <span className="text-lg font-bold text-gray-900">{formatPrice(formTotal)}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional notes for this order"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || formItems.length === 0}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingBag className="h-4 w-4 mr-2" />}
                Create Order
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
