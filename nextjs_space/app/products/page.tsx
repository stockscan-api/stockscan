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
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { apiClient } from '@/lib/api-client';
import { useCurrency } from '@/contexts/currency-context';
import { Plus, Search, Edit, Trash2, Package, Filter, QrCode, Loader2, X, Grid, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  currentStock: number;
  minimumStock: number;
  category?: { id: string; name: string };
  categoryId?: string;
  supplier?: { id: string; name: string };
  supplierId?: string;
  barcode?: string;
  isActive: boolean;
}

interface FormData {
  name: string;
  sku: string;
  description: string;
  price: string;
  currentStock: string;
  minimumStock: string;
  categoryId: string;
  supplierId: string;
  barcode: string;
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const { formatPrice, currency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(searchParams?.get('filter') === 'lowStock');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    sku: '',
    description: '',
    price: '',
    currentStock: '',
    minimumStock: '',
    categoryId: '',
    supplierId: '',
    barcode: '',
  });

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (filterCategory) params.categoryId = filterCategory;
      if (filterSupplier) params.supplierId = filterSupplier;
      if (filterLowStock) params.lowStock = true;

      const response = await apiClient.getProducts(params);
      setProducts(response?.data || response || []);
      setTotalPages(response?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filterCategory, filterSupplier, filterLowStock]);

  const fetchFilters = useCallback(async () => {
    try {
      const [cats, supps] = await Promise.all([
        apiClient.getCategories(),
        apiClient.getSuppliers({ limit: 100 }),
      ]);
      setCategories(cats || []);
      setSuppliers(supps?.data || supps || []);
    } catch (error) {
      console.error('Failed to fetch filters');
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product?.name || '',
        sku: product?.sku || '',
        description: product?.description || '',
        price: String(product?.price || ''),
        currentStock: String(product?.currentStock || ''),
        minimumStock: String(product?.minimumStock || ''),
        categoryId: product?.categoryId || '',
        supplierId: product?.supplierId || '',
        barcode: product?.barcode || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        description: '',
        price: '',
        currentStock: '',
        minimumStock: '',
        categoryId: '',
        supplierId: '',
        barcode: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || undefined,
        price: parseFloat(formData.price) || 0,
        currentStock: parseInt(formData.currentStock) || 0,
        minimumStock: parseInt(formData.minimumStock) || 0,
        categoryId: formData.categoryId || undefined,
        supplierId: formData.supplierId || undefined,
        barcode: formData.barcode || undefined,
      };

      if (editingProduct) {
        await apiClient.updateProduct(editingProduct.id, payload);
        toast.success('Product updated successfully');
      } else {
        await apiClient.createProduct(payload);
        toast.success('Product created successfully');
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    setIsSubmitting(true);

    try {
      await apiClient.deleteProduct(productToDelete.id);
      toast.success('Product deleted successfully');
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Product',
      render: (product: Product) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{product?.name}</p>
            <p className="text-xs text-gray-500">SKU: {product?.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (product: Product) => (
        <span className="text-gray-600">{product?.category?.name || '-'}</span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (product: Product) => (
        <span className="font-medium">{formatPrice(product?.price || 0)}</span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (product: Product) => {
        const isLow = (product?.currentStock || 0) < (product?.minimumStock || 0);
        return (
          <div>
            <Badge variant={isLow ? 'danger' : 'success'}>
              {product?.currentStock || 0}
            </Badge>
            {isLow && (
              <p className="text-xs text-red-500 mt-1">Min: {product?.minimumStock}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (product: Product) => (
        <span className="text-gray-600">{product?.supplier?.name || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product: Product) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(product)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setProductToDelete(product);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-500">Manage your inventory products</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or SKU..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={showFilters ? 'secondary' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                <div className="flex border rounded-lg">
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                <SelectInput
                  options={[
                    { value: '', label: 'All Categories' },
                    ...(categories?.map((c) => ({ value: c?.id, label: c?.name })) || []),
                  ]}
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-48"
                />
                <SelectInput
                  options={[
                    { value: '', label: 'All Suppliers' },
                    ...(suppliers?.map((s) => ({ value: s?.id, label: s?.name })) || []),
                  ]}
                  value={filterSupplier}
                  onChange={(e) => {
                    setFilterSupplier(e.target.value);
                    setPage(1);
                  }}
                  className="w-48"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterLowStock}
                    onChange={(e) => {
                      setFilterLowStock(e.target.checked);
                      setPage(1);
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Low Stock Only</span>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterCategory('');
                    setFilterSupplier('');
                    setFilterLowStock(false);
                    setSearch('');
                    setPage(1);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {viewMode === 'list' ? (
              <DataTable
                data={products}
                columns={columns}
                keyExtractor={(item) => item?.id}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                isLoading={isLoading}
                emptyMessage="No products found"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {isLoading ? (
                  <div className="col-span-full flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : products?.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No products found
                  </div>
                ) : (
                  products?.map((product) => {
                    const isLow = (product?.currentStock || 0) < (product?.minimumStock || 0);
                    return (
                      <Card key={product?.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Package className="h-6 w-6 text-blue-600" />
                            </div>
                            <Badge variant={isLow ? 'danger' : 'success'}>
                              Stock: {product?.currentStock}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">{product?.name}</h3>
                          <p className="text-sm text-gray-500 mb-2">SKU: {product?.sku}</p>
                          <p className="text-lg font-bold text-blue-600 mb-3">
                            {formatPrice(product?.price || 0)}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenModal(product)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setProductToDelete(product);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ({currency.symbol}) *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
              <div className="flex gap-2">
                <Input
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Enter or scan barcode"
                />
                <Button type="button" variant="outline" size="icon">
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock *</label>
              <Input
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock *</label>
              <Input
                type="number"
                min="0"
                value={formData.minimumStock}
                onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <SelectInput
                options={[
                  { value: '', label: 'Select Category' },
                  ...(categories?.map((c) => ({ value: c?.id, label: c?.name })) || []),
                ]}
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <SelectInput
                options={[
                  { value: '', label: 'Select Supplier' },
                  ...(suppliers?.map((s) => ({ value: s?.id, label: s?.name })) || []),
                ]}
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  Saving...
                </>
              ) : editingProduct ? (
                'Update Product'
              ) : (
                'Create Product'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
}
