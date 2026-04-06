'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Loader2,
  Package,
  Receipt,
  RotateCcw,
  X,
  History,
  Eye,
} from 'lucide-react';

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface Sale {
  id: string;
  saleNumber?: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  status?: string;
  createdAt: string;
}

type PosView = 'sell' | 'history';

export default function PosPage() {
  const { hasRole } = useAuth();
  const canRefund = hasRole(['MANAGER', 'OWNER']);
  const [view, setView] = useState<PosView>('sell');
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerName, setCustomerName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sales history
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundingSaleId, setRefundingSaleId] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await apiClient.getProducts({ limit: 100 });
      setProducts(res.items || res.data || res || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const res = await apiClient.getPosSales({ limit: 50 });
      setSales(res.items || res.data || res.sales || res || []);
    } catch (err: any) {
      console.error('Failed to load sales:', err);
      toast.error('Failed to load sales history');
    } finally {
      setLoadingSales(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (view === 'history') fetchSales();
  }, [view, fetchSales]);

  const filteredProducts = products.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q));
  });

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.sellingPrice ?? product.price ?? 0,
        quantity: 1,
      }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.productId === productId) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : i;
      }
      return i;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const tax = subtotal * 0.2; // 20% VAT
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setProcessing(true);
    try {
      const saleData = {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
        paymentMethod,
        customerName: customerName || undefined,
      };
      const result = await apiClient.createPosSale(saleData);
      toast.success('Sale completed successfully!');
      setCart([]);
      setCustomerName('');

      // Try to show receipt
      if (result?.id) {
        try {
          const receipt = await apiClient.getPosReceipt(result.id);
          if (receipt) {
            const w = window.open('', '_blank', 'width=400,height=600');
            if (w) {
              const html = typeof receipt === 'string' ? receipt : receipt.html || `<pre>${JSON.stringify(receipt, null, 2)}</pre>`;
              w.document.write(`<html><head><title>Receipt</title></head><body>${html}<script>window.print();<\/script></body></html>`);
              w.document.close();
            }
          }
        } catch { /* receipt optional */ }
      }
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleRefund = async () => {
    if (!refundingSaleId) return;
    try {
      await apiClient.refundPosSale(refundingSaleId, { reason: refundReason });
      toast.success('Refund processed');
      setShowRefundModal(false);
      setRefundingSaleId(null);
      setRefundReason('');
      fetchSales();
    } catch (err: any) {
      toast.error(err.message || 'Refund failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="h-7 w-7 text-blue-600" />
              Point of Sale
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('sell')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'sell' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ShoppingCart className="h-4 w-4 inline mr-1" />
              New Sale
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <History className="h-4 w-4 inline mr-1" />
              Sales History
            </button>
          </div>
        </div>

        {view === 'sell' ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Product Search - Left Side */}
            <div className="lg:col-span-3 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products by name, SKU, or barcode..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                        <span className="text-xs text-gray-500 font-mono">{product.sku}</span>
                      </div>
                      <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                      <p className="text-blue-600 font-bold mt-1">£{(product.sellingPrice ?? product.price ?? 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Stock: {product.quantity ?? product.stockLevel ?? 0}</p>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No products found</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart - Right Side */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Cart ({cart.length})
                  </h2>
                </div>

                <div className="max-h-[40vh] overflow-y-auto divide-y divide-gray-100">
                  {cart.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Cart is empty</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.productId} className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">£{item.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateCartQty(item.productId, -1)} className="p-1 rounded bg-gray-100 hover:bg-gray-200">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => updateCartQty(item.productId, 1)} className="p-1 rounded bg-gray-100 hover:bg-gray-200">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 w-16 text-right">£{(item.price * item.quantity).toFixed(2)}</p>
                        <button onClick={() => removeFromCart(item.productId)} className="p-1 text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart Summary */}
                <div className="p-4 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">£{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT (20%)</span>
                    <span className="font-medium">£{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-green-600">£{total.toFixed(2)}</span>
                  </div>

                  {/* Customer Name */}
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Payment Method */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'CASH', icon: Banknote, label: 'Cash' },
                      { key: 'CARD', icon: CreditCard, label: 'Card' },
                      { key: 'TRANSFER', icon: ArrowLeftRight, label: 'Transfer' },
                    ].map(method => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.key}
                          onClick={() => setPaymentMethod(method.key)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${
                            paymentMethod === method.key
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {method.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || processing}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Receipt className="h-5 w-5" />}
                    {processing ? 'Processing...' : `Charge £${total.toFixed(2)}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Sales History View */
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {loadingSales ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (Array.isArray(sales) && sales.length > 0) ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Sale #</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-900">{sale.saleNumber || sale.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(sale.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-900">{sale.customerName || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">£{(sale.total || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            sale.status === 'REFUNDED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {sale.status || 'COMPLETED'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedSale(sale)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {canRefund && sale.status !== 'REFUNDED' && (
                              <button
                                onClick={() => {
                                  setRefundingSaleId(sale.id);
                                  setShowRefundModal(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Refund"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No sales recorded yet</p>
              </div>
            )}
          </div>
        )}

        {/* Sale Detail Modal */}
        {selectedSale && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Sale Details</h2>
                <button onClick={() => setSelectedSale(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">{new Date(selectedSale.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment</span>
                  <span className="font-medium">{selectedSale.paymentMethod}</span>
                </div>
                {selectedSale.customerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Customer</span>
                    <span className="font-medium">{selectedSale.customerName}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  {(selectedSale.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.name || item.product?.name || 'Item'} x{item.quantity}</span>
                      <span className="font-medium">£{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600">£{(selectedSale.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {showRefundModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Process Refund</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Refund</label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={3}
                    placeholder="Enter refund reason..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setShowRefundModal(false); setRefundingSaleId(null); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefund}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Process Refund
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
