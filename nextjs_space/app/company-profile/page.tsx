'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import {
  Building2,
  Save,
  Loader2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Hash,
  Receipt,
} from 'lucide-react';

export default function CompanyProfilePage() {
  const { hasRole } = useAuth();
  const isManagerOrOwner = hasRole(['MANAGER', 'OWNER']);
  const isOwner = hasRole(['OWNER']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Company details
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');

  // Receipt settings (stored in localStorage)
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [showVatOnReceipt, setShowVatOnReceipt] = useState(true);
  const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>('80mm');

  // VAT state (stored in localStorage)
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState('');
  const [vatRate, setVatRate] = useState('20');

  const getStorageKey = (cId: string) => `stockscan_company_${cId}`;

  const loadLocalSettings = (cId: string) => {
    try {
      const raw = localStorage.getItem(getStorageKey(cId));
      if (raw) return JSON.parse(raw);
    } catch {}
    // Also check branding storage for VAT migration
    try {
      const brandingRaw = localStorage.getItem(`stockscan_branding_${cId}`);
      if (brandingRaw) {
        const b = JSON.parse(brandingRaw);
        return {
          vatRegistered: b.vatRegistered || false,
          vatNumber: b.vatNumber || '',
          vatRate: b.vatRate || '20',
          receiptHeader: '',
          receiptFooter: '',
          showVatOnReceipt: true,
          receiptWidth: '80mm',
        };
      }
    } catch {}
    return null;
  };

  const saveLocalSettings = (cId: string, data: Record<string, any>) => {
    try {
      localStorage.setItem(getStorageKey(cId), JSON.stringify(data));
    } catch {}
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const company = await apiClient.getCompanyProfile();
      if (company) {
        const cId = company.id || '';
        setCompanyId(cId);
        setCompanyName(company.name || '');
        setCompanyAddress(company.address || '');
        setCompanyPhone(company.phone || '');
        setCompanyEmail(company.email || '');

        const local = loadLocalSettings(cId);
        if (local) {
          setVatRegistered(local.vatRegistered || false);
          setVatNumber(local.vatNumber || '');
          setVatRate(local.vatRate || '20');
          setReceiptHeader(local.receiptHeader || '');
          setReceiptFooter(local.receiptFooter || '');
          setShowVatOnReceipt(local.showVatOnReceipt !== false);
          setReceiptWidth(local.receiptWidth || '80mm');
        }
      }
    } catch (err) {
      console.error('Failed to load company profile:', err);
      toast.error('Failed to load company profile');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (companyId && isOwner) {
        await apiClient.updateCompanyDetails(companyId, {
          name: companyName,
          address: companyAddress,
          phone: companyPhone,
          email: companyEmail,
        });
      }
      if (companyId) {
        saveLocalSettings(companyId, {
          vatRegistered,
          vatNumber,
          vatRate,
          receiptHeader,
          receiptFooter,
          showVatOnReceipt,
          receiptWidth,
        });
      }
      toast.success('Company profile saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save company profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isManagerOrOwner) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-gray-500">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p>Only managers and owners can view the company profile.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-600" />
            Company Profile
          </h1>
          <p className="text-gray-500 mt-1">Manage your business details and receipt settings</p>
        </div>

        {/* Business Details Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            Business Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <Building2 className="h-3.5 w-3.5" /> Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!isOwner}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-3.5 w-3.5" /> Email Address
              </label>
              <input
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                disabled={!isOwner}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="info@yourcompany.com"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-3.5 w-3.5" /> Phone Number
              </label>
              <input
                type="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                disabled={!isOwner}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. 0121 123 4567"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <MapPin className="h-3.5 w-3.5" /> Business Address
              </label>
              <textarea
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                disabled={!isOwner}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Street address, City, Postcode"
                rows={2}
              />
              <p className="text-xs text-gray-400 mt-1">Appears on invoices and delivery notes</p>
            </div>
          </div>
        </div>

        {/* VAT Settings */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Hash className="h-5 w-5 text-gray-400" />
            VAT Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">VAT Registered</p>
                <p className="text-sm text-gray-500">Enable if your company is VAT registered. VAT will be applied to POS sales.</p>
              </div>
              <button
                onClick={() => setVatRegistered(!vatRegistered)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  vatRegistered ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  vatRegistered ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            {vatRegistered && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-blue-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                  <input
                    type="text"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. GB123456789"
                  />
                  <p className="text-xs text-gray-400 mt-1">Displayed on invoices and receipts</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
                  <input
                    type="number"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="20"
                    min="0"
                    max="100"
                    step="0.5"
                  />
                  <p className="text-xs text-gray-400 mt-1">Standard UK VAT rate is 20%</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Receipt Settings */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gray-400" />
            Receipt Settings
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Header</label>
              <textarea
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Custom text displayed at the top of receipts"
                rows={2}
              />
              <p className="text-xs text-gray-400 mt-1">Appears at the top of printed receipts</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Footer</label>
              <textarea
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="e.g. Thank you for your business!"
                rows={2}
              />
              <p className="text-xs text-gray-400 mt-1">Appears at the bottom of printed receipts</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Width</label>
                <div className="flex gap-2">
                  {(['58mm', '80mm'] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => setReceiptWidth(w)}
                      className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors ${
                        receiptWidth === w
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Match your thermal printer width</p>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 text-sm">Show VAT on Receipt</p>
                  <p className="text-xs text-gray-500">Display VAT breakdown on receipts</p>
                </div>
                <button
                  onClick={() => setShowVatOnReceipt(!showVatOnReceipt)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showVatOnReceipt ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showVatOnReceipt ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Receipt Preview */}
          <div className="mt-6 p-4 rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Receipt Preview
            </p>
            <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-[300px] mx-auto font-mono text-xs">
              <div className="text-center space-y-0.5">
                <p className="font-bold text-sm">{companyName || 'Company Name'}</p>
                {companyAddress && <p className="text-gray-600">{companyAddress}</p>}
                {companyPhone && <p className="text-gray-600">Tel: {companyPhone}</p>}
                {receiptHeader && <p className="text-gray-600 mt-1 pt-1 border-t border-dashed border-gray-300">{receiptHeader}</p>}
              </div>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="space-y-1 text-gray-500">
                <div className="flex justify-between"><span>Sample Item 1</span><span>£10.00</span></div>
                <div className="flex justify-between"><span>Sample Item 2</span><span>£5.00</span></div>
              </div>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="flex justify-between font-bold"><span>Total</span><span>£15.00</span></div>
              {showVatOnReceipt && vatRegistered && (
                <div className="flex justify-between text-gray-500 text-[10px]"><span>VAT ({vatRate}%)</span><span>£{(15 * Number(vatRate) / (100 + Number(vatRate))).toFixed(2)}</span></div>
              )}
              {vatNumber && <p className="text-center text-gray-400 mt-1 text-[10px]">VAT No: {vatNumber}</p>}
              {receiptFooter && (
                <>
                  <div className="border-t border-dashed border-gray-300 my-2" />
                  <p className="text-center text-gray-600">{receiptFooter}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        {isOwner && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
