'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Calendar,
  Download,
  Loader2,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ShoppingCart,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type ReportSection = 'inventory' | 'financial' | 'products';
type InventoryTab = 'low-stock' | 'valuation' | 'movement';
type FinancialTab = 'profit-loss' | 'category-performance';
type ProductsTab = 'top-performers' | 'underperformers';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const formatCurrency = (val: number) => `£${(val || 0).toFixed(2)}`;

export default function ReportsPage() {
  const { hasRole } = useAuth();
  const isOwner = hasRole(['OWNER']);
  const [section, setSection] = useState<ReportSection>('inventory');
  const [inventoryTab, setInventoryTab] = useState<InventoryTab>('low-stock');
  const [financialTab, setFinancialTab] = useState<FinancialTab>('profit-loss');
  const [productsTab, setProductsTab] = useState<ProductsTab>('top-performers');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const d = new Date();
    setEndDate(d.toISOString().split('T')[0]);
    d.setMonth(d.getMonth() - 1);
    setStartDate(d.toISOString().split('T')[0]);
    setMounted(true);
  }, []);

  // Which sub-tab is active based on section
  const activeSubTab = section === 'inventory' ? inventoryTab : section === 'financial' ? financialTab : productsTab;

  // Does this sub-tab need date range?
  const needsDateRange = !['low-stock', 'valuation'].includes(activeSubTab);

  const fetchReport = useCallback(async () => {
    if (!mounted) return;
    setLoading(true);
    setReportData(null);
    try {
      let data: any;
      const dates = { startDate, endDate };

      if (section === 'inventory') {
        switch (inventoryTab) {
          case 'low-stock': data = await apiClient.getReportLowStock(); break;
          case 'valuation': data = await apiClient.getReportValuation(); break;
          case 'movement': data = await apiClient.getReportMovement(dates); break;
        }
      } else if (section === 'financial') {
        switch (financialTab) {
          case 'profit-loss': data = await apiClient.getReportProfitLoss(dates); break;
          case 'category-performance': data = await apiClient.getReportCategoryPerformance(dates); break;
        }
      } else {
        switch (productsTab) {
          case 'top-performers': data = await apiClient.getReportTopPerformers(dates); break;
          case 'underperformers': data = await apiClient.getReportUnderperformers(dates); break;
        }
      }
      setReportData(data);
    } catch (err: any) {
      console.error('Report fetch error:', err);
      toast.error(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [section, inventoryTab, financialTab, productsTab, startDate, endDate, mounted]);

  useEffect(() => {
    if (mounted && startDate && endDate) fetchReport();
  }, [fetchReport, mounted, startDate, endDate]);

  const exportCSV = (rows: Record<string, any>[], filename: string) => {
    if (!rows || rows.length === 0) { toast('No data to export', { icon: 'ℹ️' }); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
      const v = r[h];
      return typeof v === 'string' && v.includes(',') ? `"${v}"` : v ?? '';
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!reportData) { toast('No data to export', { icon: 'ℹ️' }); return; }
    const tabName = activeSubTab;
    const fname = `${tabName}-report-${startDate}-to-${endDate}.csv`;

    // Try to extract an array of rows from the report data
    const items = reportData.items || reportData.movements || reportData.products || reportData.categories || reportData.topByRevenue || reportData.lowestByRevenue || reportData.byCategory;
    if (Array.isArray(items) && items.length > 0) {
      exportCSV(items, fname);
    } else {
      toast('CSV export not available for this report', { icon: 'ℹ️' });
    }
  };

  const sections = [
    { key: 'inventory' as const, label: 'Inventory', icon: Package },
    ...(isOwner ? [{ key: 'financial' as const, label: 'Financial', icon: DollarSign }] : []),
    { key: 'products' as const, label: 'Products', icon: ShoppingCart },
  ];

  const inventoryTabs = [
    { key: 'low-stock' as const, label: 'Low Stock' },
    { key: 'valuation' as const, label: 'Stock Valuation' },
    { key: 'movement' as const, label: 'Stock Movement' },
  ];

  const financialTabs = [
    { key: 'profit-loss' as const, label: 'Profit & Loss' },
    { key: 'category-performance' as const, label: 'Category Performance' },
  ];

  const productsTabs = [
    { key: 'top-performers' as const, label: 'Top Performers' },
    { key: 'underperformers' as const, label: 'Underperformers' },
  ];

  const subTabs = section === 'inventory' ? inventoryTabs : section === 'financial' ? financialTabs : productsTabs;
  const activeSubTabSetter = section === 'inventory' ? setInventoryTab : section === 'financial' ? setFinancialTab : setProductsTab;

  if (!mounted) return <DashboardLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-blue-600" />
              Reports
            </h1>
            <p className="text-gray-500 mt-1">Analytics and insights for your business</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 flex-wrap">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => { setSection(s.key); setReportData(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  section === s.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Date Range (only for date-dependent reports) */}
        {needsDateRange && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchReport}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Sub-tabs + Content */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 flex">
            {subTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => { (activeSubTabSetter as any)(tab.key); setReportData(null); }}
                className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors ${
                  activeSubTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : !reportData ? (
              <div className="text-center py-16 text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No data available</p>
              </div>
            ) : (
              <>
                {section === 'inventory' && inventoryTab === 'low-stock' && <LowStockReport data={reportData} />}
                {section === 'inventory' && inventoryTab === 'valuation' && <ValuationReport data={reportData} />}
                {section === 'inventory' && inventoryTab === 'movement' && <MovementReport data={reportData} />}
                {section === 'financial' && financialTab === 'profit-loss' && <ProfitLossReport data={reportData} />}
                {section === 'financial' && financialTab === 'category-performance' && <CategoryPerformanceReport data={reportData} />}
                {section === 'products' && productsTab === 'top-performers' && <TopPerformersReport data={reportData} />}
                {section === 'products' && productsTab === 'underperformers' && <UnderperformersReport data={reportData} />}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ============ LOW STOCK REPORT ============
function LowStockReport({ data }: { data: any }) {
  const summary = data.summary || {};
  const items = data.items || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Total Low Stock Items" value={summary.totalLowStock ?? items.length} color="red" />
        <SummaryCard label="Out of Stock" value={summary.outOfStock ?? 0} color="red" />
        <SummaryCard label="Critical Items" value={summary.criticalCount ?? 0} color="orange" />
      </div>

      {items.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">SKU</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Current Stock</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Min Level</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => (
                  <tr key={idx} className={`border-b border-gray-100 ${(item.currentStock ?? item.quantity ?? 0) === 0 ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-2 font-medium text-gray-900">{item.name || item.productName}</td>
                    <td className="px-4 py-2 text-gray-600">{item.sku || '-'}</td>
                    <td className="px-4 py-2 text-right font-medium text-red-600">{item.currentStock ?? item.quantity ?? 0}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{item.minStockLevel ?? item.reorderPoint ?? '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{item.category || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ VALUATION REPORT ============
function ValuationReport({ data }: { data: any }) {
  const summary = data.summary || {};
  const byCategory = data.byCategory || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Total Stock Value" value={formatCurrency(summary.totalValue ?? 0)} color="green" />
        <SummaryCard label="Total Products" value={summary.totalProducts ?? 0} color="blue" />
        <SummaryCard label="Total Units" value={summary.totalUnits ?? summary.totalQuantity ?? 0} color="purple" />
      </div>

      {byCategory.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Value by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {byCategory.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
            <div className="space-y-2">
              {byCategory.map((cat: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-medium text-gray-900">{cat.category || cat.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(cat.value ?? cat.totalValue ?? 0)}</p>
                    <p className="text-xs text-gray-500">{cat.count ?? cat.productCount ?? 0} products</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ MOVEMENT REPORT ============
function MovementReport({ data }: { data: any }) {
  const summary = data.summary || {};
  const movements = data.movements || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Total In" value={summary.totalIn ?? 0} color="green" icon={<ArrowDown className="h-4 w-4" />} />
        <SummaryCard label="Total Out" value={summary.totalOut ?? 0} color="red" icon={<ArrowUp className="h-4 w-4" />} />
        <SummaryCard label="Net Change" value={summary.netChange ?? 0} color={summary.netChange >= 0 ? 'green' : 'red'} />
        <SummaryCard label="Total Movements" value={summary.totalMovements ?? movements.length} color="blue" />
      </div>

      {movements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Movements</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Quantity</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 100).map((m: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">{m.date ? new Date(m.date).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-2 font-medium text-gray-900">{m.productName || m.name || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.type === 'IN' || m.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.type === 'IN' || m.type === 'in' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">{m.quantity}</td>
                    <td className="px-4 py-2 text-gray-600">{m.reason || m.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ PROFIT & LOSS REPORT ============
function ProfitLossReport({ data }: { data: any }) {
  const summary = data.summary || {};
  const products = data.products || [];
  const revenue = summary.totalRevenue ?? summary.revenue ?? 0;
  const costs = summary.totalCosts ?? summary.costs ?? summary.totalCost ?? 0;
  const grossProfit = summary.grossProfit ?? (revenue - costs);
  const margin = summary.margin ?? summary.grossMargin ?? (revenue > 0 ? ((grossProfit / revenue) * 100) : 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Revenue" value={formatCurrency(revenue)} color="blue" />
        <SummaryCard label="Cost of Goods" value={formatCurrency(costs)} color="red" />
        <SummaryCard label="Gross Profit" value={formatCurrency(grossProfit)} color={grossProfit >= 0 ? 'green' : 'red'} />
        <SummaryCard label="Margin" value={`${(typeof margin === 'number' ? margin : 0).toFixed(1)}%`} color="purple" />
      </div>

      {/* Revenue vs Costs bar */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Costs</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[{ name: 'Revenue', value: revenue }, { name: 'Costs', value: costs }, { name: 'Profit', value: grossProfit }]} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              <Cell fill="#3b82f6" />
              <Cell fill="#ef4444" />
              <Cell fill={grossProfit >= 0 ? '#10b981' : '#ef4444'} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Product-level P&L */}
      {products.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Product</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Product</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Revenue</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Cost</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Profit</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Margin</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 50).map((p: any, idx: number) => {
                  const pRev = p.revenue ?? p.totalRevenue ?? 0;
                  const pCost = p.cost ?? p.totalCost ?? 0;
                  const pProfit = p.profit ?? p.grossProfit ?? (pRev - pCost);
                  const pMargin = pRev > 0 ? ((pProfit / pRev) * 100) : 0;
                  return (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">{p.name || p.productName}</td>
                      <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(pRev)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(pCost)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${pProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(pProfit)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{pMargin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ CATEGORY PERFORMANCE REPORT ============
function CategoryPerformanceReport({ data }: { data: any }) {
  const summary = data.summary || {};
  const categories = data.categories || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Total Revenue" value={formatCurrency(summary.totalRevenue ?? 0)} color="blue" />
        <SummaryCard label="Categories" value={summary.categoryCount ?? categories.length} color="purple" />
        <SummaryCard label="Total Units Sold" value={summary.totalUnitsSold ?? 0} color="green" />
      </div>

      {categories.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categories.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Share</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categories} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categories.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category table */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Revenue</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Units Sold</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Profit</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Margin</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{c.category || c.name}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(c.revenue ?? 0)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{c.unitsSold ?? c.quantity ?? 0}</td>
                    <td className={`px-4 py-2 text-right font-medium ${(c.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(c.profit ?? 0)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{(c.margin ?? 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ TOP PERFORMERS REPORT ============
function TopPerformersReport({ data }: { data: any }) {
  const summary = data.summary || {};
  const items = data.topByRevenue || data.products || data.items || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Top Revenue" value={formatCurrency(summary.topRevenue ?? (items[0]?.revenue ?? 0))} color="green" icon={<TrendingUp className="h-4 w-4" />} />
        <SummaryCard label="Total Revenue" value={formatCurrency(summary.totalRevenue ?? 0)} color="blue" />
        <SummaryCard label="Products Analysed" value={summary.productCount ?? items.length} color="purple" />
      </div>

      {items.length > 0 && (
        <>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers by Revenue</h3>
            <ResponsiveContainer width="100%" height={Math.min(400, items.length * 40 + 40)}>
              <BarChart data={items.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Product</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Revenue</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Qty Sold</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Avg Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">{p.name || p.productName}</td>
                      <td className="px-4 py-2 text-right font-medium text-green-600">{formatCurrency(p.revenue ?? 0)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{p.quantitySold ?? p.quantity ?? 0}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(p.averagePrice ?? p.avgPrice ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============ UNDERPERFORMERS REPORT ============
function UnderperformersReport({ data }: { data: any }) {
  const summary = data.summary || {};
  const items = data.lowestByRevenue || data.products || data.items || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Lowest Revenue" value={formatCurrency(summary.lowestRevenue ?? (items[0]?.revenue ?? 0))} color="red" icon={<TrendingDown className="h-4 w-4" />} />
        <SummaryCard label="Products with No Sales" value={summary.noSalesCount ?? 0} color="orange" />
        <SummaryCard label="Products Analysed" value={summary.productCount ?? items.length} color="purple" />
      </div>

      {items.length > 0 && (
        <>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Worst Performers by Revenue</h3>
            <ResponsiveContainer width="100%" height={Math.min(400, items.length * 40 + 40)}>
              <BarChart data={items.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#ef4444" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Product</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Revenue</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Qty Sold</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Stock on Hand</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">{p.name || p.productName}</td>
                      <td className="px-4 py-2 text-right font-medium text-red-600">{formatCurrency(p.revenue ?? 0)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{p.quantitySold ?? p.quantity ?? 0}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{p.stockOnHand ?? p.currentStock ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============ SHARED SUMMARY CARD ============
function SummaryCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon?: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  };
  const textColorMap: Record<string, string> = {
    blue: 'text-blue-900',
    green: 'text-green-900',
    red: 'text-red-900',
    orange: 'text-orange-900',
    purple: 'text-purple-900',
  };
  return (
    <div className={`border rounded-xl p-4 ${colorMap[color] || colorMap.blue}`}>
      <p className={`text-sm font-medium flex items-center gap-1 ${colorMap[color]?.split(' ').pop() || 'text-blue-600'}`}>
        {icon}
        {label}
      </p>
      <p className={`text-2xl font-bold ${textColorMap[color] || 'text-blue-900'}`}>{value}</p>
    </div>
  );
}
