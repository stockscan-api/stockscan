'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useCurrency } from '@/contexts/currency-context';
import { Package, AlertTriangle, Truck, Banknote, TrendingUp, TrendingDown, ArrowRightLeft, Loader2, Warehouse, MapPin, Star } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
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
  LineChart,
  Line,
} from 'recharts';

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#80D8C3', '#A19AD3'];

export default function DashboardPage() {
  const { formatPrice } = useCurrency();
  const { hasRole } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch products, low stock items separately, transactions, and warehouses
      const [productsRes, lowStockRes, transactionsRes, warehousesRes] = await Promise.all([
        apiClient.getProducts({ limit: 50 }),
        apiClient.getProducts({ lowStock: true, limit: 50 }),
        apiClient.getTransactions({ limit: 15 }),
        apiClient.getWarehouses().catch(() => []),
      ]);

      // Handle various API response formats
      const extractArray = (res: any): any[] => {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.items)) return res.items;
        if (Array.isArray(res?.products)) return res.products;
        return [];
      };
      
      // Extract total count from API response (handles different formats)
      const extractTotal = (res: any, fallbackArray: any[]): number => {
        if (typeof res?.total === 'number') return res.total;
        if (typeof res?.totalCount === 'number') return res.totalCount;
        if (typeof res?.count === 'number') return res.count;
        return fallbackArray.length;
      };
      
      const allProducts = extractArray(productsRes);
      const lowStockItems = extractArray(lowStockRes);
      const allTransactions = extractArray(transactionsRes);

      // Get actual totals from API response
      const totalProductsCount = extractTotal(productsRes, allProducts);
      const lowStockCount = extractTotal(lowStockRes, lowStockItems);

      const whList = Array.isArray(warehousesRes) ? warehousesRes : warehousesRes?.data || warehousesRes?.warehouses || [];

      // Enrich warehouses with overview data (stock summaries)
      let enrichedWarehouses = whList;
      try {
        const overview = await apiClient.getWarehousesOverview();
        const overviewList = Array.isArray(overview) ? overview : overview?.data || overview?.warehouses || [];
        if (overviewList.length > 0) {
          const overviewMap = new Map<string, any>();
          overviewList.forEach((ow: any) => {
            if (ow.id) overviewMap.set(ow.id, ow);
          });
          enrichedWarehouses = whList.map((w: any) => {
            const ov = overviewMap.get(w.id);
            if (ov) {
              return {
                ...w,
                stockSummary: ov.stockSummary || {
                  totalProducts: ov.productCount ?? ov.totalProducts ?? 0,
                  totalQuantity: ov.totalUnits ?? ov.totalQuantity ?? 0,
                  totalValue: ov.stockValue ?? ov.totalValue ?? 0,
                  lowStockCount: ov.lowStockCount ?? 0,
                },
                _count: ov._count || w._count,
              };
            }
            return w;
          });
        }
      } catch {
        // Overview not available, use basic warehouse data
      }

      // Fetch warehouse-level low stock items (same pattern as reorder page)
      let warehouseLowStockItems: any[] = [];
      let warehouseLowStockCount = 0;
      try {
        // First try to get count from enriched overview data
        warehouseLowStockCount = enrichedWarehouses.reduce((sum: number, w: any) => {
          return sum + (w.stockSummary?.lowStockCount ?? 0);
        }, 0);

        // Fetch actual low stock items from warehouse stock
        const seenProductIds = new Set<string>();
        for (const wh of enrichedWarehouses) {
          try {
            const stockResp = await apiClient.getWarehouseStock(wh.id, { limit: 500 });
            const stockList = Array.isArray(stockResp) ? stockResp : stockResp?.data || stockResp?.stock || stockResp?.warehouseStock || [];
            for (const item of stockList) {
              const qty = item.quantity || 0;
              const threshold = item.product?.reorderThreshold || 0;
              const productId = item.product?.id || item.productId;
              if (threshold > 0 && qty <= threshold && productId && !seenProductIds.has(productId)) {
                seenProductIds.add(productId);
                warehouseLowStockItems.push({
                  id: productId,
                  name: item.product?.name || 'Unknown',
                  sku: item.product?.sku || '',
                  quantity: qty,
                  minimumStock: threshold,
                  currentStock: qty,
                  reorderThreshold: threshold,
                });
              }
            }
          } catch {
            // Skip warehouse if stock fetch fails
          }
        }
        // Update count from actual items if we got them
        if (warehouseLowStockItems.length > 0) {
          warehouseLowStockCount = warehouseLowStockItems.length;
        }
      } catch {
        // Warehouse low stock fetch failed, fall back to products endpoint data
      }

      // Use warehouse-derived low stock if available, otherwise fall back to products endpoint
      const finalLowStockItems = warehouseLowStockItems.length > 0 ? warehouseLowStockItems : lowStockItems;
      const finalLowStockCount = warehouseLowStockItems.length > 0 ? warehouseLowStockCount : lowStockCount;

      setProducts(allProducts);
      setTransactions(allTransactions);
      setLowStockProducts(finalLowStockItems);
      setWarehouses(enrichedWarehouses);

      // Calculate stats using API totals
      const totalValue = allProducts.reduce((sum: number, p: any) => sum + (((p?.unitPrice ?? p?.price ?? 0)) * ((p?.quantity ?? p?.currentStock) || 0)), 0);
      setStats({
        totalProducts: totalProductsCount,
        lowStockCount: finalLowStockCount,
        totalValue,
      });
    } catch (error: any) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data
  const stockByCategory = products?.reduce((acc: any, product: any) => {
    const category = product?.category?.name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { name: category, count: 0, value: 0 };
    }
    acc[category].count += (product?.quantity ?? product?.currentStock) || 0;
    acc[category].value += ((product?.unitPrice ?? product?.price ?? 0)) * ((product?.quantity ?? product?.currentStock) || 0);
    return acc;
  }, {}) ?? {};

  const categoryChartData = Object.values(stockByCategory);

  const transactionTrend = transactions?.slice(0, 10)?.reverse()?.map((t: any, i: number) => ({
    name: `T${i + 1}`,
    quantity: t?.quantity || 0,
    type: t?.type,
  })) ?? [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of your inventory status</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalProducts || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Low Stock Alerts</p>
                  <p className="text-3xl font-bold text-red-600">{stats?.lowStockCount || 0}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Recent Transactions</p>
                  <p className="text-3xl font-bold text-gray-900">{transactions?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ArrowRightLeft className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Stock Value</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatPrice(stats?.totalValue || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stock by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {categoryChartData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData}>
                      <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} />
                      <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Bar dataKey="count" fill="#60B5FF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stock Value Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {categoryChartData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name }: any) => name}
                      >
                        {categoryChartData?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS?.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11 }} formatter={(value: number) => `$${value?.toFixed?.(2) || '0.00'}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warehouse Overview - Only for MANAGER/OWNER */}
        {warehouses.length > 0 && hasRole(['MANAGER', 'OWNER']) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Warehouse className="h-5 w-5 text-blue-600" />
                  Warehouse Overview
                </CardTitle>
                <Link href="/warehouses" className="text-sm text-blue-600 hover:underline">
                  View All →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {warehouses.map((wh: any) => (
                  <Link key={wh.id} href="/warehouses" className="block">
                    <div className={`p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer ${
                      wh.isDefault ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-gray-50/50'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Warehouse className={`h-4 w-4 ${wh.isDefault ? 'text-amber-600' : 'text-blue-600'}`} />
                        <span className="font-semibold text-sm text-gray-900 truncate">{wh.name}</span>
                        {wh.isDefault && <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
                      </div>
                      {wh.address && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{wh.address}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center bg-white rounded-lg p-2">
                          <p className="text-lg font-bold text-gray-900">{wh.stockSummary?.totalProducts || wh._count?.warehouseStock || 0}</p>
                          <p className="text-xs text-gray-500">Products</p>
                        </div>
                        <div className="text-center bg-white rounded-lg p-2">
                          <p className="text-lg font-bold text-gray-900">{wh.stockSummary?.totalQuantity || 0}</p>
                          <p className="text-xs text-gray-500">Total Qty</p>
                        </div>
                      </div>
                      {(wh.stockSummary?.lowStockCount || 0) > 0 && (
                        <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {wh.stockSummary.lowStockCount} low stock
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}


        {/* Quick Access & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Low Stock Alert */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-auto">
                {lowStockProducts?.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">All items are well stocked!</p>
                ) : (
                  lowStockProducts?.slice(0, 5)?.map((product: any) => (
                    <div key={product?.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{product?.name}</p>
                        <p className="text-xs text-gray-500">SKU: {product?.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-600">{product?.quantity ?? product?.currentStock} / {product?.minimumStock}</p>
                        <p className="text-xs text-gray-500">Current / Min</p>
                      </div>
                    </div>
                  ))
                )}
                {lowStockProducts?.length > 5 && (
                  <Link href="/products?filter=lowStock" className="block text-center text-blue-600 text-sm hover:underline">
                    View all {lowStockProducts?.length} items
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-auto">
                {transactions?.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No recent transactions</p>
                ) : (
                  transactions?.slice(0, 8)?.map((transaction: any) => (
                    <div key={transaction?.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction?.type === 'IN' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {transaction?.type === 'IN' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{transaction?.product?.name || 'Unknown Product'}</p>
                          <p className="text-xs text-gray-500">{transaction?.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={transaction?.type === 'IN' ? 'success' : 'danger'}>
                          {transaction?.type === 'IN' ? '+' : '-'}{transaction?.quantity}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(transaction?.createdAt)?.toLocaleDateString?.() || 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {transactions?.length > 0 && (
                  <Link href="/transactions" className="block text-center text-blue-600 text-sm hover:underline pt-2">
                    View all transactions
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/products">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:bg-blue-50">
              <CardContent className="p-4 text-center">
                <Package className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <p className="font-medium text-gray-900">Products</p>
                <p className="text-xs text-gray-500">Manage inventory</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/transactions">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:bg-purple-50">
              <CardContent className="p-4 text-center">
                <ArrowRightLeft className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                <p className="font-medium text-gray-900">Transactions</p>
                <p className="text-xs text-gray-500">Stock adjustments</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/suppliers">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:bg-green-50">
              <CardContent className="p-4 text-center">
                <Truck className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="font-medium text-gray-900">Suppliers</p>
                <p className="text-xs text-gray-500">Vendor management</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/reorder">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:bg-orange-50">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                <p className="font-medium text-gray-900">Reorder</p>
                <p className="text-xs text-gray-500">Low stock items</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}