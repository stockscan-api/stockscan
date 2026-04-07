'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import {
  Palette,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  Upload,
  X,
  Link as LinkIcon,
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

  // Logo upload state
  const [logoMode, setLogoMode] = useState<'url' | 'upload'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, SVG, or WebP image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Get presigned upload URL
      const res = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get upload URL');

      const { uploadUrl, publicUrl } = data;

      // Step 2: Upload file directly to S3
      // Check if content-disposition is in signed headers
      const urlObj = new URL(uploadUrl);
      const signedHeaders = urlObj.searchParams.get('X-Amz-SignedHeaders') || '';
      const headers: Record<string, string> = { 'Content-Type': file.type };
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'attachment';
      }

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file to storage');

      // Step 3: Set the public URL as the logo
      setLogo(publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (err: any) {
      console.error('Logo upload error:', err);
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
              {/* Mode toggle */}
              <div className="flex gap-1 mb-2 bg-gray-100 rounded-lg p-0.5 w-fit">
                <button
                  type="button"
                  onClick={() => setLogoMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    logoMode === 'upload' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    logoMode === 'url' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LinkIcon className="h-3.5 w-3.5" /> URL
                </button>
              </div>

              {logoMode === 'upload' ? (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  {/* Current logo preview or upload area */}
                  {logo ? (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-12 h-12 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-white flex-shrink-0">
                        <img src={logo} alt="Current logo" className="max-w-full max-h-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">Logo set</p>
                        <p className="text-xs text-gray-400 truncate">{logo.length > 60 ? logo.slice(0, 60) + '...' : logo}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Replace'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogo('')}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                          <span className="text-sm text-blue-600">Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-6 w-6 text-gray-400" />
                          <span className="text-sm text-gray-500">Click to upload logo</span>
                          <span className="text-xs text-gray-400">PNG, JPG, SVG, WebP · Max 5MB</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://placehold.co/1200x600/e2e8f0/1e293b?text=A_company_or_brand_logo_image__likely_a_small_icon"
                  />
                  {logo && (
                    <div className="w-10 h-10 rounded border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={logo} alt="Logo preview" className="max-w-full max-h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>
              )}
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
