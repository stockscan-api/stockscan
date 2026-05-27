'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { Key, CheckCircle, Package, Users, MapPin, Loader2, Crown, AlertTriangle, Zap, RefreshCw, Globe, WifiOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/auth-context';

interface TierLimits {
  tier: string;
  limits: {
    products: number;
    users: number;
    locations: number;
  };
  usage: {
    products: number;
    users: number;
    locations: number;
  };
  expiresAt?: string;
}

const tierInfo: Record<string, { name: string; color: string; icon: React.ReactNode; features: string[] }> = {
  FREE: {
    name: 'Free Trial',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: <Package className="h-6 w-6" />,
    features: ['Limited products', 'Basic features', '14-day trial'],
  },
  TRIAL: {
    name: 'Free Trial',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: <Package className="h-6 w-6" />,
    features: ['Limited products', 'Basic features', '14-day trial'],
  },
  BASIC: {
    name: 'Basic',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <Zap className="h-6 w-6" />,
    features: ['100 products', '3 users', '1 location', 'CSV export'],
  },
  PROFESSIONAL: {
    name: 'Professional',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: <Crown className="h-6 w-6" />,
    features: ['Unlimited products', '10 users', '10 locations', 'Sage integration', 'Advanced reports'],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: <Crown className="h-6 w-6" />,
    features: ['Unlimited everything', 'Unlimited users', 'Unlimited locations', 'API access', 'Priority support'],
  },
};

export default function SubscriptionPage() {
  const { user, hasRole } = useAuth();
  const [tierLimits, setTierLimits] = useState<TierLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; status?: string; lastVerifiedAt?: string; message?: string } | null>(null);

  const isOwner = hasRole(['OWNER']);

  useEffect(() => {
    loadTierLimits();
  }, []);

  const loadTierLimits = async () => {
    try {
      const data = await apiClient.getTierLimits();
      setTierLimits(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load subscription info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      toast.error('Please enter a license key');
      return;
    }
    setIsActivating(true);
    try {
      await apiClient.activateLicense(licenseKey.trim());
      toast.success('License activated successfully!');
      setLicenseKey('');
      loadTierLimits();
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate license');
    } finally {
      setIsActivating(false);
    }
  };

  const handleVerifyLicense = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const result = await apiClient.verifyLicense();
      setVerifyResult(result);
      if (result.valid) {
        toast.success(result.message || 'License verified successfully');
        loadTierLimits(); // Refresh tier data
      } else {
        toast.error(result.message || 'License verification failed');
      }
    } catch (error: any) {
      const msg = error?.message || 'Unable to verify license';
      setVerifyResult({ valid: false, message: msg });
      toast.error(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const currentTier = tierLimits?.tier || 'FREE';
  const tierData = tierInfo[currentTier] || tierInfo.FREE;

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <DashboardLayout allowedRoles={['STAFF', 'MANAGER', 'OWNER']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-500">Manage your subscription and view usage limits</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Current Plan */}
            <Card className={`border-2 ${tierData.color}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tierData.color}`}>
                      {tierData.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{tierData.name} Plan</CardTitle>
                      <CardDescription>
                        {user?.company?.name || 'Your Company'}
                      </CardDescription>
                    </div>
                  </div>
                  {tierLimits?.expiresAt && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Expires</p>
                      <p className="font-medium">
                        {new Date(tierLimits.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  {tierData.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Usage Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Current Usage</CardTitle>
                <CardDescription>Your resource usage vs plan limits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Products */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Products</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {tierLimits?.usage?.products || 0} / {tierLimits?.limits?.products === -1 ? '∞' : tierLimits?.limits?.products || 0}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getUsageColor(getUsagePercentage(tierLimits?.usage?.products || 0, tierLimits?.limits?.products || 1))} transition-all`}
                        style={{ width: `${tierLimits?.limits?.products === -1 ? 10 : getUsagePercentage(tierLimits?.usage?.products || 0, tierLimits?.limits?.products || 1)}%` }}
                      />
                    </div>
                  </div>

                  {/* Users */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Users</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {tierLimits?.usage?.users || 0} / {tierLimits?.limits?.users === -1 ? '∞' : tierLimits?.limits?.users || 0}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getUsageColor(getUsagePercentage(tierLimits?.usage?.users || 0, tierLimits?.limits?.users || 1))} transition-all`}
                        style={{ width: `${tierLimits?.limits?.users === -1 ? 10 : getUsagePercentage(tierLimits?.usage?.users || 0, tierLimits?.limits?.users || 1)}%` }}
                      />
                    </div>
                  </div>

                  {/* Locations */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Locations</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {tierLimits?.usage?.locations || 0} / {tierLimits?.limits?.locations === -1 ? '∞' : tierLimits?.limits?.locations || 0}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getUsageColor(getUsagePercentage(tierLimits?.usage?.locations || 0, tierLimits?.limits?.locations || 1))} transition-all`}
                        style={{ width: `${tierLimits?.limits?.locations === -1 ? 10 : getUsagePercentage(tierLimits?.usage?.locations || 0, tierLimits?.limits?.locations || 1)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activate License (Owner only) */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-blue-600" />
                    Activate License Key
                  </CardTitle>
                  <CardDescription>
                    Enter a license key to upgrade your subscription
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleActivateLicense} className="flex gap-3">
                    <Input
                      placeholder="STOCK-XXXX-XXXX-XXXX-XXXX"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                      className="font-mono flex-1"
                    />
                    <Button type="submit" disabled={isActivating}>
                      {isActivating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Activate
                    </Button>
                  </form>
                  <p className="text-sm text-gray-500 mt-2">
                    License keys are provided by your administrator or can be purchased.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* License Verification (Owner only — Enterprise standalone) */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    License Verification
                  </CardTitle>
                  <CardDescription>
                    Verify your license with the StockScan license server
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleVerifyLicense}
                    disabled={isVerifying}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {isVerifying ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-2" /> Verify Now</>
                    )}
                  </Button>
                  {verifyResult && (
                    <div className={`rounded-lg p-3 text-sm flex items-start gap-2 ${
                      verifyResult.valid
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      {verifyResult.valid ? (
                        <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <WifiOff className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">
                          {verifyResult.valid ? 'License verified' : 'Verification failed'}
                        </p>
                        {verifyResult.message && (
                          <p className="text-xs mt-0.5 opacity-80">{verifyResult.message}</p>
                        )}
                        {verifyResult.lastVerifiedAt && (
                          <p className="text-xs mt-0.5 opacity-60">
                            Last verified: {new Date(verifyResult.lastVerifiedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    This checks your license status with the StockScan cloud server. If your server has no internet access, your license remains valid for up to 45 days.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Upgrade Notice for non-Enterprise */}
            {currentTier !== 'ENTERPRISE' && (
              <Card className="border-dashed border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-amber-500 mt-1" />
                    <div>
                      <h3 className="font-semibold">Need more capacity?</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        Upgrade to a higher tier to unlock more products, users, and locations.
                        Contact your administrator for a license key.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
