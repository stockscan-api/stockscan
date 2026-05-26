'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Loader2, KeyRound, Building2, UserPlus, CheckCircle2, AlertCircle,
  ArrowRight, ArrowLeft, Eye, EyeOff, Shield, Server, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';

type SetupStep = 'checking' | 'license' | 'company' | 'admin' | 'completing' | 'done';

interface LicenseInfo {
  valid: boolean;
  tier?: string;
  duration?: string;
}

export default function SetupPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<SetupStep>('checking');
  const [checkError, setCheckError] = useState<string | null>(null);

  // License step
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [licenseError, setLicenseError] = useState('');
  const [isValidatingLicense, setIsValidatingLicense] = useState(false);

  // Company step
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  // Admin step
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Completion
  const [completionError, setCompletionError] = useState('');

  // Check if setup is needed on mount
  useEffect(() => {
    let cancelled = false;
    const checkSetup = async () => {
      try {
        const status = await apiClient.getSetupStatus();
        if (cancelled) return;
        if (!status.setupRequired) {
          // Setup already done, go to login
          router.replace('/login');
        } else {
          setStep('license');
        }
      } catch (err: any) {
        if (cancelled) return;
        // If backend is unreachable or setup endpoint doesn't exist, show error
        setCheckError(
          err?.message || 'Unable to connect to the server. Please check your backend is running.'
        );
        setStep('license'); // Still show wizard, they can try
      }
    };
    checkSetup();
    return () => { cancelled = true; };
  }, [router]);

  // Validate license key
  const handleValidateLicense = useCallback(async () => {
    const trimmed = licenseKey.trim();
    if (!trimmed) {
      setLicenseError('Please enter a license key');
      return;
    }
    setIsValidatingLicense(true);
    setLicenseError('');
    setLicenseInfo(null);
    try {
      const result = await apiClient.validateLicense(trimmed);
      if (result.valid) {
        setLicenseInfo(result);
        toast.success('License key validated successfully');
      } else {
        setLicenseError(result.reason || 'Invalid license key');
      }
    } catch (err: any) {
      setLicenseError(err?.message || 'Failed to validate license key');
    } finally {
      setIsValidatingLicense(false);
    }
  }, [licenseKey]);

  // Complete setup
  const handleCompleteSetup = useCallback(async () => {
    // Validate admin fields
    if (!ownerName.trim()) { toast.error('Please enter the admin name'); return; }
    if (!ownerEmail.trim()) { toast.error('Please enter the admin email'); return; }
    if (!ownerPassword) { toast.error('Please enter a password'); return; }
    if (ownerPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (ownerPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setStep('completing');
    setCompletionError('');
    try {
      const result = await apiClient.completeSetup({
        companyName: companyName.trim(),
        companyEmail: companyEmail.trim() || undefined,
        companyPhone: companyPhone.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
        ownerEmail: ownerEmail.trim(),
        ownerName: ownerName.trim(),
        ownerPassword,
        licenseKey: licenseKey.trim(),
      });

      if (result.success && result.token) {
        // Store token and user - same pattern as login
        localStorage.setItem('auth_token', result.token);
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        setStep('done');
        toast.success('Setup complete! Redirecting to dashboard...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        throw new Error('Setup did not return expected response');
      }
    } catch (err: any) {
      setCompletionError(err?.message || 'Setup failed. Please try again.');
      setStep('admin'); // Go back to admin step to retry
      toast.error(err?.message || 'Setup failed');
    }
  }, [ownerName, ownerEmail, ownerPassword, confirmPassword, companyName, companyEmail, companyPhone, companyAddress, licenseKey]);

  // Step indicators
  const steps = [
    { key: 'license', label: 'License', icon: KeyRound },
    { key: 'company', label: 'Company', icon: Building2 },
    { key: 'admin', label: 'Admin Account', icon: UserPlus },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  // Loading / checking state
  if (step === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-slate-300 text-sm">Checking setup status...</p>
        </div>
      </div>
    );
  }

  // Completion / redirect state
  if (step === 'completing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-1">Setting up your instance...</p>
          <p className="text-slate-400 text-sm">Creating company and admin account</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <CheckCircle2 className="h-14 w-14 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Setup Complete!</h2>
          <p className="text-slate-300 text-sm">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="w-full max-w-lg">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-xl overflow-hidden mb-4 bg-white/10 backdrop-blur">
            <Image src="/logo.png" alt="StockScan" width={64} height={64} className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">StockScan Enterprise Setup</h1>
          <p className="text-slate-400 text-sm mt-1">Configure your self-hosted instance</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = s.key === step;
            const isCompleted = currentStepIndex > i;
            return (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40'
                    : isCompleted
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-slate-800/50 text-slate-500'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-6 h-px mx-1 ${
                    isCompleted ? 'bg-green-500/40' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {checkError && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{checkError}</span>
          </div>
        )}

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur shadow-2xl">
          {/* ===== STEP 1: LICENSE ===== */}
          {step === 'license' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                  <KeyRound className="h-6 w-6 text-blue-400" />
                </div>
                <CardTitle className="text-white text-lg">Enter License Key</CardTitle>
                <CardDescription className="text-slate-400">
                  Enter your enterprise license key to activate StockScan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="license" className="text-slate-300 text-sm">License Key</Label>
                  <div className="relative">
                    <Input
                      id="license"
                      value={licenseKey}
                      onChange={(e) => {
                        setLicenseKey(e.target.value.toUpperCase());
                        setLicenseError('');
                        setLicenseInfo(null);
                      }}
                      placeholder="STOCK-XXXX-XXXX-XXXX-XXXX"
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 font-mono tracking-wider pr-10"
                      onKeyDown={(e) => e.key === 'Enter' && handleValidateLicense()}
                    />
                    {licenseInfo?.valid && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-400" />
                    )}
                  </div>
                  {licenseError && (
                    <p className="text-red-400 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {licenseError}
                    </p>
                  )}
                </div>

                {!licenseInfo?.valid && (
                  <Button
                    onClick={handleValidateLicense}
                    disabled={isValidatingLicense || !licenseKey.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isValidatingLicense ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Validating...</>
                    ) : (
                      <><Shield className="h-4 w-4 mr-2" /> Validate License</>
                    )}
                  </Button>
                )}

                {licenseInfo?.valid && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-green-400" />
                        <span className="text-green-300 font-medium text-sm">License Valid</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400">Tier:</span>
                          <span className="text-white ml-1 capitalize">{licenseInfo.tier || 'Enterprise'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Duration:</span>
                          <span className="text-white ml-1">{licenseInfo.duration || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => setStep('company')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Continue <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {/* ===== STEP 2: COMPANY ===== */}
          {step === 'company' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                  <Building2 className="h-6 w-6 text-blue-400" />
                </div>
                <CardTitle className="text-white text-lg">Company Details</CardTitle>
                <CardDescription className="text-slate-400">
                  Tell us about your company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-slate-300 text-sm">
                    Company Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corporation"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail" className="text-slate-300 text-sm">Company Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="info@acme.com"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone" className="text-slate-300 text-sm">Company Phone</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+44 1234 567890"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddress" className="text-slate-300 text-sm">Company Address</Label>
                  <Input
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="123 Business St, London"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep('license')}
                    className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button
                    onClick={() => {
                      if (!companyName.trim()) {
                        toast.error('Company name is required');
                        return;
                      }
                      setStep('admin');
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* ===== STEP 3: ADMIN ACCOUNT ===== */}
          {step === 'admin' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                  <UserPlus className="h-6 w-6 text-blue-400" />
                </div>
                <CardTitle className="text-white text-lg">Create Admin Account</CardTitle>
                <CardDescription className="text-slate-400">
                  This will be the owner account for your StockScan instance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {completionError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{completionError}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="ownerName" className="text-slate-300 text-sm">
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="ownerName"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="John Smith"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerEmail" className="text-slate-300 text-sm">
                    Email Address <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="admin@acme.com"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerPassword" className="text-slate-300 text-sm">
                    Password <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="ownerPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300 text-sm">
                    Confirm Password <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                  {confirmPassword && ownerPassword !== confirmPassword && (
                    <p className="text-red-400 text-xs">Passwords do not match</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep('company')}
                    className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button
                    onClick={handleCompleteSetup}
                    disabled={!ownerName.trim() || !ownerEmail.trim() || !ownerPassword || ownerPassword !== confirmPassword}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Setup
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-slate-500 text-xs mt-6">
          <Server className="h-3 w-3 inline mr-1" />
          StockScan Enterprise · Self-Hosted
        </p>
      </div>
    </div>
  );
}
