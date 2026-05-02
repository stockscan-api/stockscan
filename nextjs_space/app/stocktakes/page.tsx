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
import {
  ClipboardCheck,
  Plus,
  Loader2,
  Search,
  Warehouse,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Hash,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Stocktake {
  id: string;
  stocktakeNumber?: string;
  warehouseId: string;
  warehouse?: { id: string; name: string };
  status: string;
  totalVariance?: number;
  itemCount?: number;
  items?: Array<{
    id: string;
    productId: string;
    systemQuantity?: number;
    countedQuantity?: number;
    variance?: number;
    product?: { name: string; sku?: string };
  }>;
  createdBy?: { name: string };
  createdAt?: string;
  completedAt?: string;
}

export default function StocktakesPage() {
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [selectedStocktake, setSelectedStocktake] = useState<Stocktake | null>(null);

  // Form state
  const [formWarehouse, setFormWarehouse] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [stRes, whRes] = await Promise.all([
        apiClient.getStocktakes({ limit: 100 }).catch(() => []),
        apiClient.getWarehouses().catch(() => []),
      ]);
      const stList = Array.isArray(stRes) ? stRes : stRes?.data || stRes?.stocktakes || [];
      const whList = Array.isArray(whRes) ? whRes : whRes?.data || whRes?.warehouses || [];
      setStocktakes(stList);
      setWarehouses(whList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWarehouse) {
      toast.error('Select a warehouse');
      return;
    }
    try {
      setIsSubmitting(true);
      await apiClient.createStocktake({ warehouseId: formWarehouse });
      toast.success('Stocktake created successfully');
      setIsModalOpen(false);
      setFormWarehouse('');
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create stocktake');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED') return { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
    if (s === 'IN_PROGRESS') return { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock };
    if (s === 'PENDING' || s === 'OPEN') return { label: s === 'OPEN' ? 'Open' : 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock };
    return { label: status || 'Unknown', color: 'bg-gray-100 text-gray-700', icon: Clock };
  };

  const filteredStocktakes = stocktakes.filter(st => {
    if (statusFilter && st.status?.toUpperCase() !== statusFilter) return false;
    if (warehouseFilter && st.warehouseId !== warehouseFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        st.stocktakeNumber?.toLowerCase().includes(q) ||
        st.warehouse?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <DashboardLayout allowedRoles={['MANAGER', 'OWNER']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stocktakes</h1>
            <p className="text-gray-500 mt-1">Count and verify physical inventory levels</p>
          </div>
          <Button onClick={() => { setFormWarehouse(''); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Stocktake
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search stocktakes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <SelectInput
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-48"
          >
            <option value="">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </SelectInput>
          <SelectInput
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </SelectInput>
        </div>

        {/* Stocktakes List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredStocktakes.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ClipboardCheck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {stocktakes.length === 0 ? 'No Stocktakes Yet' : 'No Matching Stocktakes'}
              </h3>
              <p className="text-gray-500">
                {stocktakes.length === 0
                  ? 'Start a stocktake to count and verify your physical inventory.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredStocktakes.map((st) => {
              const statusCfg = getStatusConfig(st.status);
              const StatusIcon = statusCfg.icon;
              return (
                <Card
                  key={st.id}
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    selectedStocktake?.id === st.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedStocktake(selectedStocktake?.id === st.id ? null : st)}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-emerald-100 rounded-xl">
                          <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {st.stocktakeNumber && (
                              <span className="font-mono text-sm font-semibold text-gray-900">{st.stocktakeNumber}</span>
                            )}
                            <Badge className={`${statusCfg.color} text-xs`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusCfg.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Warehouse className="h-3.5 w-3.5" />
                              {st.warehouse?.name || 'Unknown'}
                            </span>
                            {st.itemCount != null && (
                              <span className="flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" />
                                {st.itemCount} items
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {st.totalVariance != null && st.totalVariance !== 0 && (
                          <span className={`flex items-center gap-1 font-medium ${
                            st.totalVariance < 0 ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Variance: {st.totalVariance > 0 ? '+' : ''}{st.totalVariance}
                          </span>
                        )}
                        {st.createdBy?.name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {st.createdBy.name}
                          </span>
                        )}
                        {st.createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(st.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Detail view when selected */}
                    {selectedStocktake?.id === st.id && st.items && st.items.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Stocktake Items</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left py-2 px-3 font-medium text-gray-600">Product</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">System Qty</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Counted Qty</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Variance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {st.items.map((item, idx) => (
                                <tr key={item.id || idx} className="border-b">
                                  <td className="py-2 px-3">
                                    <span className="font-medium">{item.product?.name || 'Unknown'}</span>
                                    {item.product?.sku && <span className="text-gray-400 ml-2 text-xs font-mono">{item.product.sku}</span>}
                                  </td>
                                  <td className="py-2 px-3 text-right">{item.systemQuantity ?? '—'}</td>
                                  <td className="py-2 px-3 text-right">{item.countedQuantity ?? '—'}</td>
                                  <td className={`py-2 px-3 text-right font-medium ${
                                    (item.variance || 0) < 0 ? 'text-red-600' :
                                    (item.variance || 0) > 0 ? 'text-amber-600' : 'text-green-600'
                                  }`}>
                                    {item.variance != null ? (item.variance > 0 ? '+' : '') + item.variance : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Stocktake Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Stocktake">
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
              <SelectInput
                value={formWarehouse}
                onChange={(e) => setFormWarehouse(e.target.value)}
                required
              >
                <option value="">Select warehouse...</option>
                {warehouses.filter(w => w.isActive !== false).map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </SelectInput>
              <p className="text-xs text-gray-500 mt-2">
                A stocktake will be created with all products in the selected warehouse.
                Use the mobile app to scan and count items.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
                Start Stocktake
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
