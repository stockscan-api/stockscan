'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, KeyRound, Building2, User, Mail, ArrowRight, ArrowLeft, CheckCircle2, Shield, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';

type Step = 'code' | 'details' | 'complete';

export default function RegisterPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>('code');

  // Product code step
  const [productCode, setProductCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [codeValidated, setCodeValidated] = useState(false);
  const [codeTier, setCodeTier] = useState('');

  // Details step
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format product code as user types (STOCK-XXXX-XXXX-XXXX)
  const handleCodeChange = (value: string) => {
    // Remove anything that's not alphanumeric or dash
    const clean = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setProductCode(clean);
    // Reset validation if code changes after validation
    if (codeValidated) {
      setCodeValidated(false);
      setCodeTier('');
    }
  };

  const handleValidateCode = async () => {
    if (!productCode.trim()) {
      toast.error('Please enter your product code');
      return;
    }
    setIsValidating(true);
    try {
      const result = await apiClient.validateActivationCode(productCode.trim());
      if (result.valid) {
        setCodeValidated(true);
        setCodeTier(result.tier || '');
        toast.success(`Valid ${result.tier || ''} product code!`);
        // Auto-advance after brief delay
        setTimeout(() => setStep('details'), 600);
      } else {
        toast.error(result.message || 'Invalid product code');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not validate product code. Please check and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!ownerName.trim()) {
      toast.error('Your name is required');
      return;
    }
    if (!ownerEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.registerCompany({
        companyName: companyName.trim(),
        companyEmail: companyEmail.trim() || undefined,
        companyPhone: companyPhone.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
        email: ownerEmail.trim(),
        password,
        name: ownerName.trim(),
        productCode: productCode.trim(),
      });
      toast.success('Account created successfully!');
      setStep('complete');
    } catch (err: any) {
      const msg = err?.message || 'Registration failed';
      if (msg.includes('409') || msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('conflict')) {
        toast.error('An account with this email already exists. Please sign in instead.');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const tierColors: Record<string, string> = {
    SOLO: 'bg-gray-100 text-gray-700 border-gray-300',
    BASIC: 'bg-blue-50 text-blue-700 border-blue-200',
    PROFESSIONAL: 'bg-purple-50 text-purple-700 border-purple-200',
    ENTERPRISE: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-xl overflow-hidden mb-4">
            <Image src="/logo.png" alt="StockScan" width={80} height={80} className="object-contain" />
          </div>
          <CardTitle className="text-2xl">
            {step === 'complete' ? 'Welcome to StockScan!' : 'Create Your Account'}
          </CardTitle>
          <CardDescription>
            {step === 'code' && 'Enter your product code to get started'}
            {step === 'details' && 'Set up your company and owner account'}
            {step === 'complete' && 'Your company is ready to go'}
          </CardDescription>

          {/* Step indicator */}
          {step !== 'complete' && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                step === 'code' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {step === 'code' ? (
                  <KeyRound className="h-3 w-3" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                Product Code
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                step === 'details' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
              }`}>
                <Building2 className="h-3 w-3" />
                Company Details
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* ==================== STEP 1: PRODUCT CODE ==================== */}
          {step === 'code' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="product-code" className="text-sm font-medium text-gray-700">
                  Product Code
                </label>
                <div className="relative">
                  <Input
                    id="product-code"
                    type="text"
                    placeholder="STOCK-XXXX-XXXX-XXXX"
                    value={productCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    disabled={isValidating}
                    className="font-mono text-center text-lg tracking-wider pr-10"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleValidateCode(); }}
                    autoFocus
                  />
                  {codeValidated && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Enter the product code you received when you purchased StockScan
                </p>
              </div>

              {codeValidated && codeTier && (
                <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border ${tierColors[codeTier] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">{codeTier} Plan</span>
                </div>
              )}

              <Button
                onClick={handleValidateCode}
                className="w-full"
                disabled={isValidating || !productCode.trim()}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Validating...
                  </>
                ) : codeValidated ? (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Continue
                  </>
                ) : (
                  'Validate Code'
                )}
              </Button>

              <div className="pt-3 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* ==================== STEP 2: COMPANY & USER DETAILS ==================== */}
          {step === 'details' && (
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Tier badge */}
              {codeTier && (
                <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${tierColors[codeTier] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                  <Shield className="h-3 w-3" />
                  {codeTier} Plan — {productCode}
                </div>
              )}

              {/* Company section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  Company Information
                </h3>
                <div className="space-y-2">
                  <label htmlFor="company-name" className="text-sm font-medium text-gray-700">Company Name *</label>
                  <Input
                    id="company-name"
                    placeholder="ABC Warehouse Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="company-email" className="text-sm font-medium text-gray-700">Company Email</label>
                    <Input
                      id="company-email"
                      type="email"
                      placeholder="info@company.com"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="company-phone" className="text-sm font-medium text-gray-700">Phone</label>
                    <Input
                      id="company-phone"
                      type="tel"
                      placeholder="+44 20 1234 5678"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="company-address" className="text-sm font-medium text-gray-700">Address</label>
                  <Input
                    id="company-address"
                    placeholder="123 Business Park, London"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Owner account section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  Owner Account
                </h3>
                <div className="space-y-2">
                  <label htmlFor="owner-name" className="text-sm font-medium text-gray-700">Your Name *</label>
                  <Input
                    id="owner-name"
                    placeholder="John Smith"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="owner-email" className="text-sm font-medium text-gray-700">Email *</label>
                  <Input
                    id="owner-email"
                    type="email"
                    placeholder="you@example.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="reg-password" className="text-sm font-medium text-gray-700">Password *</label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="reg-confirm" className="text-sm font-medium text-gray-700">Confirm *</label>
                    <Input
                      id="reg-confirm"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('code')}
                  disabled={isSubmitting}
                  className="flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="text-blue-600 hover:text-blue-800">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* ==================== STEP 3: SUCCESS ==================== */}
          {step === 'complete' && (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{companyName}</h3>
                <p className="text-sm text-gray-500 mt-1">Your company has been created and you&apos;re logged in.</p>
                {codeTier && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mt-3 ${tierColors[codeTier] || 'bg-gray-100 text-gray-700'}`}>
                    <Shield className="h-3 w-3" />
                    {codeTier} Plan Active
                  </div>
                )}
              </div>
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
