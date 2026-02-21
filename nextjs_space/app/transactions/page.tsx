'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { SelectInput } from '@/components/ui/select-input';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/ui/data-table';
import { apiClient } from '@/lib/api-client';
import { Plus, TrendingUp, TrendingDown, Filter, Loader2, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  product: { id: string; name: string; sku: string };
  quantity: number;
  type: 'IN' | 'OUT';
  reason: string;
  notes?: string;
  user: { id: string; name: string; email: string };
  balanceAfter: number;
  createdAt: string;
}

interface FormData {
  productId: string;
  quantity: string;
  type: 'IN' | 'OUT';
  reason: string;
  notes: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filterProduct, setFilterProduct] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    productId: '',
    quantity: '',
    type: 'IN',
    reason: '',
    notes: '',
  });

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filterProduct) params.productId = filterProduct;
      if (filterType) params.type = filterType;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const response = await apiClient.getTransactions(params);
      setTransactions(response?.data || response || []);
      setTotalPages(response?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  }, [page, filterProduct, filterType, filterStartDate, filterEndDate]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await apiClient.getProducts({ limit: 200 });
      setProducts(response?.data || response || []);
    } catch (error) {
      console.error('Failed to fetch products');
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenModal = () => {
    setFormData({
      productId: '',
      quantity: '',
      type: 'IN',
      reason: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const qty = parseInt(formData.quantity) || 0;
      // For OUT transactions, send negative quantity
      const adjustedQty = formData.type === 'OUT' ? -qty : qty;
      
      await apiClient.adjustStock({
        productId: formData.productId,
        quantity: adjustedQty,
        reason: formData.reason,
        notes: formData.notes || undefined,
      });

      toast.success('Transaction recorded successfully');
      setIsModalOpen(false);
      fetchTransactions();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'type',
      header: 'Type',
      render: (tx: Transaction) => (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          tx?.type === 'IN' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {tx?.type === 'IN' ? (
            <TrendingUp className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600" />
          )}
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (tx: Transaction) => (
        <div>
          <p className="font-medium text-gray-900">{tx?.product?.name || 'Unknown'}</p>
          <p className="text-xs text-gray-500">SKU: {tx?.product?.sku || '-'}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (tx: Transaction) => (
        <Badge variant={tx?.type === 'IN' ? 'success' : 'danger'}>
          {tx?.type === 'IN' ? '+' : '-'}{tx?.quantity || 0}
        </Badge>
      ),
    },
    {
      key: 'balance',
      header: 'Balance After',
      render: (tx: Transaction) => (
        <span className="font-medium">{tx?.balanceAfter ?? '-'}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (tx: Transaction) => (
        <div>
          <p className="text-gray-900">{tx?.reason}</p>
          {tx?.notes && <p className="text-xs text-gray-500">{tx.notes}</p>}
        </div>
      ),
    },
    {
      key: 'user',
      header: 'By',
      render: (tx: Transaction) => (
        <span className="text-gray-600">{tx?.user?.name || tx?.user?.email || '-'}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (tx: Transaction) => (
        <span className="text-gray-500 text-sm">
          {tx?.createdAt ? new Date(tx.createdAt)?.toLocaleString?.() : '-'}
        </span>
      ),
    },
  ];

  const reasonOptions = [
    { value: '', label: 'Select reason' },
    { value: 'Purchase', label: 'Purchase' },
    { value: 'Sale', label: 'Sale' },
    { value: 'Return', label: 'Return' },
    { value: 'Adjustment', label: 'Adjustment' },
    { value: 'Damaged', label: 'Damaged' },
    { value: 'Expired', label: 'Expired' },
    { value: 'Transfer', label: 'Transfer' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Transactions</h1>
            <p className="text-gray-500">Track stock movements and adjustments</p>
          </div>
          <Button onClick={handleOpenModal}>
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Product</label>
                  <SelectInput
                    options={[
                      { value: '', label: 'All Products' },
                      ...(products?.map((p) => ({ value: p?.id, label: `${p?.name} (${p?.sku})` })) || []),
                    ]}
                    value={filterProduct}
                    onChange={(e) => {
                      setFilterProduct(e.target.value);
                      setPage(1);
                    }}
                    className="w-64"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <SelectInput
                    options={[
                      { value: '', label: 'All Types' },
                      { value: 'IN', label: 'Stock In' },
                      { value: 'OUT', label: 'Stock Out' },
                    ]}
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      setPage(1);
                    }}
                    className="w-40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From Date</label>
                  <Input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => {
                      setFilterStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To Date</label>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => {
                      setFilterEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-40"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterProduct('');
                      setFilterType('');
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setPage(1);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <DataTable
              data={transactions}
              columns={columns}
              keyExtractor={(item) => item?.id}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              isLoading={isLoading}
              emptyMessage="No transactions found"
            />
          </CardContent>
        </Card>
      </div>

      {/* New Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Stock Transaction"
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
            <SelectInput
              options={[
                { value: '', label: 'Select a product' },
                ...(products?.map((p) => ({ value: p?.id, label: `${p?.name} (${p?.sku}) - Stock: ${p?.currentStock}` })) || []),
              ]}
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.type === 'IN' ? 'success' : 'outline'}
                  className="flex-1"
                  onClick={() => setFormData({ ...formData, type: 'IN' })}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Stock In
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'OUT' ? 'destructive' : 'outline'}
                  className="flex-1"
                  onClick={() => setFormData({ ...formData, type: 'OUT' })}
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Stock Out
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <SelectInput
              options={reasonOptions}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details about this transaction..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Recording...
                </>
              ) : (
                'Record Transaction'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
