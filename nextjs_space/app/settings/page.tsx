'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrency, CURRENCIES, Currency } from '@/contexts/currency-context';
import { useAuth } from '@/contexts/auth-context';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import {
  Settings, Globe, Check, Link2, Unlink, ExternalLink, Loader2,
  Shield, Zap, Clock, CheckCircle2, AlertCircle, ArrowRight, Lock, Eye, EyeOff,
  Server, Wifi, WifiOff, Cloud, Building, RotateCcw, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useServerConnection, DEFAULT_SAAS_URL, ServerType } from '@/contexts/server-connection-context';

type SettingsTab = 'currency' | 'password' | 'server' | 'integrations';

interface IntegrationStatus {
  xero: { connected: boolean; tenantName?: string; connectedAt?: string };
  quickbooks: { connected: boolean; companyName?: string; connectedAt?: string };
  sage: { connected: boolean; companyName?: string; connectedAt?: string };
}

const INTEGRATIONS = [
  {
    id: 'xero' as const,
    name: 'Xero',
    description: 'Popular in UK, Australia & New Zealand. Seamless OAuth connection with PKCE security.',
    logo: '/xero-logo.png',
    color: 'bg-[#13B5EA]',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    features: ['Auto-sync sales to invoices', 'Customer auto-creation', 'VAT calculations', 'PKCE OAuth (most secure)'],
    regions: ['🇬🇧 UK', '🇦🇺 Australia', '🇳🇿 New Zealand'],
  },
  {
    id: 'quickbooks' as const,
    name: 'QuickBooks',
    description: 'Market leader in US & Canada. QuickBooks Online integration with auto-sync.',
    logo: '/quickbooks-logo.png',
    color: 'bg-[#2CA01C]',
    lightBg: 'bg-green-50',
    borderColor: 'border-green-200',
    features: ['Auto-sync sales to invoices', 'Product line items & prices', 'Payment tracking', 'Multi-currency support'],
    regions: ['🇺🇸 United States', '🇨🇦 Canada'],
  },
  {
    id: 'sage' as const,
    name: 'Sage',
    description: 'Trusted in UK & Europe. Sage Business Cloud Accounting with full data access.',
    logo: '/sage-logo.png',
    color: 'bg-[#00D639]',
    lightBg: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    features: ['Full accounting data access', 'Auto-sync sales to invoices', 'Tax calculations', 'Enterprise-ready'],
    regions: ['🇬🇧 UK', '🇪🇺 Europe'],
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { currency, setCurrency, formatPrice } = useCurrency();
  const { connection, setConnection, isDefault, testConnection } = useServerConnection();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SettingsTab>('currency');
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    xero: { connected: false },
    quickbooks: { connected: false },
    sage: { connected: false },
  });
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Server connection state
  const [serverUrl, setServerUrl] = useState('');
  const [serverLabel, setServerLabel] = useState('');
  const [serverType, setServerType] = useState<ServerType>('saas');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; version?: string; serverName?: string; responseTime?: number; error?: string } | null>(null);
  const [isSavingServer, setIsSavingServer] = useState(false);

  // Sync server form with current connection
  useEffect(() => {
    setServerUrl(connection.url);
    setServerLabel(connection.label);
    setServerType(connection.type);
  }, [connection]);

  const handleTestConnection = async () => {
    if (!serverUrl.trim()) {
      toast.error('Please enter a server URL');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const result = await testConnection(serverUrl.trim());
    setTestResult(result);
    setIsTesting(false);
    if (result.success) {
      toast.success(`Connection successful${result.responseTime ? ` (${result.responseTime}ms)` : ''}`);
    } else {
      toast.error(result.error || 'Connection failed');
    }
  };

  const handleSaveServer = () => {
    if (!serverUrl.trim()) {
      toast.error('Please enter a server URL');
      return;
    }
    setIsSavingServer(true);
    const normalizedUrl = serverUrl.trim().replace(/\/+$/, '');
    const label = serverLabel.trim() || (serverType === 'enterprise' ? 'Enterprise Server' : 'StockScan Cloud');
    setConnection({ url: normalizedUrl, label, type: serverType });
    
    // Clear auth when switching servers - user needs to re-login
    if (normalizedUrl !== connection.url) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      toast.success('Server updated. You will be redirected to login.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } else {
      toast.success('Server connection saved');
    }
    setIsSavingServer(false);
  };

  const handleResetToSaaS = () => {
    setServerUrl(DEFAULT_SAAS_URL);
    setServerLabel('StockScan Cloud');
    setServerType('saas');
    setTestResult(null);
  };

  const filteredCurrencies = CURRENCIES.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    setCurrency(selectedCurrency);
    toast.success(`Currency updated to ${selectedCurrency.name} (${selectedCurrency.symbol})`);
  };

  // Fetch integration statuses
  useEffect(() => {
    if (activeTab === 'integrations') {
      const fetchStatuses = async () => {
        setLoadingIntegrations(true);
        try {
          // Try fetching from backend - gracefully handle if endpoints don't exist yet
          const results: IntegrationStatus = {
            xero: { connected: false },
            quickbooks: { connected: false },
            sage: { connected: false },
          };
          for (const platform of ['xero', 'quickbooks', 'sage'] as const) {
            try {
              const token = typeof window !== 'undefined' ? (document.cookie.match(/token=([^;]+)/)?.[1] || localStorage.getItem('token') || '') : '';
              const resp = await fetch(`/api/proxy/accounting/${platform}/status`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (resp.ok) {
                const res = await resp.json();
                if (res?.connected) {
                  results[platform] = {
                    connected: true,
                    ...(res.tenantName && { tenantName: res.tenantName }),
                    ...(res.companyName && { companyName: res.companyName }),
                    ...(res.connectedAt && { connectedAt: res.connectedAt }),
                  };
                }
              }
            } catch {
              // Endpoint not available yet - keep as disconnected
            }
          }
          setIntegrationStatus(results);
        } catch {
          // Silently fail
        } finally {
          setLoadingIntegrations(false);
        }
      };
      fetchStatuses();
    }
  }, [activeTab]);

  const handleConnect = async (platform: string) => {
    setConnectingId(platform);
    try {
      const token = typeof window !== 'undefined' ? (document.cookie.match(/token=([^;]+)/)?.[1] || localStorage.getItem('token') || '') : '';
      const resp = await fetch(`/api/proxy/accounting/${platform}/connect`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const res = await resp.json();
        if (res?.authUrl || res?.url) {
          window.open(res.authUrl || res.url, '_blank', 'width=600,height=700');
          toast.success(`Redirecting to ${platform} for authorization...`);
        } else {
          toast('This integration is configured in the StockScan mobile app. Go to Settings → Integrations.', { icon: 'ℹ️', duration: 5000 });
        }
      } else {
        toast('This integration is available via the StockScan mobile app. Go to Settings → Integrations.', { icon: 'ℹ️', duration: 5000 });
      }
    } catch {
      toast('This integration is available via the StockScan mobile app. Go to Settings → Integrations.', { icon: 'ℹ️', duration: 5000 });
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      const token = typeof window !== 'undefined' ? (document.cookie.match(/token=([^;]+)/)?.[1] || localStorage.getItem('token') || '') : '';
      await fetch(`/api/proxy/accounting/${platform}/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setIntegrationStatus(prev => ({ ...prev, [platform]: { connected: false } }));
      toast.success(`${platform} disconnected successfully`);
    } catch {
      toast.error('Failed to disconnect. Please try again.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim() || !newPassword.trim()) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }
    setChangingPassword(true);
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      const message = err?.message || 'Failed to change password';
      if (message.toLowerCase().includes('current password') || message.toLowerCase().includes('incorrect')) {
        toast.error('Current password is incorrect');
      } else if (message.toLowerCase().includes('forbidden') || message.toLowerCase().includes('disabled')) {
        toast.error('Password changes are disabled for this account');
      } else {
        toast.error(message);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'currency', label: 'Currency', icon: <Globe className="h-4 w-4" /> },
    { id: 'password', label: 'Password', icon: <Lock className="h-4 w-4" /> },
    { id: 'server', label: 'Server', icon: <Server className="h-4 w-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Link2 className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">Manage your application preferences and integrations</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Currency Tab */}
        {activeTab === 'currency' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Currency Settings
              </CardTitle>
              <CardDescription>
                Select your preferred currency for displaying prices and values throughout the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Current Currency</Label>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">{currency.name}</p>
                      <p className="text-sm text-blue-700">{currency.country}</p>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{currency.symbol}</div>
                  </div>
                  <p className="text-sm text-blue-600 mt-2">Example: {formatPrice(1234.56)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Search Currency</Label>
                <input
                  id="search"
                  type="text"
                  placeholder="Search by country, currency name, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label>Select Currency</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                  {filteredCurrencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setSelectedCurrency(c)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selectedCurrency.code === c.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{c.symbol} {c.code}</p>
                          <p className="text-sm text-gray-500">{c.country}</p>
                        </div>
                        {selectedCurrency.code === c.code && (
                          <Check className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedCurrency.code !== currency.code && (
                <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div>
                    <p className="font-medium text-amber-900">Pending Change</p>
                    <p className="text-sm text-amber-700">
                      {currency.symbol} {currency.code} → {selectedCurrency.symbol} {selectedCurrency.code}
                    </p>
                  </div>
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="max-w-lg">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password. You&apos;ll need your current password to make changes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-5">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        required
                        disabled={changingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 6 characters)"
                        required
                        disabled={changingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {newPassword && newPassword.length < 6 && (
                      <p className="text-xs text-red-500">Password must be at least 6 characters</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        required
                        disabled={changingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500">Passwords do not match</p>
                    )}
                    {confirmPassword && newPassword === confirmPassword && confirmPassword.length >= 6 && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Passwords match
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
                    className="w-full"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Password Tips
                  </h4>
                  <ul className="text-xs text-gray-500 space-y-1.5">
                    <li>• Use at least 6 characters</li>
                    <li>• Mix uppercase and lowercase letters</li>
                    <li>• Include numbers and special characters</li>
                    <li>• Don&apos;t reuse passwords from other accounts</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Server Connection Tab */}
        {activeTab === 'server' && (
          <div className="space-y-6">
            {/* Current Connection Status */}
            <Card className={`overflow-hidden ${connection.type === 'enterprise' ? 'ring-2 ring-purple-200' : 'ring-2 ring-blue-200'}`}>
              <div className={`px-6 py-4 ${connection.type === 'enterprise' ? 'bg-gradient-to-r from-purple-600 to-purple-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {connection.type === 'enterprise' ? (
                      <Building className="h-6 w-6" />
                    ) : (
                      <Cloud className="h-6 w-6" />
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{connection.label}</h3>
                      <p className="text-sm opacity-90">{connection.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20">
                      <Wifi className="h-3 w-3" />
                      {connection.type === 'enterprise' ? 'Enterprise' : 'SaaS Cloud'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Server Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Server Configuration
                </CardTitle>
                <CardDescription>
                  Connect to StockScan Cloud (SaaS) or your own Enterprise server. Switching servers will require you to log in again.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Server Type Selector */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">Server Type</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setServerType('saas');
                        setServerUrl(DEFAULT_SAAS_URL);
                        setServerLabel('StockScan Cloud');
                        setTestResult(null);
                      }}
                      className={`relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        serverType === 'saas'
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Cloud className={`h-6 w-6 mt-0.5 flex-shrink-0 ${serverType === 'saas' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <p className={`font-semibold ${serverType === 'saas' ? 'text-blue-900' : 'text-gray-700'}`}>StockScan Cloud</p>
                        <p className="text-xs text-gray-500 mt-0.5">Managed SaaS — no setup required</p>
                      </div>
                      {serverType === 'saas' && (
                        <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-blue-500" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setServerType('enterprise');
                        if (serverUrl === DEFAULT_SAAS_URL) {
                          setServerUrl('');
                          setServerLabel('');
                        }
                        setTestResult(null);
                      }}
                      className={`relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        serverType === 'enterprise'
                          ? 'border-purple-500 bg-purple-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Building className={`h-6 w-6 mt-0.5 flex-shrink-0 ${serverType === 'enterprise' ? 'text-purple-600' : 'text-gray-400'}`} />
                      <div>
                        <p className={`font-semibold ${serverType === 'enterprise' ? 'text-purple-900' : 'text-gray-700'}`}>Enterprise Server</p>
                        <p className="text-xs text-gray-500 mt-0.5">Self-hosted — connect to your own instance</p>
                      </div>
                      {serverType === 'enterprise' && (
                        <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-purple-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Server URL */}
                <div className="space-y-2">
                  <Label htmlFor="server-url" className="text-sm font-medium text-gray-700">
                    API Server URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="server-url"
                      type="url"
                      value={serverUrl}
                      onChange={(e) => { setServerUrl(e.target.value); setTestResult(null); }}
                      placeholder={serverType === 'enterprise' ? 'https://stockscan.yourcompany.com' : DEFAULT_SAAS_URL}
                      disabled={serverType === 'saas'}
                      className={`flex-1 ${serverType === 'saas' ? 'bg-gray-50' : ''}`}
                    />
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTesting || !serverUrl.trim()}
                      className="min-w-[120px]"
                    >
                      {isTesting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing...</>
                      ) : (
                        <><Activity className="h-4 w-4 mr-2" /> Test</>
                      )}
                    </Button>
                  </div>
                  {serverType === 'saas' && (
                    <p className="text-xs text-gray-500">The SaaS server URL is fixed and cannot be changed.</p>
                  )}
                </div>

                {/* Test Result */}
                {testResult && (
                  <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                    testResult.success
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">
                        {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                      </p>
                      {testResult.success && (
                        <div className="text-xs mt-1 space-y-0.5">
                          {testResult.responseTime && <p>Response time: {testResult.responseTime}ms</p>}
                          {testResult.version && <p>API Version: {testResult.version}</p>}
                          {testResult.serverName && <p>Server: {testResult.serverName}</p>}
                        </div>
                      )}
                      {testResult.error && (
                        <p className="text-xs mt-1">{testResult.error}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Server Label (Enterprise only) */}
                {serverType === 'enterprise' && (
                  <div className="space-y-2">
                    <Label htmlFor="server-label" className="text-sm font-medium text-gray-700">
                      Display Name <span className="text-gray-400 font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="server-label"
                      value={serverLabel}
                      onChange={(e) => setServerLabel(e.target.value)}
                      placeholder="e.g. Ridgeway Plant Services"
                    />
                    <p className="text-xs text-gray-500">A friendly name shown in the sidebar and login screen.</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleSaveServer}
                    disabled={isSavingServer || !serverUrl.trim()}
                    className={serverType === 'enterprise' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                  >
                    {isSavingServer ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><Check className="h-4 w-4 mr-2" /> Save Connection</>
                    )}
                  </Button>
                  {!isDefault && serverType !== 'saas' && (
                    <Button variant="outline" onClick={handleResetToSaaS}>
                      <RotateCcw className="h-4 w-4 mr-2" /> Reset to Cloud
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-50 h-fit">
                      <Cloud className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">StockScan Cloud (SaaS)</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Fully managed service hosted by StockScan. Automatic updates, backups, and scaling. 
                        Perfect for most businesses.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="p-2.5 rounded-lg bg-purple-50 h-fit">
                      <Building className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Enterprise Server</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Self-hosted on your own infrastructure. Full data sovereignty, custom integrations, 
                        and on-premise deployment. Requires your enterprise API URL.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1e3a5f] via-[#2a4a6f] to-[#1a2d47] p-8 text-white">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-5 w-5 text-blue-300" />
                  <span className="text-sm font-medium text-blue-300 uppercase tracking-wider">Accounting Integrations</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">Connect Your Accounting Software</h2>
                <p className="text-blue-100 max-w-2xl">
                  Automatically sync sales, invoices, customers, and payments with the world&apos;s leading accounting platforms. 
                  Say goodbye to manual data entry.
                </p>
                <div className="flex flex-wrap gap-4 mt-5">
                  <div className="flex items-center gap-2 text-sm text-blue-200">
                    <Zap className="h-4 w-4" /> Save hours weekly
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-200">
                    <Shield className="h-4 w-4" /> Bank-level security
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-200">
                    <Clock className="h-4 w-4" /> Real-time sync
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-200">
                    <CheckCircle2 className="h-4 w-4" /> Error-free
                  </div>
                </div>
              </div>
            </div>

            {loadingIntegrations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-500">Checking integration status...</span>
              </div>
            ) : (
              <div className="grid gap-6">
                {INTEGRATIONS.map(integration => {
                  const status = integrationStatus[integration.id];
                  return (
                    <Card key={integration.id} className={`overflow-hidden transition-all hover:shadow-md ${status.connected ? 'ring-2 ring-green-200' : ''}`}>
                      <div className="flex flex-col lg:flex-row">
                        {/* Logo & Status */}
                        <div className={`${integration.lightBg} p-6 lg:p-8 flex flex-col items-center justify-center lg:w-56 border-b lg:border-b-0 lg:border-r ${integration.borderColor}`}>
                          <div className="relative w-36 h-16 mb-3">
                            <Image
                              src={integration.logo}
                              alt={`${integration.name} logo`}
                              fill
                              className="object-contain"
                            />
                          </div>
                          {status.connected ? (
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Not Connected
                            </Badge>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 p-6">
                          <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">{integration.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
                              
                              {/* Regions */}
                              <div className="flex flex-wrap gap-2 mt-3">
                                {integration.regions.map(r => (
                                  <span key={r} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{r}</span>
                                ))}
                              </div>

                              {/* Features */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-4">
                                {integration.features.map(f => (
                                  <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                    {f}
                                  </div>
                                ))}
                              </div>

                              {/* Connected info */}
                              {status.connected && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <p className="text-sm font-medium text-green-800">
                                    Connected to: {(status as any).tenantName || (status as any).companyName || integration.name}
                                  </p>
                                  {(status as any).connectedAt && (
                                    <p className="text-xs text-green-600 mt-1">
                                      Since {new Date((status as any).connectedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Action Button */}
                            <div className="flex flex-col gap-2 sm:items-end justify-start">
                              {status.connected ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDisconnect(integration.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Unlink className="h-4 w-4 mr-1" /> Disconnect
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleConnect(integration.id)}
                                  disabled={connectingId === integration.id}
                                  className={`${integration.color} text-white hover:opacity-90`}
                                >
                                  {connectingId === integration.id ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <Link2 className="h-4 w-4 mr-1" />
                                  )}
                                  Connect {integration.name}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* What gets synced */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-amber-500" />
                  What Gets Synced Automatically
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { title: 'Sales → Invoices', desc: 'POS sales and job card invoices sync automatically to your accounting software' },
                    { title: 'Customer Info', desc: 'Customer details are auto-created in your accounting platform if they don\'t exist' },
                    { title: 'Line Items', desc: 'Product names, quantities, and prices are included on every synced invoice' },
                    { title: 'Tax (VAT)', desc: 'VAT and sales tax calculations are synced with your registered tax rates' },
                    { title: 'Payments', desc: 'Payment method and status are tracked against each synced invoice' },
                    { title: 'Multi-Currency', desc: 'Supports multiple currencies for international transactions' },
                  ].map(item => (
                    <div key={item.title} className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
