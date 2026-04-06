'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Palette,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
} from 'lucide-react';

const FEATURE_LABELS: Record<string, { label: string; description: string }> = {
  INVENTORY: { label: 'Inventory', description: 'Products & stock management' },
  JOB_CARDS: { label: 'Job Cards', description: 'Work orders & service management' },
  DELIVERIES: { label: 'Deliveries', description: 'Delivery notes management' },
  POS: { label: 'Point of Sale', description: 'Sales transactions' },
  REPORTS: { label: 'Reports', description: 'Analytics & reporting' },
  BARCODE_SCANNING: { label: 'Barcode Scanning', description: 'Barcode functionality' },
  OFFLINE_MODE: { label: 'Offline Mode', description: 'Offline capabilities (mobile)' },
  BRANDING: { label: 'Branding', description: 'White-label customization' },
};

export default function BrandingPage() {
  const { hasRole } = useAuth();
  const isOwner = hasRole(['OWNER']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Branding state
  const [companyName, setCompanyName] = useState('');
  const [logo, setLogo] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');

  // Feature flags
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [savingFlags, setSavingFlags] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [company, flags] = await Promise.allSettled([
        apiClient.getCompanyBranding(),
        apiClient.getFeatureFlags(),
      ]);
      if (company.status === 'fulfilled' && company.value) {
        const c = company.value;
        setCompanyName(c.name || c.companyName || '');
        setLogo(c.logo || c.logoUrl || '');
        setPrimaryColor(c.primaryColor || c.branding?.primaryColor || '#3b82f6');
        setSecondaryColor(c.secondaryColor || c.branding?.secondaryColor || '#10b981');
      }
      if (flags.status === 'fulfilled' && flags.value) {
        const f = flags.value;
        // could be an object or { flags: {...} }
        setFeatureFlags(f.flags || f || {});
      }
    } catch (err) {
      console.error('Failed to load branding:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      await apiClient.updateBranding({
        companyName,
        logo,
        primaryColor,
        secondaryColor,
      });
      toast.success('Branding updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update branding');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFlag = async (key: string) => {
    const updated = { ...featureFlags, [key]: !featureFlags[key] };
    setFeatureFlags(updated);
    setSavingFlags(true);
    try {
      await apiClient.updateFeatureFlags(updated);
      toast.success(`${FEATURE_LABELS[key]?.label || key} ${updated[key] ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      setFeatureFlags(featureFlags); // revert
      toast.error(err.message || 'Failed to update feature flag');
    } finally {
      setSavingFlags(false);
    }
  };

  if (!isOwner) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-gray-500">
          <Palette className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p>Only company owners can manage branding and features.</p>
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
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Palette className="h-7 w-7 text-blue-600" />
            Branding & Features
          </h1>
          <p className="text-gray-500 mt-1">Customize your company branding and toggle features</p>
        </div>

        {/* Branding Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Company Branding</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://i.pinimg.com/736x/d7/a8/95/d7a895c44c3fcdf6262e345b68ab22a3.jpg"
                />
                {logo && (
                  <div className="w-10 h-10 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                    <img src={logo} alt="Logo preview" className="max-w-full max-h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-sm text-gray-500 mb-3">Preview</p>
            <div className="flex items-center gap-3">
              {logo ? (
                <img src={logo} alt="Company Logo" className="h-10 w-10 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <ImageIcon className="h-5 w-5 text-white" />
                </div>
              )}
              <h3 className="text-lg font-bold" style={{ color: primaryColor }}>{companyName || 'Company Name'}</h3>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button className="px-4 py-1.5 text-white text-sm rounded-lg" style={{ backgroundColor: primaryColor }}>Primary Button</button>
              <button className="px-4 py-1.5 text-white text-sm rounded-lg" style={{ backgroundColor: secondaryColor }}>Secondary Button</button>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveBranding}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Branding
            </button>
          </div>
        </div>

        {/* Feature Flags Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Feature Flags</h2>
          <p className="text-sm text-gray-500 mb-6">Enable or disable features for your company</p>
          <div className="space-y-3">
            {Object.entries(FEATURE_LABELS).map(([key, config]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{config.label}</p>
                  <p className="text-sm text-gray-500">{config.description}</p>
                </div>
                <button
                  onClick={() => handleToggleFlag(key)}
                  disabled={savingFlags}
                  className="flex-shrink-0"
                >
                  {featureFlags[key] ? (
                    <ToggleRight className="h-8 w-8 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-gray-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
