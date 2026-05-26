'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, Mail, KeyRound, ShieldCheck, ArrowLeft, X, Cloud, Building, Server } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { useServerConnection } from '@/contexts/server-connection-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading, isSuperAdmin } = useAuth();
  const { connection } = useServerConnection();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Password reset flow states
  const [resetStep, setResetStep] = useState<'idle' | 'email' | 'code' | 'success'>('idle');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Redirect super admins to admin dashboard, others to regular dashboard
      const redirectPath = isSuperAdmin ? '/admin/dashboard' : '/dashboard';
      router.replace(redirectPath);
      // Fallback: force navigation if router.replace doesn't trigger
      const fallbackTimer = setTimeout(() => {
        if (window.location.pathname === '/login') {
          window.location.href = redirectPath;
        }
      }, 1500);
      return () => clearTimeout(fallbackTimer);
    }
  }, [isAuthenticated, authLoading, isSuperAdmin, router]);

  // Check if enterprise setup is needed
  useEffect(() => {
    if (authLoading || isAuthenticated) return;
    let cancelled = false;
    const checkSetup = async () => {
      try {
        const status = await apiClient.getSetupStatus();
        if (!cancelled && status.setupRequired) {
          router.replace('/setup');
        }
      } catch {
        // If setup status check fails (e.g. SaaS mode, no setup endpoint), stay on login
      }
    };
    checkSetup();
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, router]);

  const handleRequestResetCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    setIsResetting(true);
    try {
      await apiClient.forgotPassword(resetEmail.trim());
      toast.success('Reset code sent to your email');
      setResetStep('code');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      toast.error('Please enter the reset code');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsResetting(true);
    try {
      await apiClient.resetPassword(resetCode.trim(), newPassword);
      toast.success('Password reset successfully!');
      setResetStep('success');
    } catch (err: any) {
      toast.error(err?.message || 'Invalid or expired reset code. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const closeResetModal = () => {
    setResetStep('idle');
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowNewPassword(false);
    setIsResetting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      // Check if user is super admin from the login response
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const redirectPath = user?.role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/dashboard';
      router.replace(redirectPath);
      // Fallback: force navigation if router.replace doesn't trigger
      setTimeout(() => {
        if (window.location.pathname === '/login') {
          window.location.href = redirectPath;
        }
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
      toast.error(err?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-xl overflow-hidden mb-4">
            <Image src="/logo.png" alt="StockScan" width={80} height={80} className="object-contain" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your StockScan account</CardDescription>
          {/* Server Connection Badge */}
          <div className="mt-3 flex justify-center">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              connection.type === 'enterprise'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {connection.type === 'enterprise' ? (
                <Building className="h-3 w-3" />
              ) : (
                <Cloud className="h-3 w-3" />
              )}
              {connection.label}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
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
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setResetStep('email')}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center gap-4 text-xs text-gray-400">
            <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</a>
          </div>

          {/* Password Reset Modal */}
          {resetStep !== 'idle' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
                <button
                  onClick={closeResetModal}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Step 1: Enter email */}
                {resetStep === 'email' && (
                  <form onSubmit={handleRequestResetCode}>
                    <div className="text-center mb-5">
                      <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                        <Mail className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Reset Your Password</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Enter your email and we&apos;ll send you a reset code
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="reset-email" className="text-sm font-medium text-gray-700">
                          Email Address
                        </label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="you@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                          disabled={isResetting}
                          autoFocus
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isResetting}>
                        {isResetting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Sending code...
                          </>
                        ) : (
                          'Send Reset Code'
                        )}
                      </Button>
                      <button
                        type="button"
                        onClick={closeResetModal}
                        className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to login
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 2: Enter code + new password */}
                {resetStep === 'code' && (
                  <form onSubmit={handleResetPassword}>
                    <div className="text-center mb-5">
                      <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                        <KeyRound className="h-6 w-6 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Enter Reset Code</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Check your email for a 6-digit code sent to <span className="font-medium text-gray-700">{resetEmail}</span>
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="reset-code" className="text-sm font-medium text-gray-700">
                          Reset Code
                        </label>
                        <Input
                          id="reset-code"
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          required
                          disabled={isResetting}
                          autoFocus
                          maxLength={10}
                          className="text-center text-lg tracking-widest font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                          New Password
                        </label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Min. 6 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={isResetting}
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="confirm-new-password" className="text-sm font-medium text-gray-700">
                          Confirm New Password
                        </label>
                        <Input
                          id="confirm-new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Re-enter new password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          required
                          disabled={isResetting}
                          minLength={6}
                        />
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-blue-800 text-xs">
                          💡 Reset codes expire after 30 minutes. If you didn&apos;t receive the email, check your spam folder.
                        </p>
                      </div>
                      <Button type="submit" className="w-full" disabled={isResetting}>
                        {isResetting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Resetting password...
                          </>
                        ) : (
                          'Reset Password'
                        )}
                      </Button>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setResetStep('email')}
                          className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          Change email
                        </button>
                        <button
                          type="button"
                          onClick={handleRequestResetCode}
                          disabled={isResetting}
                          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Resend code
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Step 3: Success */}
                {resetStep === 'success' && (
                  <div>
                    <div className="text-center mb-5">
                      <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                        <ShieldCheck className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Password Reset</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Your password has been successfully reset. You can now sign in with your new password.
                      </p>
                    </div>
                    <Button onClick={closeResetModal} className="w-full">
                      Back to Login
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
