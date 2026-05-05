'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, HelpCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading, isSuperAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
                onClick={() => setShowForgotPassword(true)}
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

          {/* Forgot Password Modal */}
          {showForgotPassword && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="text-center mb-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                    <HelpCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Forgot Your Password?</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    To reset your password, please contact your account administrator or company owner. They can assist you with regaining access to your account.
                  </p>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-blue-800 font-medium text-xs">
                      💡 Once logged in, you can change your password anytime from <span className="font-semibold">Settings → Password</span>.
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    A self-service password reset feature is coming soon.
                  </p>
                </div>
                <Button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full mt-5"
                >
                  Got it
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
