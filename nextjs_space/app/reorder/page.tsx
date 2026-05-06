'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useCurrency } from '@/contexts/currency-context';
import { Download, AlertTriangle, Package, Truck, Loader2, RefreshCw, ShoppingBag, Send, CheckCircle2 } from 'lucide-react';
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
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState<ReorderItem[]>([]);
  const [reorderQuantities, setReorderQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [generatingPO, setGeneratingPO] = useState<string | null>(null); // supplier name being generated
  const [generatedPOs, setGeneratedPOs] = useState<Set<string>>(new Set()); // supplier names already generated

  const fetchReorderItems = useCallback(async () => {
    setIsLoading(true);
    try {
      // First try to get low stock from warehouse stock data (warehouse-aware)
      let reorderItems: ReorderItem[] = [];

      try {
        const warehouses = await apiClient.getWarehouses();
        const warehouseList = Array.isArray(warehouses) ? warehouses : warehouses?.data || warehouses?.warehouses || [];

        // Fetch stock from all warehouses and find low stock items
        const allLowStock: ReorderItem[] = [];
        const seenProductIds = new Set<string>();

        for (const wh of warehouseList) {
          const stockResp = await apiClient.getWarehouseStock(wh.id, { limit: 500 });
          const stockItems = Array.isArray(stockResp) ? stockResp : stockResp?.data || stockResp?.stock || stockResp?.warehouseStock || [];

          for (const item of stockItems) {
            const qty = item.quantity || 0;
            const threshold = item.product?.reorderThreshold || 0;
            const productId = item.product?.id || item.productId;

            // Include items that are at or below reorder threshold
            if (threshold > 0 && qty <= threshold && productId && !seenProductIds.has(productId)) {
              seenProductIds.add(productId);
              const price = item.product?.unitPrice ?? item.product?.price ?? 0;
              const reorderQty = Math.max(threshold * 2 - qty, item.product?.reorderQuantity || threshold || 10);
              allLowStock.push({
                id: productId,
                product: {
                  id: productId,
                  name: item.product?.name || 'Unknown',
                  sku: item.product?.sku || '',
                  price,
                  currentStock: qty,
                  minimumStock: threshold,
                  supplier: item.product?.supplier ? { id: item.product.supplier.id, name: item.product.supplier.name } : undefined,
                },
                reorderQty,
              });
            }
          }
        }

        if (allLowStock.length > 0) {
          reorderItems = allLowStock;
        }
      } catch (whErr) {
        console.warn('Warehouse stock fetch failed, falling back to products endpoint:', whErr);
      }

      // Fallback: if no warehouse data, use products endpoint
      if (reorderItems.length === 0) {
        const response = await apiClient.getProducts({ lowStock: true, limit: 200 });
        const lowStockProducts = response?.products || response?.data || (Array.isArray(response) ? response : []);

        reorderItems = lowStockProducts?.map((product: any) => {
          const currentStock = product?.quantity ?? product?.currentStock ?? 0;
          const minStock = product?.reorderThreshold ?? product?.minimumStock ?? 0;
          return {
            id: product?.id,
            product: {
              ...product,
              currentStock,
              minimumStock: minStock,
              price: product?.unitPrice ?? product?.price ?? 0,
            },
            reorderQty: Math.max(minStock * 2 - currentStock, product?.reorderQuantity || minStock || 10),
          };
        }) || [];
      }

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

  // Generate a PO for a specific supplier group
  const generatePOForSupplier = async (supplierName: string, supplierItems: ReorderItem[]) => {
    const supplierId = supplierItems[0]?.product?.supplier?.id;
    if (!supplierId || supplierName === 'No Supplier') {
      toast.error('Cannot create PO — products have no supplier assigned');
      return;
    }

    const poItems = supplierItems
      .filter(item => (reorderQuantities?.[item.id] || 0) > 0)
      .map(item => ({
        productId: item.product.id,
        quantityOrdered: reorderQuantities?.[item.id] || item.reorderQty,
        unitPrice: item.product.price || undefined,
      }));

    if (poItems.length === 0) {
      toast.error('No items with quantity > 0 to order');
      return;
    }

    setGeneratingPO(supplierName);
    try {
      await apiClient.createPurchaseOrder({
        supplierId,
        items: poItems,
        notes: `Auto-generated from low stock reorder list`,
      });
      setGeneratedPOs(prev => new Set([...prev, supplierName]));
      toast.success(`Purchase order created for ${supplierName}`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to create PO for ${supplierName}`);
    } finally {
      setGeneratingPO(null);
    }
  };

  // Generate POs for ALL supplier groups
  const generateAllPOs = async () => {
    const supplierGroups = Object.entries(groupedBySupplier).filter(
      ([name]) => name !== 'No Supplier' && !generatedPOs.has(name)
    );

    if (supplierGroups.length === 0) {
      toast.error('No supplier groups to generate POs for');
      return;
    }

    setGeneratingPO('__all__');
    let successCount = 0;
    let failCount = 0;

    for (const [supplierName, supplierItems] of supplierGroups) {
      const supplierId = supplierItems[0]?.product?.supplier?.id;
      if (!supplierId) {
        failCount++;
        continue;
      }

      const poItems = supplierItems
        .filter(item => (reorderQuantities?.[item.id] || 0) > 0)
        .map(item => ({
          productId: item.product.id,
          quantityOrdered: reorderQuantities?.[item.id] || item.reorderQty,
          unitPrice: item.product.price || undefined,
        }));

      if (poItems.length === 0) continue;

      try {
        await apiClient.createPurchaseOrder({
          supplierId,
          items: poItems,
          notes: `Auto-generated from low stock reorder list`,
        });
        setGeneratedPOs(prev => new Set([...prev, supplierName]));
        successCount++;
      } catch {
        failCount++;
      }
    }

    setGeneratingPO(null);
    if (successCount > 0) toast.success(`${successCount} purchase order${successCount > 1 ? 's' : ''} created`);
    if (failCount > 0) toast.error(`${failCount} PO${failCount > 1 ? 's' : ''} failed`);
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={fetchReorderItems}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportToCSV} disabled={items?.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={generateAllPOs}
              disabled={items?.length === 0 || generatingPO !== null}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {generatingPO === '__all__' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShoppingBag className="h-4 w-4 mr-2" />
              )}
              Generate All POs
            </Button>
            {generatedPOs.size > 0 && (
              <Button variant="outline" onClick={() => router.push('/purchase-orders')}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                View POs ({generatedPOs.size})
              </Button>
            )}
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
                    {formatPrice(totalValue)}
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-green-600" />
                    {supplierName}
                    <Badge variant="info" className="ml-2">
                      {supplierItems?.length || 0} items
                    </Badge>
                  </CardTitle>
                  {supplierName !== 'No Supplier' && (
                    generatedPOs.has(supplierName) ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        PO Created
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => generatePOForSupplier(supplierName, supplierItems)}
                        disabled={generatingPO !== null}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {generatingPO === supplierName ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Send to PO
                      </Button>
                    )
                  )}
                </div>
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
                              {formatPrice(item?.product?.price || 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">
                              {formatPrice(total)}
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
                          {formatPrice(
                            supplierItems
                              ?.reduce((sum, item) => sum + (reorderQuantities?.[item?.id] || 0) * (item?.product?.price || 0), 0) || 0
                          )}
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
