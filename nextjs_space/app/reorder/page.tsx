'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { Download, AlertTriangle, Package, Truck, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReorderItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    currentStock: number;
    minimumStock: number;
    supplier?: { id: string; name: string };
  };
  reorderQty: number;
}

export default function ReorderPage() {
  const [items, setItems] = useState<ReorderItem[]>([]);
  const [reorderQuantities, setReorderQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchReorderItems = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all products with low stock
      const response = await apiClient.getProducts({ lowStock: true, limit: 200 });
      const lowStockProducts = response?.data || response || [];
      
      const reorderItems = lowStockProducts?.map((product: any) => ({
        id: product?.id,
        product,
        reorderQty: Math.max((product?.minimumStock || 0) * 2 - (product?.currentStock || 0), product?.minimumStock || 10),
      }));

      setItems(reorderItems);

      // Initialize reorder quantities
      const qtys: Record<string, number> = {};
      reorderItems?.forEach((item: ReorderItem) => {
        qtys[item?.id] = item?.reorderQty || 0;
      });
      setReorderQuantities(qtys);
    } catch (error) {
      toast.error('Failed to fetch reorder list');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReorderItems();
  }, [fetchReorderItems]);

  const updateQuantity = (productId: string, qty: number) => {
    setReorderQuantities((prev) => ({
      ...(prev ?? {}),
      [productId]: Math.max(0, qty),
    }));
  };

  // Group items by supplier
  const groupedBySupplier = items?.reduce((acc: Record<string, ReorderItem[]>, item) => {
    const supplierName = item?.product?.supplier?.name || 'No Supplier';
    if (!acc[supplierName]) {
      acc[supplierName] = [];
    }
    acc[supplierName].push(item);
    return acc;
  }, {}) ?? {};

  const exportToCSV = () => {
    // Sage-compatible CSV format
    const headers = ['SKU', 'Product Name', 'Current Stock', 'Min Stock', 'Reorder Qty', 'Supplier', 'Unit Price', 'Total Value'];
    
    const rows = items?.map((item) => {
      const qty = reorderQuantities?.[item?.id] || 0;
      const price = item?.product?.price || 0;
      return [
        item?.product?.sku || '',
        `"${item?.product?.name || ''}"`,
        item?.product?.currentStock || 0,
        item?.product?.minimumStock || 0,
        qty,
        `"${item?.product?.supplier?.name || ''}"`,
        price?.toFixed?.(2) || '0.00',
        (qty * price)?.toFixed?.(2) || '0.00',
      ].join(',');
    }) ?? [];

    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reorder_list_${new Date()?.toISOString?.()?.split?.('T')?.[0] || 'export'}.csv`;
    link.click();
    
    toast.success('Reorder list exported successfully');
  };

  const totalItems = items?.length || 0;
  const totalValue = items?.reduce((sum, item) => {
    const qty = reorderQuantities?.[item?.id] || 0;
    return sum + (qty * (item?.product?.price || 0));
  }, 0) || 0;

  return (
    <DashboardLayout allowedRoles={['MANAGER', 'OWNER']}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reorder Management</h1>
            <p className="text-gray-500">Products below minimum stock level</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchReorderItems}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportToCSV} disabled={items?.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Items to Reorder</p>
                  <p className="text-3xl font-bold text-orange-600">{totalItems}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Suppliers Involved</p>
                  <p className="text-3xl font-bold text-blue-600">{Object.keys(groupedBySupplier)?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Estimated Total</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${totalValue?.toLocaleString?.(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reorder List by Supplier */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </CardContent>
          </Card>
        ) : items?.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Stocked Up!</h3>
              <p className="text-gray-500">No products are below their minimum stock level.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedBySupplier)?.map(([supplierName, supplierItems]) => (
            <Card key={supplierName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-600" />
                  {supplierName}
                  <Badge variant="info" className="ml-2">
                    {supplierItems?.length || 0} items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-600">Current</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-600">Minimum</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-600">Shortage</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-600">Reorder Qty</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Price</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {supplierItems?.map((item) => {
                        const shortage = (item?.product?.minimumStock || 0) - (item?.product?.currentStock || 0);
                        const qty = reorderQuantities?.[item?.id] || 0;
                        const total = qty * (item?.product?.price || 0);
                        return (
                          <tr key={item?.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">{item?.product?.name}</p>
                                <p className="text-xs text-gray-500">SKU: {item?.product?.sku}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="danger">{item?.product?.currentStock || 0}</Badge>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">
                              {item?.product?.minimumStock || 0}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-red-600 font-medium">-{shortage > 0 ? shortage : 0}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Input
                                type="number"
                                min="0"
                                value={qty}
                                onChange={(e) => updateQuantity(item?.id, parseInt(e.target.value) || 0)}
                                className="w-24 mx-auto text-center"
                              />
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              ${(item?.product?.price || 0)?.toFixed?.(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">
                              ${total?.toFixed?.(2) || '0.00'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={5}></td>
                        <td className="px-4 py-3 text-right font-medium text-gray-600">Subtotal:</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          ${
                            supplierItems
                              ?.reduce((sum, item) => sum + (reorderQuantities?.[item?.id] || 0) * (item?.product?.price || 0), 0)
                              ?.toFixed?.(2) || '0.00'
                          }
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
