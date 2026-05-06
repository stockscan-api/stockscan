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
  ArrowRightLeft,
  Plus,
  Loader2,
  Package,
  Search,
  ArrowRight,
  Warehouse,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Transfer {
  id: string;
  transferNumber?: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  fromWarehouse?: { id: string; name: string };
  toWarehouse?: { id: string; name: string };
  status: string;
  notes?: string;
  items?: Array<{ id: string; productId: string; quantity: number; product?: { name: string; sku?: string } }>;
  createdBy?: { name: string };
  createdAt?: string;
}

interface TransferItem {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  maxQty?: number;
}

export default function StockTransfersPage() {
  const { formatPrice } = useCurrency();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Transfer form state
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [availableStock, setAvailableStock] = useState<any[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [transfersRes, warehousesRes] = await Promise.all([
        apiClient.getStockTransfers({ limit: 100 }).catch(() => []),
        apiClient.getWarehouses().catch(() => []),
      ]);
      const tList = Array.isArray(transfersRes) ? transfersRes : transfersRes?.data || transfersRes?.transfers || [];
      const wList = Array.isArray(warehousesRes) ? warehousesRes : warehousesRes?.data || warehousesRes?.warehouses || [];
      setTransfers(tList);
      setWarehouses(wList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSourceStock = async (warehouseId: string) => {
    if (!warehouseId) return;
    try {
      setStockLoading(true);
      const res = await apiClient.getWarehouseStock(warehouseId, { limit: 500 });
      const list = Array.isArray(res) ? res : res?.data || res?.stock || res?.warehouseStock || [];
      setAvailableStock(list);
    } catch {
      setAvailableStock([]);
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    if (fromWarehouse) {
      fetchSourceStock(fromWarehouse);
      setTransferItems([]);
    }
  }, [fromWarehouse]);

  const addProduct = (stock: any) => {
    const productId = stock.productId || stock.product?.id;
    if (transferItems.some(i => i.productId === productId)) {
      toast.error('Product already added');
      return;
    }
    setTransferItems([
      ...transferItems,
      {
        productId,
        productName: stock.product?.name || 'Unknown',
        sku: stock.product?.sku,
        quantity: 1,
        maxQty: stock.quantity || 999,
      },
    ]);
    setProductSearch('');
  };

  const updateItemQty = (idx: number, qty: number) => {
    const updated = [...transferItems];
    updated[idx].quantity = Math.max(1, Math.min(qty, updated[idx].maxQty || 999));
    setTransferItems(updated);
  };

  const removeItem = (idx: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== idx));
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouse || !toWarehouse) {
      toast.error('Select both source and destination warehouses');
      return;
    }
    if (fromWarehouse === toWarehouse) {
      toast.error('Source and destination must be different');
      return;
    }
    if (transferItems.length === 0) {
      toast.error('Add at least one product to transfer');
      return;
    }
    try {
      setIsSubmitting(true);
      const fromWh = warehouses.find((w: any) => w.id === fromWarehouse);
      const toWh = warehouses.find((w: any) => w.id === toWarehouse);
      await apiClient.createStockTransfer({
        fromLocation: fromWh?.name || 'Unknown',
        toLocation: toWh?.name || 'Unknown',
        fromWarehouseId: fromWarehouse,
        toWarehouseId: toWarehouse,
        items: transferItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
        notes: transferNotes || undefined,
      });
      toast.success('Stock transfer created successfully');
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setFromWarehouse('');
    setToWarehouse('');
    setTransferNotes('');
    setTransferItems([]);
    setProductSearch('');
    setAvailableStock([]);
  };

  const getStatusConfig = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED' || s === 'RECEIVED') return { label: status, color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
    if (s === 'PENDING' || s === 'IN_TRANSIT') return { label: status, color: 'bg-amber-100 text-amber-700', icon: Clock };
    if (s === 'CANCELLED') return { label: status, color: 'bg-red-100 text-red-700', icon: XCircle };
    return { label: status || 'Unknown', color: 'bg-gray-100 text-gray-700', icon: Clock };
  };

  const printDeliveryNote = (transfer: Transfer) => {
    const fromName = transfer.fromWarehouse?.name || 'Unknown';
    const toName = transfer.toWarehouse?.name || 'Unknown';
    const dateStr = transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A';
    const items = transfer.items || [];

    const itemRows = items.map((item, idx) => `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:center;">${idx + 1}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; font-weight:500;">${item.product?.name || 'Unknown Product'}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; font-family:monospace; font-size:12px; color:#6b7280;">${item.product?.sku || '-'}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:center; font-weight:600; font-size:16px;">${item.quantity}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; width:100px;"></td>
      </tr>
    `).join('');

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>Delivery Note - ${transfer.transferNumber || 'Transfer'}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1f2937; padding:40px; max-width:800px; margin:0 auto; }
        @media print {
          body { padding:20px; }
          .no-print { display:none !important; }
        }
      </style></head><body>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px; padding-bottom:20px; border-bottom:3px solid #2563eb;">
        <div>
          <h1 style="font-size:24px; font-weight:700; color:#1e40af;">DELIVERY NOTE</h1>
          <p style="color:#6b7280; margin-top:4px;">Stock Transfer Picking List</p>
        </div>
        <div style="text-align:right;">
          ${transfer.transferNumber ? `<p style="font-size:14px; font-weight:600; color:#1f2937;">Ref: ${transfer.transferNumber}</p>` : ''}
          <p style="font-size:13px; color:#6b7280;">Date: ${dateStr}</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:30px;">
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px;">
          <p style="font-size:11px; text-transform:uppercase; color:#3b82f6; font-weight:600; margin-bottom:4px;">Pick From</p>
          <p style="font-size:16px; font-weight:600; color:#1e40af;">${fromName}</p>
        </div>
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px;">
          <p style="font-size:11px; text-transform:uppercase; color:#22c55e; font-weight:600; margin-bottom:4px;">Deliver To</p>
          <p style="font-size:16px; font-weight:600; color:#166534;">${toName}</p>
        </div>
      </div>

      ${transfer.notes ? `<p style="background:#fefce8; border:1px solid #fde68a; border-radius:6px; padding:10px 14px; font-size:13px; color:#854d0e; margin-bottom:20px;"><strong>Notes:</strong> ${transfer.notes}</p>` : ''}

      <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px; text-align:center; font-size:12px; font-weight:600; color:#6b7280; width:50px;">#</th>
            <th style="padding:10px 12px; text-align:left; font-size:12px; font-weight:600; color:#6b7280;">Product</th>
            <th style="padding:10px 12px; text-align:left; font-size:12px; font-weight:600; color:#6b7280;">SKU</th>
            <th style="padding:10px 12px; text-align:center; font-size:12px; font-weight:600; color:#6b7280; width:80px;">Qty</th>
            <th style="padding:10px 12px; text-align:center; font-size:12px; font-weight:600; color:#6b7280; width:100px;">Picked ✓</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="margin-top:40px; display:grid; grid-template-columns:1fr 1fr; gap:30px;">
        <div>
          <p style="font-size:12px; color:#6b7280; margin-bottom:8px;">Picked By:</p>
          <div style="border-bottom:1px solid #d1d5db; height:40px;"></div>
          <p style="font-size:11px; color:#9ca3af; margin-top:4px;">Name / Date</p>
        </div>
        <div>
          <p style="font-size:12px; color:#6b7280; margin-bottom:8px;">Received By:</p>
          <div style="border-bottom:1px solid #d1d5db; height:40px;"></div>
          <p style="font-size:11px; color:#9ca3af; margin-top:4px;">Name / Date</p>
        </div>
      </div>

      <div class="no-print" style="margin-top:30px; text-align:center;">
        <button onclick="window.print()" style="background:#2563eb; color:white; border:none; padding:12px 32px; border-radius:8px; cursor:pointer; font-size:14px; font-weight:600;">
          Print Delivery Note
        </button>
      </div>
      </body></html>`);
      w.document.close();
    }
  };

  const filteredTransfers = transfers.filter(t => {
    if (statusFilter && t.status?.toUpperCase() !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.transferNumber?.toLowerCase().includes(q) ||
        t.fromWarehouse?.name?.toLowerCase().includes(q) ||
        t.toWarehouse?.name?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredAvailableStock = availableStock.filter(s => {
    if (!productSearch) return false;
    const q = productSearch.toLowerCase();
    return (
      s.product?.name?.toLowerCase().includes(q) ||
      s.product?.sku?.toLowerCase().includes(q)
    );
  }).slice(0, 10);

  return (
    <DashboardLayout allowedRoles={['MANAGER', 'OWNER']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Transfers</h1>
            <p className="text-gray-500 mt-1">Move inventory between warehouses</p>
          </div>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search transfers..."
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
            <option value="IN_TRANSIT">In Transit</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </SelectInput>
        </div>

        {/* Transfers List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredTransfers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ArrowRightLeft className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {transfers.length === 0 ? 'No Transfers Yet' : 'No Matching Transfers'}
              </h3>
              <p className="text-gray-500">
                {transfers.length === 0 ? 'Create your first stock transfer to move inventory between warehouses.' : 'Try adjusting your search or filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTransfers.map((transfer) => {
              const statusCfg = getStatusConfig(transfer.status);
              const StatusIcon = statusCfg.icon;
              return (
                <Card key={transfer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-100 rounded-xl">
                          <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {transfer.transferNumber && (
                              <span className="font-mono text-sm font-semibold text-gray-900">{transfer.transferNumber}</span>
                            )}
                            <Badge className={`${statusCfg.color} text-xs`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusCfg.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-700">{transfer.fromWarehouse?.name || 'Unknown'}</span>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-700">{transfer.toWarehouse?.name || 'Unknown'}</span>
                          </div>
                          {transfer.notes && (
                            <p className="text-xs text-gray-500 mt-1">{transfer.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {transfer.items && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {transfer.items.length} items
                          </span>
                        )}
                        {transfer.createdBy?.name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {transfer.createdBy.name}
                          </span>
                        )}
                        {transfer.createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(transfer.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {transfer.items && transfer.items.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); printDeliveryNote(transfer); }}
                            className="ml-1 text-xs"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Delivery Note
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Show items preview */}
                    {transfer.items && transfer.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex flex-wrap gap-2">
                          {transfer.items.slice(0, 5).map((item, idx) => (
                            <span key={item.id || idx} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                              {item.product?.name || item.productId} × {item.quantity}
                            </span>
                          ))}
                          {transfer.items.length > 5 && (
                            <span className="text-xs text-gray-500">+{transfer.items.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Transfer Modal */}
        <Modal isOpen={isModalOpen} onClose={resetForm} title="New Stock Transfer">
          <form onSubmit={handleCreateTransfer} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Warehouse *</label>
                <SelectInput
                  value={fromWarehouse}
                  onChange={(e) => setFromWarehouse(e.target.value)}
                  required
                >
                  <option value="">Select source...</option>
                  {warehouses.filter(w => w.isActive !== false).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Warehouse *</label>
                <SelectInput
                  value={toWarehouse}
                  onChange={(e) => setToWarehouse(e.target.value)}
                  required
                >
                  <option value="">Select destination...</option>
                  {warehouses.filter(w => w.isActive !== false && w.id !== fromWarehouse).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </SelectInput>
              </div>
            </div>

            {/* Product Search */}
            {fromWarehouse && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add Products</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products in source warehouse..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {stockLoading && (
                  <div className="text-center py-2"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                )}
                {filteredAvailableStock.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                    {filteredAvailableStock.map((stock, idx) => (
                      <button
                        key={stock.id || idx}
                        type="button"
                        onClick={() => addProduct(stock)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 flex justify-between items-center text-sm border-b last:border-b-0"
                      >
                        <span>
                          <span className="font-medium">{stock.product?.name}</span>
                          {stock.product?.sku && <span className="text-gray-400 ml-2 font-mono text-xs">{stock.product.sku}</span>}
                        </span>
                        <span className="text-gray-500">Qty: {stock.quantity}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Transfer Items */}
            {transferItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Items ({transferItems.length})</label>
                <div className="space-y-2">
                  {transferItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex-1">
                        <span className="text-sm font-medium">{item.productName}</span>
                        {item.sku && <span className="text-xs text-gray-400 ml-2 font-mono">{item.sku}</span>}
                        <span className="text-xs text-gray-400 ml-2">(max: {item.maxQty})</span>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={item.maxQty}
                        value={item.quantity}
                        onChange={(e) => updateItemQty(idx, parseInt(e.target.value) || 1)}
                        className="w-24 text-center"
                      />
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <Input
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Optional transfer notes"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || transferItems.length === 0}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
                Create Transfer
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
