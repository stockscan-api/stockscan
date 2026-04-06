'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  Package,
  ClipboardList,
  DollarSign,
  Calendar,
  Download,
  Loader2,
  AlertTriangle,
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
  LineChart,
  Line,
  Legend,
} from 'recharts';

type ReportTab = 'sales' | 'stock' | 'job-cards' | 'profit-loss';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const formatCurrency = (val: number) => `£${val.toFixed(2)}`;

export default function ReportsPage() {
  const { hasRole } = useAuth();
  const isOwner = hasRole(['OWNER']);
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setReportData(null);
    try {
      const params = { startDate, endDate };
      let data: any;
      switch (activeTab) {
        case 'sales':
          data = await apiClient.getReportSales(params);
          break;
        case 'stock':
          data = await apiClient.getReportStock(params);
          break;
        case 'job-cards':
          data = await apiClient.getReportJobCards(params);
          break;
        case 'profit-loss':
          data = await apiClient.getReportProfitLoss(params);
          break;
      }
      setReportData(data);
    } catch (err: any) {
      console.error('Report fetch error:', err);
      toast.error(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = async () => {
    try {
      const params = { startDate, endDate, format: 'csv' };
      let data: any;
      switch (activeTab) {
        case 'sales': data = await apiClient.getReportSales(params); break;
        case 'stock': data = await apiClient.getReportStock(params); break;
        case 'job-cards': data = await apiClient.getReportJobCards(params); break;
        case 'profit-loss': data = await apiClient.getReportProfitLoss(params); break;
      }
      if (typeof data === 'string') {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}-report-${startDate}-to-${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (data?.content || data?.csv) {
        const blob = new Blob([data.content || data.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `${activeTab}-report.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.info('CSV export not available for this report');
      }
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    }
  };

  const tabs = [
    { key: 'sales' as const, label: 'Sales', icon: TrendingUp },
    { key: 'stock' as const, label: 'Stock', icon: Package },
    { key: 'job-cards' as const, label: 'Job Cards', icon: ClipboardList },
    ...(isOwner ? [{ key: 'profit-loss' as const, label: 'Profit & Loss', icon: DollarSign }] : []),
  ];

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

        {/* Date Range Filter */}
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

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 flex">
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                    activeTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : !reportData ? (
              <div className="text-center py-16 text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No data available for this period</p>
              </div>
            ) : (
              <>
                {activeTab === 'sales' && <SalesReport data={reportData} />}
                {activeTab === 'stock' && <StockReport data={reportData} />}
                {activeTab === 'job-cards' && <JobCardsReport data={reportData} />}
                {activeTab === 'profit-loss' && <ProfitLossReport data={reportData} />}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ============ SALES REPORT ============
function SalesReport({ data }: { data: any }) {
  const totalSales = data.totalSales ?? data.total ?? 0;
  const salesCount = data.salesCount ?? data.count ?? 0;
  const topProducts = data.topProducts || data.topSellingProducts || [];
  const salesByMethod = data.salesByPaymentMethod || data.byPaymentMethod || [];
  const salesByDate = data.salesByDate || data.dailySales || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-600 font-medium">Number of Sales</p>
          <p className="text-2xl font-bold text-green-900">{salesCount}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm text-purple-600 font-medium">Average Sale</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(salesCount > 0 ? totalSales / salesCount : 0)}</p>
        </div>
      </div>

      {/* Sales Over Time Chart */}
      {salesByDate.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesByDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        {topProducts.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Qty Sold" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sales by Payment Method */}
        {salesByMethod.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">By Payment Method</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={salesByMethod} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {salesByMethod.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ STOCK REPORT ============
function StockReport({ data }: { data: any }) {
  const items = data.items || data.products || data.stockLevels || [];
  const totalValue = data.totalValue ?? data.stockValue ?? 0;
  const lowStockCount = data.lowStockCount ?? (items.filter((i: any) => i.isLowStock || (i.quantity <= (i.reorderPoint || 0))).length);
  const totalItems = data.totalItems ?? items.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600 font-medium">Total Products</p>
          <p className="text-2xl font-bold text-blue-900">{totalItems}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-600 font-medium">Stock Value</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600 font-medium">Low Stock Items</p>
          <p className="text-2xl font-bold text-red-900">{lowStockCount}</p>
        </div>
      </div>

      {/* Stock Levels Table */}
      {items.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Levels</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">SKU</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">In Stock</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Reorder Point</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Value</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 50).map((item: any, idx: number) => {
                  const isLow = item.isLowStock || (item.quantity <= (item.reorderPoint || 0));
                  return (
                    <tr key={idx} className={`border-b border-gray-100 ${isLow ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-2 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-2 text-gray-600">{item.sku}</td>
                      <td className={`px-4 py-2 text-right font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{item.quantity ?? item.stockLevel}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{item.reorderPoint ?? '-'}</td>
                      <td className="px-4 py-2 text-right text-gray-900">{formatCurrency((item.quantity ?? item.stockLevel ?? 0) * (item.costPrice ?? item.price ?? 0))}</td>
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

// ============ JOB CARDS REPORT ============
function JobCardsReport({ data }: { data: any }) {
  const byStatus = data.byStatus || data.jobsByStatus || [];
  const totalJobs = data.totalJobs ?? data.total ?? 0;
  const avgValue = data.averageJobValue ?? data.avgValue ?? 0;
  const totalMaterials = data.totalMaterialsCost ?? data.materialsCost ?? 0;
  const totalLabour = data.totalLabourCost ?? data.labourCost ?? 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600 font-medium">Total Jobs</p>
          <p className="text-2xl font-bold text-blue-900">{totalJobs}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-600 font-medium">Avg Job Value</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(avgValue)}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm text-orange-600 font-medium">Materials Cost</p>
          <p className="text-2xl font-bold text-orange-900">{formatCurrency(totalMaterials)}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm text-purple-600 font-medium">Labour Cost</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(totalLabour)}</p>
        </div>
      </div>

      {/* Jobs by Status */}
      {byStatus.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Jobs by Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {byStatus.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[{ name: 'Materials', value: totalMaterials }, { name: 'Labour', value: totalLabour }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ PROFIT & LOSS REPORT ============
function ProfitLossReport({ data }: { data: any }) {
  const revenue = data.revenue ?? data.totalRevenue ?? 0;
  const costs = data.costs ?? data.totalCosts ?? 0;
  const grossProfit = data.grossProfit ?? (revenue - costs);
  const margin = data.grossMargin ?? (revenue > 0 ? ((grossProfit / revenue) * 100) : 0);
  const netProfit = data.netProfit ?? grossProfit;
  const breakdown = data.breakdown || data.monthlyBreakdown || [];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600 font-medium">Revenue</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(revenue)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600 font-medium">Costs</p>
          <p className="text-2xl font-bold text-red-900">{formatCurrency(costs)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${grossProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-medium ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Gross Profit</p>
          <p className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>{formatCurrency(grossProfit)}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm text-purple-600 font-medium">Margin</p>
          <p className="text-2xl font-bold text-purple-900">{margin.toFixed(1)}%</p>
        </div>
      </div>

      {/* P&L Chart */}
      {breakdown.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Costs</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={breakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" fill="#ef4444" name="Costs" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Net Profit */}
      <div className={`border-2 rounded-xl p-6 text-center ${netProfit >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
        <p className={`text-sm font-medium ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net Profit</p>
        <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>{formatCurrency(netProfit)}</p>
      </div>
    </div>
  );
}
