'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SelectInput } from '@/components/ui/select-input';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { FileText, Filter, Loader2, Printer, Eye, X, Search, Receipt, ClipboardList, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

interface UnifiedInvoice {
  id: string;
  invoiceNumber: string;
  source: 'POS' | 'JOB_CARD';
  customerName: string;
  date: string;
  subtotal: number;
  vat: number;
  total: number;
  status: string;
  paymentMethod?: string;
  jobReference?: string;
  jobName?: string;
  items: { name: string; sku?: string; quantity: number; unitPrice: number; lineTotal: number }[];
  labourItems?: { description: string; staffName: string; hours: string; rate: string; lineTotal: string; date: string }[];
  soldByName?: string;
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<UnifiedInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<UnifiedInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Branding
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');
  const [brandAddress, setBrandAddress] = useState('');
  const [brandPhone, setBrandPhone] = useState('');
  const [brandEmail, setBrandEmail] = useState('');
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState('');
  const [vatRatePercent, setVatRatePercent] = useState(20);

  useEffect(() => {
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
              const b = JSON.parse(raw);
              if (b.logoUrl) setBrandLogo(b.logoUrl);
              if (b.vatRegistered) setVatRegistered(true);
              if (b.vatNumber) setVatNumber(b.vatNumber);
              if (b.vatRate) setVatRatePercent(Number(b.vatRate) || 20);
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    };
    if (user) loadBranding();
  }, [user]);

  const fetchAllInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const unified: UnifiedInvoice[] = [];

      // Fetch POS sales
      try {
        const posData = await apiClient.getPosSales({ page: 1, limit: 500 });
        const posSales = posData?.sales || posData?.data || posData || [];
        for (const sale of posSales) {
          unified.push({
            id: sale.id,
            invoiceNumber: sale.saleNumber || sale.receiptNumber || sale.id?.slice(0, 8),
            source: 'POS',
            customerName: sale.customerName || 'Walk-in Customer',
            date: sale.saleDate || sale.createdAt,
            subtotal: sale.subtotal || 0,
            vat: sale.totalVAT || sale.tax || 0,
            total: sale.total || 0,
            status: sale.status || 'COMPLETED',
            paymentMethod: sale.payments?.[0]?.paymentMethod || 'N/A',
            soldByName: sale.soldByName || '',
            items: (sale.items || []).map((item: any) => ({
              name: item.productName || item.name || 'Item',
              sku: item.sku || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice ?? item.unitPriceExVAT ?? 0,
              lineTotal: item.lineTotal ?? item.lineTotalExVAT ?? 0,
            })),
          });
        }
      } catch (e) {
        console.error('Failed to fetch POS sales:', e);
      }

      // Fetch Job Cards (completed ones have invoices)
      try {
        const jobData = await apiClient.getJobCards({ page: 1, limit: 500 });
        const jobCards = jobData?.jobCards || jobData?.data || jobData || [];
        for (const jc of jobCards) {
          if (jc.status !== 'COMPLETED') continue;
          try {
            const inv = await apiClient.getJobCardInvoice(jc.id);
            const summary = inv?.summary || {};
            const lineItems = inv?.lineItems || {};
            unified.push({
              id: jc.id,
              invoiceNumber: jc.jobReference || jc.id?.slice(0, 8),
              source: 'JOB_CARD',
              customerName: jc.customerName || inv?.jobCard?.customerName || 'N/A',
              date: inv?.createdAt || jc.createdAt || jc.startDate,
              subtotal: parseFloat(summary.subtotal || '0'),
              vat: parseFloat(summary.vat || '0'),
              total: parseFloat(summary.total || '0'),
              status: jc.status || 'COMPLETED',
              jobReference: jc.jobReference,
              jobName: jc.jobName || inv?.jobCard?.jobName,
              items: (lineItems.stock || []).map((item: any) => ({
                name: item.description || 'Item',
                sku: item.sku || '',
                quantity: item.quantity || 1,
                unitPrice: parseFloat(item.unitPrice || '0'),
                lineTotal: parseFloat(item.lineTotal || '0'),
              })),
              labourItems: (lineItems.labour || []).map((item: any) => ({
                description: item.description || 'Labour',
                staffName: item.staffName || '',
                hours: item.hours || '0',
                rate: item.rate || '0',
                lineTotal: item.lineTotal || '0',
                date: item.date || '',
              })),
            });
          } catch { /* skip if invoice fetch fails */ }
        }
      } catch (e) {
        console.error('Failed to fetch job cards:', e);
      }

      // Sort by date descending
      unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setInvoices(unified);
      setFilteredInvoices(unified);
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAllInvoices();
  }, [user, fetchAllInvoices]);

  // Apply filters
  useEffect(() => {
    let result = [...invoices];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(lower) ||
        inv.customerName.toLowerCase().includes(lower) ||
        (inv.jobReference || '').toLowerCase().includes(lower) ||
        (inv.jobName || '').toLowerCase().includes(lower)
      );
    }
    if (filterSource) {
      result = result.filter(inv => inv.source === filterSource);
    }
    if (filterDateFrom) {
      result = result.filter(inv => new Date(inv.date) >= new Date(filterDateFrom));
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59);
      result = result.filter(inv => new Date(inv.date) <= to);
    }
    setFilteredInvoices(result);
  }, [invoices, searchTerm, filterSource, filterDateFrom, filterDateTo]);

  const handlePrintInvoice = (inv: UnifiedInvoice) => {
    const dateStr = new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = new Date(inv.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    let itemRows = '';
    if (inv.source === 'POS') {
      itemRows = inv.items.map(item => `
        <tr>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb;">${item.name}${item.sku ? `<br><span style="font-size:11px;color:#9ca3af;font-family:monospace;">${item.sku}</span>` : ''}</td>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:center;">${item.quantity}</td>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right;">£${item.unitPrice.toFixed(2)}</td>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:600;">£${item.lineTotal.toFixed(2)}</td>
        </tr>
      `).join('');
    } else {
      // Job card: materials + labour
      itemRows = inv.items.map(item => `
        <tr>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb;">${item.name}${item.sku ? `<br><span style="font-size:11px;color:#9ca3af;font-family:monospace;">${item.sku}</span>` : ''}</td>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:center;">${item.quantity}</td>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right;">£${item.unitPrice.toFixed(2)}</td>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:600;">£${item.lineTotal.toFixed(2)}</td>
        </tr>
      `).join('');
    }

    let labourSection = '';
    if (inv.source === 'JOB_CARD' && inv.labourItems && inv.labourItems.length > 0) {
      const labourRows = inv.labourItems.map(l => `
        <tr>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb;">${l.description}<br><span style="font-size:11px;color:#9ca3af;">${l.staffName}</span></td>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:center;">${parseFloat(l.hours).toFixed(1)}h</td>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right;">£${parseFloat(l.rate).toFixed(2)}/h</td>
          <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:600;">£${parseFloat(l.lineTotal).toFixed(2)}</td>
        </tr>
      `).join('');
      labourSection = `
        <h3 style="font-size:16px;font-weight:700;color:#1e3a5f;margin:28px 0 12px;">Labour</h3>
        <table class="items-table">
          <thead><tr>
            <th>Description</th><th>Hours</th><th>Rate</th><th>Amount</th>
          </tr></thead>
          <tbody>${labourRows}</tbody>
        </table>
      `;
    }

    const sourceLabel = inv.source === 'POS' ? 'Sales Invoice' : 'Job Card Invoice';
    const metaBlocks = inv.source === 'POS'
      ? `
        <div class="meta-block"><div class="label">Date &amp; Time</div><div class="value">${dateStr} at ${timeStr}</div></div>
        <div class="meta-block"><div class="label">Customer</div><div class="value">${inv.customerName}</div></div>
        <div class="meta-block"><div class="label">Payment Method</div><div class="value">${inv.paymentMethod || 'N/A'}</div></div>
        <div class="meta-block"><div class="label">Served By</div><div class="value">${inv.soldByName || ''}</div></div>
      `
      : `
        <div class="meta-block"><div class="label">Date</div><div class="value">${dateStr}</div></div>
        <div class="meta-block"><div class="label">Customer</div><div class="value">${inv.customerName}</div></div>
        <div class="meta-block"><div class="label">Job Reference</div><div class="value">${inv.jobReference || ''}</div></div>
        <div class="meta-block"><div class="label">Job Name</div><div class="value">${inv.jobName || ''}</div></div>
      `;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${sourceLabel} ${inv.invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 20mm 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 14px; line-height: 1.5; }
    .page { max-width: 210mm; margin: 0 auto; padding: 40px; }
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #1e3a5f; }
    .inv-header .brand h1 { font-size: 28px; font-weight: 800; color: #1e3a5f; letter-spacing: -0.5px; }
    .inv-header .brand p { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .inv-header .inv-title { text-align: right; }
    .inv-header .inv-title h2 { font-size: 24px; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 2px; }
    .inv-header .inv-title .inv-num { font-size: 16px; color: #374151; font-family: monospace; margin-top: 4px; }
    .inv-header .inv-title .inv-type { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 1px; margin-top: 2px; }
    .inv-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 36px; }
    .meta-block { background: #f9fafb; border-radius: 8px; padding: 16px 20px; }
    .meta-block .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 600; margin-bottom: 4px; }
    .meta-block .value { font-size: 15px; font-weight: 600; color: #111827; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .items-table thead th { background: #1e3a5f; color: #ffffff; padding: 12px 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; text-align: left; }
    .items-table thead th:nth-child(2) { text-align: center; }
    .items-table thead th:nth-child(3), .items-table thead th:nth-child(4) { text-align: right; }
    .items-table tbody td { font-size: 14px; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    .totals-wrapper { display: flex; justify-content: flex-end; }
    .totals { width: 280px; }
    .totals .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals .row .label { color: #6b7280; }
    .totals .row .amount { font-weight: 600; color: #111827; }
    .totals .row.grand { font-size: 20px; font-weight: 800; padding-top: 14px; margin-top: 10px; border-top: 3px solid #1e3a5f; }
    .totals .row.grand .amount { color: #059669; }
    .payment-info { margin-top: 28px; padding: 16px 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .payment-info .method { font-weight: 700; color: #166534; font-size: 15px; }
    .payment-info .status { background: #166534; color: white; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }
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
        <div class="inv-num">${inv.invoiceNumber}</div>
        <div class="inv-type">${sourceLabel}</div>
      </div>
    </div>
    <div class="inv-meta">
      ${metaBlocks}
    </div>
    ${inv.source === 'JOB_CARD' && inv.items.length > 0 ? '<h3 style="font-size:16px;font-weight:700;color:#1e3a5f;margin-bottom:12px;">Materials / Parts</h3>' : ''}
    ${inv.items.length > 0 ? `
    <table class="items-table">
      <thead><tr>
        <th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>` : ''}
    ${labourSection}
    <div class="totals-wrapper">
      <div class="totals">
        <div class="row"><span class="label">Subtotal${vatRegistered ? ' (ex. VAT)' : ''}</span><span class="amount">£${inv.subtotal.toFixed(2)}</span></div>
        ${vatRegistered ? `<div class="row"><span class="label">VAT @ ${vatRatePercent}%</span><span class="amount">£${inv.vat.toFixed(2)}</span></div>` : ''}
        <div class="row grand"><span class="label">Total</span><span class="amount">£${inv.total.toFixed(2)}</span></div>
      </div>
    </div>
    ${vatRegistered && vatNumber ? `<div style="margin-top:12px;text-align:right;font-size:12px;color:#6b7280;">VAT No: ${vatNumber}</div>` : ''}
    ${inv.source === 'POS' ? `
    <div class="payment-info">
      <span class="method">Paid by ${inv.paymentMethod}</span>
      <span class="status">PAID</span>
    </div>` : ''}
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

  // Summary stats
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const posCount = filteredInvoices.filter(i => i.source === 'POS').length;
  const jobCount = filteredInvoices.filter(i => i.source === 'JOB_CARD').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-1">All POS sales and job card invoices in one place</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><Receipt className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">Total Invoices</p>
                  <p className="text-xl font-bold">{filteredInvoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg"><ShoppingCart className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">POS Sales: {posCount} | Job Cards: {jobCount}</p>
                  <p className="text-xl font-bold">£{totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg"><FileText className="h-5 w-5 text-purple-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">Average Invoice</p>
                  <p className="text-xl font-bold">£{filteredInvoices.length > 0 ? (totalRevenue / filteredInvoices.length).toFixed(2) : '0.00'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Invoice #, customer, job..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Source</label>
                  <SelectInput
                    value={filterSource}
                    onChange={(e: any) => setFilterSource(typeof e === 'string' ? e : e?.target?.value || '')}
                    options={[
                      { value: '', label: 'All Sources' },
                      { value: 'POS', label: 'POS Sales' },
                      { value: 'JOB_CARD', label: 'Job Cards' },
                    ]}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">From Date</label>
                  <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">To Date</label>
                  <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                </div>
              </div>
              {(searchTerm || filterSource || filterDateFrom || filterDateTo) && (
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setFilterSource(''); setFilterDateFrom(''); setFilterDateTo(''); }}>
                    <X className="h-3 w-3 mr-1" /> Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Invoice Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-500">Loading invoices...</span>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No invoices found</p>
                <p className="text-sm mt-1">Invoices from POS sales and completed job cards will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Source</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={`${inv.source}-${inv.id}`} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-medium text-gray-900">{inv.invoiceNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={inv.source === 'POS'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                            }
                          >
                            {inv.source === 'POS' ? (
                              <><ShoppingCart className="h-3 w-3 mr-1" />POS Sale</>
                            ) : (
                              <><ClipboardList className="h-3 w-3 mr-1" />Job Card</>
                            )}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {inv.customerName}
                          {inv.jobName && <span className="block text-xs text-gray-400">{inv.jobName}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          £{inv.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={inv.status === 'COMPLETED'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : inv.status === 'REFUNDED'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintInvoice(inv)}
                            className="gap-1"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            View / Print
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
