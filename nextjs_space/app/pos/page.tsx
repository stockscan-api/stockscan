'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
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
  Printer,
  ArrowLeft,
  CheckCircle2,
  Pencil,
  Tag,
} from 'lucide-react';

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  originalPrice: number;
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

interface InvoiceData {
  id: string;
  saleNumber?: string;
  receiptNumber?: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName: string;
  soldByName?: string;
  createdAt: string;
}

type PosView = 'sell' | 'history' | 'receipt';

export default function PosPage() {
  const { hasRole, user } = useAuth();
  const canRefund = hasRole(['MANAGER', 'OWNER']);
  const [view, setView] = useState<PosView>('sell');
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerName, setCustomerName] = useState('');

  // Company branding & VAT
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');
  const [brandAddress, setBrandAddress] = useState('');
  const [brandPhone, setBrandPhone] = useState('');
  const [brandEmail, setBrandEmail] = useState('');
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState('');
  const [vatRatePercent, setVatRatePercent] = useState(20);

  useEffect(() => {
    // Fetch company profile from API to get name, address, phone, email
    const loadBranding = async () => {
      try {
        const company = await apiClient.getCompanyProfile();
        const cId = company?.id || '';
        setBrandName(company?.name || '');
        setBrandAddress(company?.address || '');
        setBrandPhone(company?.phone || '');
        setBrandEmail(company?.email || '');
        if (cId) {
          try {
            const raw = localStorage.getItem(`stockscan_branding_${cId}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.logo) setBrandLogo(parsed.logo);
              setVatRegistered(parsed.vatRegistered || false);
              setVatNumber(parsed.vatNumber || '');
              setVatRatePercent(parseFloat(parsed.vatRate) || 20);
            }
          } catch {}
        }
      } catch {
        setBrandName(user?.company?.name || '');
      }
    };
    if (user) loadBranding();
  }, [user]);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Custom (non-stock) item
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');

  // Invoice data for receipt view (works for both new sales and historical lookups)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  // Sales history
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundingSaleId, setRefundingSaleId] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async (query?: string) => {
    try {
      const params: any = { limit: 50 };
      if (query) params.search = query;
      const res = await apiClient.getProducts(params);
      const list = res?.products || res?.items || res?.data || (Array.isArray(res) ? res : []);
      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const res = await apiClient.getPosSales({ limit: 50 });
      const list = res?.sales || res?.items || res?.data || (Array.isArray(res) ? res : []);
      setSales(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Failed to load sales:', err);
      toast.error('Failed to load sales history');
    } finally {
      setLoadingSales(false);
    }
  }, []);

  // Load initial products
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounced server-side search
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetchProducts(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    if (view === 'history') fetchSales();
  }, [view, fetchSales]);

  // Products are now server-filtered, no client-side filter needed
  const filteredProducts = products;

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const unitPrice = product.unitPrice ?? product.sellingPrice ?? product.price ?? 0;
      return [...prev, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: unitPrice,
        originalPrice: unitPrice,
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

  const setCartQty = (productId: string, qty: number) => {
    if (qty < 1) return;
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const setCartPrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, price: newPrice } : i));
  };

  const resetCartPrice = (productId: string) => {
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, price: i.originalPrice } : i));
  };

  const addCustomItem = () => {
    const name = customItemName.trim();
    const price = parseFloat(customItemPrice);
    const qty = parseInt(customItemQty, 10) || 1;
    if (!name) { toast.error('Enter an item description'); return; }
    if (isNaN(price) || price <= 0) { toast.error('Enter a valid price'); return; }
    const customId = `custom-${Date.now()}`;
    setCart(prev => [...prev, {
      productId: customId,
      name,
      sku: 'NON-STOCK',
      price,
      originalPrice: price,
      quantity: qty,
    }]);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty('1');
    setShowCustomItem(false);
    toast.success(`Added: ${name}`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const tax = vatRegistered ? subtotal * (vatRatePercent / 100) : 0;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setProcessing(true);
    try {
      const saleData = {
        items: cart.map(i => ({
          productId: i.productId.startsWith('custom-') ? undefined as any : i.productId,
          productName: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
          ...(i.sku === 'NON-STOCK' ? { sku: 'NON-STOCK' } : {}),
        })),
        paymentMethod,
        customerName: customerName || undefined,
        amountTendered: total,
      };
      const result = await apiClient.createPosSale(saleData);
      toast.success('Sale completed successfully!');

      // Build invoice from backend response + cart data
      const invoice: InvoiceData = {
        id: result?.id || '',
        saleNumber: result?.saleNumber || result?.receiptNumber || result?.id?.slice(0, 8) || 'N/A',
        receiptNumber: result?.receiptNumber,
        items: (result?.items || cart).map((item: any) => ({
          name: item.productName || item.name || 'Item',
          sku: item.sku || cart.find(c => c.productId === item.productId)?.sku || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice ?? item.price ?? 0,
          lineTotal: item.lineTotal ?? (item.unitPrice ?? item.price ?? 0) * (item.quantity || 1),
        })),
        subtotal: result?.subtotal ?? subtotal,
        tax: result?.totalVAT ?? tax,
        total: result?.total ?? total,
        paymentMethod: result?.payments?.[0]?.paymentMethod || paymentMethod,
        customerName: result?.customerName || customerName || 'Walk-in Customer',
        soldByName: result?.soldByName || user?.name || '',
        createdAt: result?.createdAt || new Date().toISOString(),
      };
      setInvoiceData(invoice);
      setCart([]);
      setCustomerName('');
      setView('receipt');
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!invoiceData) return;
    const inv = invoiceData;
    const dateStr = new Date(inv.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = new Date(inv.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const itemRows = inv.items.map(item => `
      <tr>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb;">${item.name}${item.sku ? `<br><span style="font-size:11px;color:#9ca3af;font-family:monospace;">${item.sku}</span>` : ''}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:center;">${item.quantity}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right;">£${item.unitPrice.toFixed(2)}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:600;">£${item.lineTotal.toFixed(2)}</td>
      </tr>
    `).join('');

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${inv.saleNumber}</title>
  <style>
    @page { size: A4; margin: 20mm 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 14px; line-height: 1.5; }
    .page { max-width: 210mm; margin: 0 auto; padding: 40px; }
    
    /* Header */
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #1e3a5f; }
    .inv-header .brand h1 { font-size: 28px; font-weight: 800; color: #1e3a5f; letter-spacing: -0.5px; }
    .inv-header .brand p { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .inv-header .inv-title { text-align: right; }
    .inv-header .inv-title h2 { font-size: 24px; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 2px; }
    .inv-header .inv-title .inv-num { font-size: 16px; color: #374151; font-family: monospace; margin-top: 4px; }
    
    /* Meta Grid */
    .inv-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 36px; }
    .meta-block { background: #f9fafb; border-radius: 8px; padding: 16px 20px; }
    .meta-block .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 600; margin-bottom: 4px; }
    .meta-block .value { font-size: 15px; font-weight: 600; color: #111827; }
    
    /* Items Table */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .items-table thead th { background: #1e3a5f; color: #ffffff; padding: 12px 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; text-align: left; }
    .items-table thead th:nth-child(2) { text-align: center; }
    .items-table thead th:nth-child(3),
    .items-table thead th:nth-child(4) { text-align: right; }
    .items-table tbody td { font-size: 14px; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    
    /* Totals */
    .totals-wrapper { display: flex; justify-content: flex-end; }
    .totals { width: 280px; }
    .totals .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals .row .label { color: #6b7280; }
    .totals .row .amount { font-weight: 600; color: #111827; }
    .totals .row.grand { font-size: 20px; font-weight: 800; padding-top: 14px; margin-top: 10px; border-top: 3px solid #1e3a5f; }
    .totals .row.grand .amount { color: #059669; }
    
    /* Payment */
    .payment-info { margin-top: 28px; padding: 16px 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .payment-info .method { font-weight: 700; color: #166534; font-size: 15px; }
    .payment-info .status { background: #166534; color: white; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }
    
    /* Footer */
    .inv-footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
    .inv-footer p { margin-bottom: 4px; }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 0; max-width: none; }
      button { display: none !important; }
    }
    @media screen {
      body { background: #e5e7eb; padding: 20px; }
      .page { background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border-radius: 4px; min-height: 297mm; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="inv-header">
      <div class="brand">
        ${brandLogo ? `<img src="${brandLogo}" alt="Logo" style="height:48px;max-width:180px;object-fit:contain;margin-bottom:6px;" />` : ''}
        <h1>${brandName || 'Invoice'}</h1>
        ${brandAddress ? `<p style="white-space:pre-line;margin-top:4px;">${brandAddress.replace(/\n/g, '<br/>')}</p>` : ''}
        ${brandPhone ? `<p>Tel: ${brandPhone}</p>` : ''}
        ${brandEmail ? `<p>${brandEmail}</p>` : ''}
      </div>
      <div class="inv-title">
        <h2>Invoice</h2>
        <div class="inv-num">${inv.saleNumber}</div>
      </div>
    </div>
    
    <div class="inv-meta">
      <div class="meta-block">
        <div class="label">Date &amp; Time</div>
        <div class="value">${dateStr} at ${timeStr}</div>
      </div>
      <div class="meta-block">
        <div class="label">Customer</div>
        <div class="value">${inv.customerName}</div>
      </div>
      <div class="meta-block">
        <div class="label">Payment Method</div>
        <div class="value">${inv.paymentMethod}</div>
      </div>
      <div class="meta-block">
        <div class="label">Served By</div>
        <div class="value">${inv.soldByName || ''}</div>
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
    
    <div class="totals-wrapper">
      <div class="totals">
        <div class="row">
          <span class="label">Subtotal${vatRegistered ? ' (ex. VAT)' : ''}</span>
          <span class="amount">£${inv.subtotal.toFixed(2)}</span>
        </div>
        ${vatRegistered ? `<div class="row">
          <span class="label">VAT @ ${vatRatePercent}%</span>
          <span class="amount">£${inv.tax.toFixed(2)}</span>
        </div>` : ''}
        <div class="row grand">
          <span class="label">Total</span>
          <span class="amount">£${inv.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
    ${vatRegistered && vatNumber ? `<div style="margin-top:12px;text-align:right;font-size:12px;color:#6b7280;">VAT No: ${vatNumber}</div>` : ''}
    
    <div class="payment-info">
      <span class="method">Paid by ${inv.paymentMethod}</span>
      <span class="status">PAID</span>
    </div>
    
    <div class="inv-footer">
      <p>Thank you for your business!</p>
      <p>Generated by ${brandName || 'StockScan'} · ${dateStr}</p>
    </div>
  </div>
  <script>setTimeout(function() { window.print(); }, 400);<\/script>
</body>
</html>`);
      w.document.close();
    }
  };

  const handleNewSale = () => {
    setInvoiceData(null);
    setView('sell');
  };

  const handleBackToHistory = () => {
    setInvoiceData(null);
    setView('history');
  };

  /** Open invoice view for a historical sale */
  const viewSaleInvoice = (sale: Sale) => {
    const invoice: InvoiceData = {
      id: sale.id,
      saleNumber: sale.saleNumber || sale.id.slice(0, 8),
      receiptNumber: (sale as any).receiptNumber,
      items: (sale.items || []).map((item: any) => ({
        name: item.productName || item.name || item.product?.name || 'Item',
        sku: item.sku || item.product?.sku || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice ?? item.price ?? 0,
        lineTotal: item.lineTotal ?? ((item.unitPrice ?? item.price ?? 0) * (item.quantity || 1)),
      })),
      subtotal: sale.subtotal || (sale as any).subtotal || 0,
      tax: sale.tax || (sale as any).totalVAT || 0,
      total: sale.total || 0,
      paymentMethod: (sale as any).payments?.[0]?.paymentMethod || sale.paymentMethod || 'N/A',
      customerName: sale.customerName || 'Walk-in Customer',
      soldByName: (sale as any).soldByName || '',
      createdAt: sale.createdAt,
    };
    setInvoiceData(invoice);
    setSelectedSale(null);
    setView('receipt');
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

        {view === 'receipt' && invoiceData ? (
          /* Receipt / Invoice View */
          <div className="max-w-lg mx-auto space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <Receipt className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-800">Invoice {invoiceData.saleNumber}</p>
                <p className="text-sm text-blue-600">
                  {new Date(invoiceData.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewSale}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="h-4 w-4" />
                  New Sale
                </button>
                <button
                  onClick={handleBackToHistory}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <History className="h-4 w-4" />
                  Sales History
                </button>
              </div>
              <button
                onClick={handlePrintReceipt}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
            </div>

            {/* Printable Receipt Content */}
            <div ref={receiptRef} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="receipt-header text-center pb-4 border-b-2 border-gray-200">
                  {brandLogo && (
                    <img src={brandLogo} alt="Logo" className="h-12 max-w-[180px] object-contain mx-auto mb-2" />
                  )}
                  <h1 className="text-2xl font-bold text-gray-900">{brandName || 'Invoice'}</h1>
                  {brandAddress && <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">{brandAddress}</p>}
                  {(brandPhone || brandEmail) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {brandPhone && <>Tel: {brandPhone}</>}
                      {brandPhone && brandEmail && <> · </>}
                      {brandEmail && <>{brandEmail}</>}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">SALES INVOICE / RECEIPT</p>
                </div>

                {/* Sale Meta */}
                <div className="receipt-meta grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Invoice #</span>
                    <strong className="text-gray-900 font-mono">{invoiceData.saleNumber}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 block text-xs">Date</span>
                    <strong className="text-gray-900">{new Date(invoiceData.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Customer</span>
                    <strong className="text-gray-900">{invoiceData.customerName}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 block text-xs">Payment</span>
                    <span className="payment-badge inline-block bg-gray-100 px-2.5 py-0.5 rounded-full text-xs font-semibold text-gray-700">{invoiceData.paymentMethod}</span>
                  </div>
                  {(invoiceData.soldByName || user?.name) && (
                    <div className="col-span-2">
                      <span className="text-gray-500 block text-xs">Served by</span>
                      <strong className="text-gray-900">{invoiceData.soldByName || user?.name}</strong>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <table className="items-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2.5">
                          <span className="text-gray-900 font-medium">{item.name}</span>
                          {item.sku && <span className="block text-xs text-gray-400 font-mono">{item.sku}</span>}
                        </td>
                        <td className="py-2.5 text-center text-gray-700">{item.quantity}</td>
                        <td className="py-2.5 text-right text-gray-600">£{item.unitPrice.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-900">£{item.lineTotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="totals border-t-2 border-gray-200 pt-3 space-y-1">
                  <div className="row flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal{vatRegistered ? ' (ex. VAT)' : ''}</span>
                    <span className="font-medium text-gray-900">£{invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  {vatRegistered && (
                    <div className="row flex justify-between text-sm">
                      <span className="text-gray-600">VAT ({vatRatePercent}%)</span>
                      <span className="font-medium text-gray-900">£{invoiceData.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="row grand flex justify-between text-xl font-bold pt-3 mt-2 border-t-2 border-gray-900">
                    <span>Total</span>
                    <span className="amount text-green-600">£{invoiceData.total.toFixed(2)}</span>
                  </div>
                </div>

                {vatRegistered && vatNumber && (
                  <p className="text-xs text-gray-400 text-right mt-2">VAT No: {vatNumber}</p>
                )}

                {/* Footer */}
                <div className="footer text-center pt-4 mt-4 border-t border-dashed border-gray-300">
                  <p className="text-xs text-gray-400">Thank you for your purchase!</p>
                  <p className="text-xs text-gray-400 mt-1">Powered by {brandName || 'StockScan'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : view === 'sell' ? (
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

              {/* Custom Non-Stock Item */}
              {showCustomItem ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                      <Tag className="h-4 w-4" /> Add Non-Stock Item
                    </h3>
                    <button onClick={() => setShowCustomItem(false)} className="p-1 hover:bg-amber-100 rounded">
                      <X className="h-4 w-4 text-amber-600" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <label className="text-xs font-medium text-amber-800 mb-1 block">Description *</label>
                      <input
                        type="text"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        placeholder="e.g. Labour charge, Misc part, Delivery fee..."
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') addCustomItem(); }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-amber-800 mb-1 block">Unit Price (£) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customItemPrice}
                        onChange={(e) => setCustomItemPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        onKeyDown={(e) => { if (e.key === 'Enter') addCustomItem(); }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-amber-800 mb-1 block">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={customItemQty}
                        onChange={(e) => setCustomItemQty(e.target.value)}
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        onKeyDown={(e) => { if (e.key === 'Enter') addCustomItem(); }}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={addCustomItem}
                        className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="h-4 w-4" /> Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCustomItem(true)}
                  className="w-full bg-white border-2 border-dashed border-amber-300 rounded-xl p-3 text-amber-700 hover:bg-amber-50 hover:border-amber-400 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Tag className="h-4 w-4" /> Add Non-Stock / Custom Item
                </button>
              )}

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
                      <p className="text-blue-600 font-bold mt-1">£{(product.unitPrice ?? product.sellingPrice ?? product.price ?? 0).toFixed(2)}</p>
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
                      <div key={item.productId} className="p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.name}
                              {item.sku === 'NON-STOCK' && (
                                <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold align-middle">NON-STOCK</span>
                              )}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-gray-900 w-20 text-right">£{(item.price * item.quantity).toFixed(2)}</p>
                          <button onClick={() => removeFromCart(item.productId)} className="p-1 text-red-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Qty controls: -/+ buttons with editable input */}
                          <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-1 py-0.5">
                            <button onClick={() => updateCartQty(item.productId, -1)} className="p-1 rounded hover:bg-gray-200 transition-colors">
                              <Minus className="h-3 w-3 text-gray-600" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 1) setCartQty(item.productId, val);
                              }}
                              className="w-12 text-center text-sm font-semibold bg-white border border-gray-200 rounded py-0.5 focus:ring-2 focus:ring-blue-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button onClick={() => updateCartQty(item.productId, 1)} className="p-1 rounded hover:bg-gray-200 transition-colors">
                              <Plus className="h-3 w-3 text-gray-600" />
                            </button>
                          </div>
                          <span className="text-xs text-gray-400">×</span>
                          {/* Price: editable input with discount indicator */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">£</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price.toFixed(2)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0) setCartPrice(item.productId, val);
                              }}
                              className="w-20 text-sm font-medium bg-white border border-gray-200 rounded py-0.5 px-1 text-right focus:ring-2 focus:ring-blue-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            {item.price !== item.originalPrice && (
                              <button
                                onClick={() => resetCartPrice(item.productId)}
                                title={`Reset to £${item.originalPrice.toFixed(2)}`}
                                className="p-0.5 text-amber-500 hover:text-amber-700 transition-colors"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          {/* Discount badge */}
                          {item.price < item.originalPrice && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
                              -{Math.round((1 - item.price / item.originalPrice) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart Summary */}
                <div className="p-4 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal{vatRegistered ? ' (ex. VAT)' : ''}</span>
                    <span className="font-medium">£{subtotal.toFixed(2)}</span>
                  </div>
                  {vatRegistered && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">VAT ({vatRatePercent}%)</span>
                      <span className="font-medium">£{tax.toFixed(2)}</span>
                    </div>
                  )}
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
                        <td className="px-4 py-3">
                          <button
                            onClick={() => viewSaleInvoice(sale)}
                            className="font-mono text-blue-600 hover:text-blue-800 hover:underline"
                            title="View Invoice"
                          >
                            {sale.saleNumber || sale.id.slice(0, 8)}
                          </button>
                        </td>
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
                              onClick={() => viewSaleInvoice(sale)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="View / Print Invoice"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setSelectedSale(sale)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
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
                      <span className="text-gray-700">{item.productName || item.name || item.product?.name || 'Item'} x{item.quantity}</span>
                      <span className="font-medium">£{(item.lineTotal || (item.unitPrice || item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600">£{(selectedSale.total || 0).toFixed(2)}</span>
                </div>
                {/* View Invoice Button */}
                <button
                  onClick={() => viewSaleInvoice(selectedSale)}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  <Printer className="h-4 w-4" />
                  View / Print Invoice
                </button>
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
