'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import { useCurrency } from '@/contexts/currency-context';
import { useAuth } from '@/contexts/auth-context';
import {
  Warehouse,
  Plus,
  Edit2,
  Trash2,
  Package,
  MapPin,
  Loader2,
  Search,
  BarChart3,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Eye,
  Star,
  TrendingUp,
  Box,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface WarehouseData {
  id: string;
  name: string;
  code?: string;
  address?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  _count?: { warehouseStock?: number };
  stockSummary?: { totalProducts?: number; totalQuantity?: number; totalValue?: number; lowStockCount?: number };
}

interface WarehouseStock {
  id: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    sku?: string;
    category?: string;
    unitPrice?: number;
    price?: number;
    reorderThreshold?: number;
  };
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function WarehousesPage() {
  const { formatPrice } = useCurrency();
  const { hasRole } = useAuth();
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'manage'>('overview');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', address: '', isDefault: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStock[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getWarehouses();
      const list = Array.isArray(response) ? response : response?.data || response?.warehouses || [];
      setWarehouses(list);
    } catch (err: any) {
      console.error('Failed to fetch warehouses:', err);
      toast.error('Failed to load warehouses');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWarehouseStock = async (warehouseId: string) => {
    try {
      setStockLoading(true);
      setSelectedWarehouse(warehouseId);
      const response = await apiClient.getWarehouseStock(warehouseId, { limit: 200 });
      const stockList = Array.isArray(response) ? response : response?.data || response?.stock || response?.warehouseStock || [];
      setWarehouseStock(stockList);
    } catch (err: any) {
      console.error('Failed to fetch warehouse stock:', err);
      toast.error('Failed to load stock levels');
      setWarehouseStock([]);
    } finally {
      setStockLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Warehouse name is required');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('Warehouse code is required');
      return;
    }
    try {
      setIsSubmitting(true);
      if (editingWarehouse) {
        await apiClient.updateWarehouse(editingWarehouse.id, formData);
        toast.success('Warehouse updated successfully');
      } else {
        await apiClient.createWarehouse(formData);
        toast.success('Warehouse created successfully');
      }
      resetForm();
      fetchWarehouses();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteWarehouse(id);
      toast.success('Warehouse deleted');
      setDeleteConfirm(null);
      fetchWarehouses();
      if (selectedWarehouse === id) {
        setSelectedWarehouse(null);
        setWarehouseStock([]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete warehouse');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', code: '', address: '', isDefault: false });
    setIsCreateModalOpen(false);
    setEditingWarehouse(null);
  };

  const openEdit = (wh: WarehouseData) => {
    setEditingWarehouse(wh);
    setFormData({
      name: wh.name || '',
      code: wh.code || '',
      address: wh.address || '',
      isDefault: wh.isDefault || false,
    });
    setIsCreateModalOpen(true);
  };

  // Compute overview stats
  const totalWarehouses = warehouses.length;
  const activeWarehouses = warehouses.filter(w => w.isActive !== false).length;
  const totalStockItems = warehouses.reduce((sum, w) => sum + (w.stockSummary?.totalProducts || w._count?.warehouseStock || 0), 0);
  const totalStockValue = warehouses.reduce((sum, w) => sum + (w.stockSummary?.totalValue || 0), 0);
  const totalLowStock = warehouses.reduce((sum, w) => sum + (w.stockSummary?.lowStockCount || 0), 0);

  const chartData = warehouses.map(w => ({
    name: w.name?.length > 12 ? w.name.substring(0, 12) + '...' : w.name,
    products: w.stockSummary?.totalProducts || w._count?.warehouseStock || 0,
    quantity: w.stockSummary?.totalQuantity || 0,
    value: w.stockSummary?.totalValue || 0,
  }));

  const filteredStock = warehouseStock.filter(s => {
    if (!stockSearch) return true;
    const q = stockSearch.toLowerCase();
    return (
      s.product?.name?.toLowerCase().includes(q) ||
      s.product?.sku?.toLowerCase().includes(q)
    );
  });

  const selectedWh = warehouses.find(w => w.id === selectedWarehouse);

  return (
    <DashboardLayout allowedRoles={['MANAGER', 'OWNER']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warehouse Management</h1>
            <p className="text-gray-500 mt-1">Overview of all warehouses and stock levels</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('overview')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeView === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-1.5" />
                Overview
              </button>
              <button
                onClick={() => setActiveView('manage')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeView === 'manage' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 className="h-4 w-4 inline mr-1.5" />
                Manage
              </button>
            </div>
            {hasRole(['OWNER']) && (
              <Button onClick={() => { resetForm(); setIsCreateModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Warehouse
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : warehouses.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Warehouse className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Warehouses Found</h3>
              <p className="text-gray-500 mb-6">Create your first warehouse to start managing multi-location inventory.</p>
              {hasRole(['OWNER']) && (
                <Button onClick={() => { resetForm(); setIsCreateModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Warehouse
                </Button>
              )}
            </CardContent>
          </Card>
        ) : activeView === 'overview' ? (
          /* ========== OVERVIEW VIEW ========== */
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Warehouses</p>
                      <p className="text-2xl font-bold text-blue-900">{totalWarehouses}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600 font-medium">Active</p>
                      <p className="text-2xl font-bold text-green-900">{activeWarehouses}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-purple-600 font-medium">Total Products</p>
                      <p className="text-2xl font-bold text-purple-900">{totalStockItems}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-600 font-medium">Stock Value</p>
                      <p className="text-xl font-bold text-amber-900">{formatPrice(totalStockValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-red-600 font-medium">Low Stock</p>
                      <p className="text-2xl font-bold text-red-900">{totalLowStock}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            {chartData.length > 0 && chartData.some(d => d.quantity > 0 || d.products > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Stock Quantity by Warehouse</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Products Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.filter(d => d.products > 0)}
                            dataKey="products"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={({ name, products }) => `${name}: ${products}`}
                          >
                            {chartData.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Warehouse Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {warehouses.map((wh) => (
                <Card
                  key={wh.id}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                    selectedWarehouse === wh.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
                  } ${wh.isActive === false ? 'opacity-60' : ''}`}
                  onClick={() => fetchWarehouseStock(wh.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                          wh.isDefault ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                          <Warehouse className={`h-5 w-5 ${
                            wh.isDefault ? 'text-amber-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            {wh.name}
                            {wh.isDefault && (
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            )}
                          </h3>
                          {wh.code && (
                            <span className="text-xs text-gray-400 font-mono">{wh.code}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant={wh.isActive !== false ? 'default' : 'outline'}>
                        {wh.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {wh.address && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{wh.address}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {wh.stockSummary?.totalProducts || wh._count?.warehouseStock || 0}
                        </p>
                        <p className="text-xs text-gray-500">Products</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {wh.stockSummary?.totalQuantity || 0}
                        </p>
                        <p className="text-xs text-gray-500">Total Qty</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-green-600">
                          {formatPrice(wh.stockSummary?.totalValue || 0)}
                        </p>
                        <p className="text-xs text-gray-500">Value</p>
                      </div>
                    </div>
                    {(wh.stockSummary?.lowStockCount || 0) > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-lg">
                        <AlertTriangle className="h-3 w-3" />
                        {wh.stockSummary?.lowStockCount} items below reorder threshold
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Selected Warehouse Stock Detail */}
            {selectedWarehouse && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Box className="h-5 w-5 text-blue-600" />
                        {selectedWh?.name} — Stock Levels
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {warehouseStock.length} products in this warehouse
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search products..."
                          value={stockSearch}
                          onChange={(e) => setStockSearch(e.target.value)}
                          className="pl-9 w-64"
                        />
                      </div>
                      <button
                        onClick={() => { setSelectedWarehouse(null); setWarehouseStock([]); setStockSearch(''); }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {stockLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : filteredStock.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                      <p>No stock found in this warehouse</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Product</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">SKU</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-600">Quantity</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-600">Unit Price</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-600">Total Value</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStock.map((item, idx) => {
                            const qty = item.quantity || 0;
                            const price = item.product?.unitPrice ?? item.product?.price ?? 0;
                            const threshold = item.product?.reorderThreshold || 0;
                            const isLow = threshold > 0 && qty <= threshold;
                            return (
                              <tr key={item.id || idx} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-900">
                                  {item.product?.name || 'Unknown'}
                                </td>
                                <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                                  {item.product?.sku || '—'}
                                </td>
                                <td className="py-3 px-4 text-gray-500">
                                  {item.product?.category || '—'}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold">
                                  {qty}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-600">
                                  {formatPrice(price)}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-green-600">
                                  {formatPrice(qty * price)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {isLow ? (
                                    <Badge variant="danger" className="text-xs">Low Stock</Badge>
                                  ) : (
                                    <Badge variant="default" className="text-xs bg-green-100 text-green-700">OK</Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/stock-transfers" className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                      <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Stock Transfers</h3>
                      <p className="text-xs text-gray-500">Move stock between warehouses</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/stocktakes" className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-xl">
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Stocktakes</h3>
                      <p className="text-xs text-gray-500">Count and verify inventory</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/purchase-orders" className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Purchase Orders</h3>
                      <p className="text-xs text-gray-500">Order stock from suppliers</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </>
        ) : (
          /* ========== MANAGE VIEW ========== */
          <div className="space-y-4">
            {warehouses.map((wh) => (
              <Card key={wh.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${wh.isDefault ? 'bg-amber-100' : 'bg-gray-100'}`}>
                        <Warehouse className={`h-6 w-6 ${wh.isDefault ? 'text-amber-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{wh.name}</h3>
                          {wh.isDefault && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">Default</Badge>
                          )}
                          <Badge variant={wh.isActive !== false ? 'default' : 'outline'} className="text-xs">
                            {wh.isActive !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          {wh.code && <span className="font-mono">{wh.code}</span>}
                          {wh.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {wh.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => fetchWarehouseStock(wh.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Stock
                      </Button>
                      {hasRole(['OWNER']) && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openEdit(wh)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {!wh.isDefault && (
                            deleteConfirm === wh.id ? (
                              <div className="flex items-center gap-1">
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(wh.id)}>
                                  Confirm
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(wh.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={resetForm}
          title={editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Main Warehouse"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. WH-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Warehouse address"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default warehouse</label>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingWarehouse ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
