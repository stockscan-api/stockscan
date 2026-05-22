'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download, Monitor, Globe, Chrome, CheckCircle2, ArrowRight,
  Smartphone, Apple, Wifi, WifiOff, Zap, Shield, HardDrive,
  ExternalLink, Copy, Check, Info, AlertTriangle, Layout
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useServerConnection } from '@/contexts/server-connection-context';

interface BrowserInfo {
  name: string;
  isChromium: boolean;
  isEdge: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isStandalone: boolean;
}

interface OSInfo {
  name: string;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

function detectBrowser(): BrowserInfo {
  if (typeof navigator === 'undefined') {
    return { name: 'Unknown', isChromium: false, isEdge: false, isChrome: false, isFirefox: false, isSafari: false, isStandalone: false };
  }
  const ua = navigator.userAgent;
  const isEdge = ua.includes('Edg/');
  const isChrome = ua.includes('Chrome/') && !isEdge;
  const isFirefox = ua.includes('Firefox/');
  const isSafari = ua.includes('Safari/') && !ua.includes('Chrome/');
  const isChromium = isChrome || isEdge || ua.includes('OPR/') || ua.includes('Brave');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;

  let name = 'Unknown Browser';
  if (isEdge) name = 'Microsoft Edge';
  else if (ua.includes('OPR/')) name = 'Opera';
  else if (ua.includes('Brave')) name = 'Brave';
  else if (isChrome) name = 'Google Chrome';
  else if (isFirefox) name = 'Mozilla Firefox';
  else if (isSafari) name = 'Safari';

  return { name, isChromium, isEdge, isChrome, isFirefox, isSafari, isStandalone };
}

function detectOS(): OSInfo {
  if (typeof navigator === 'undefined') {
    return { name: 'Unknown', isWindows: false, isMac: false, isLinux: false, isIOS: false, isAndroid: false };
  }
  const ua = navigator.userAgent;
  const isWindows = ua.includes('Windows');
  const isMac = ua.includes('Macintosh') || ua.includes('Mac OS');
  const isLinux = ua.includes('Linux') && !ua.includes('Android');
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = ua.includes('Android');

  let name = 'your device';
  if (isWindows) name = 'Windows';
  else if (isMac) name = 'macOS';
  else if (isLinux) name = 'Linux';
  else if (isIOS) name = 'iOS';
  else if (isAndroid) name = 'Android';

  return { name, isWindows, isMac, isLinux, isIOS, isAndroid };
}

export default function DownloadPage() {
  const { connection } = useServerConnection();
  const [browser, setBrowser] = useState<BrowserInfo | null>(null);
  const [os, setOS] = useState<OSInfo | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBrowser(detectBrowser());
    setOS(detectOS());

    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsInstalled(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      toast.success('StockScan installed successfully!');
    }
    setDeferredPrompt(null);
    setInstalling(false);
  };

  const handleCopyUrl = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const isDesktop = os && !os.isIOS && !os.isAndroid;
  const canInstallNatively = browser?.isChromium && deferredPrompt;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Download className="h-6 w-6" />
            Install StockScan
          </h1>
          <p className="text-gray-600 mt-1">
            Get StockScan as a desktop app for quick access, faster loading, and a native experience.
          </p>
        </div>

        {/* Already Installed Banner */}
        {isInstalled && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">StockScan is installed</p>
                  <p className="text-sm text-green-700">You&apos;re running StockScan as a desktop application. You&apos;re all set!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Detection Card */}
        {browser && os && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">OS:</span>
                  <Badge variant="outline">{os.name}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Browser:</span>
                  <Badge variant="outline">{browser.name}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {browser.isChromium ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Install Supported
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Switch Browser Required
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Install (if supported) */}
        {!isInstalled && canInstallNatively && (
          <Card className="ring-2 ring-blue-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Download className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Install Now</h3>
                  <p className="text-blue-100 text-sm">One click to install StockScan on {os?.name || 'your device'}</p>
                </div>
              </div>
            </div>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-500" /> Instant launch</span>
                    <span className="flex items-center gap-1"><Wifi className="h-3.5 w-3.5 text-green-500" /> Works offline</span>
                    <span className="flex items-center gap-1"><Layout className="h-3.5 w-3.5 text-blue-500" /> Own window</span>
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={handleInstallPWA}
                  disabled={installing}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[180px]"
                >
                  {installing ? (
                    <span className="flex items-center gap-2"><Download className="h-4 w-4 animate-bounce" /> Installing...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Install StockScan</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Installation Methods */}
        {!isInstalled && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Installation Options</h2>

            <div className="grid gap-4">
              {/* Windows Desktop App */}
              {isDesktop && os?.isWindows && (
                <Card className="ring-2 ring-slate-200 overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200">
                        <Monitor className="h-6 w-6 text-slate-700" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">Windows Desktop Application</h3>
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">v1.0.0</Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Standalone Windows installer with native integration — system tray, auto-updates, and enterprise server support.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {['System tray', 'Auto-updates', 'Enterprise mode', 'Setup wizard', 'Native window'].map(f => (
                            <span key={f} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{f}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                          <a href="https://github.com/ArtisanByteCrafter/StockScan/releases/latest/download/StockScan-Setup-1.0.0.exe" target="_blank" rel="noopener noreferrer">
                            <Button className="bg-slate-800 hover:bg-slate-900 text-white">
                              <Download className="h-4 w-4 mr-2" /> Download StockScan Setup
                            </Button>
                          </a>
                          <span className="text-xs text-gray-400">~80 MB · Windows 10/11</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Signed by StockScan Ltd · SHA-256 verified
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Desktop (non-Windows) */}
              {isDesktop && !os?.isWindows && (
                <Card className="relative overflow-hidden">
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">Windows Only</Badge>
                  </div>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-slate-100">
                        <Monitor className="h-6 w-6 text-slate-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Desktop Application</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          The native desktop app is currently available for Windows. Use the PWA install option above for {os?.name || 'your OS'} — it provides a very similar experience.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Chrome / Edge PWA Install */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-blue-50">
                      <Chrome className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">Install via Chrome or Edge</h3>
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Recommended</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Install StockScan as a Progressive Web App directly from your browser. Works on Windows, macOS, Linux, and ChromeOS.
                      </p>

                      {browser?.isChromium && !canInstallNatively && !isInstalled && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="text-sm text-blue-800 font-medium">Install from your address bar</p>
                          <p className="text-xs text-blue-600 mt-1">
                            Look for the install icon (⊕) in the right side of your address bar, or click the three-dot menu → "Install StockScan".
                          </p>
                        </div>
                      )}

                      {!browser?.isChromium && (
                        <div className="mt-3 space-y-3">
                          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                            <p className="text-sm text-amber-800 font-medium flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5" /> {browser?.name} doesn&apos;t support app installation
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              PWA installation requires a Chromium-based browser. Don&apos;t worry — you likely already have one:
                            </p>
                          </div>

                          {/* Edge Instructions */}
                          {os?.isWindows && (
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900 text-sm flex items-center gap-2">
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#0078D7"><path d="M21.86 17.86q.14 0 .25.12.1.13.1.25t-.11.33l-.32.46-.43.53-.44.5q-.21.25-.38.42l-.22.23q-.58.53-1.34 1.04-.76.51-1.6.91-.86.4-1.74.64t-1.67.24q-.9 0-1.69-.28-.8-.28-1.48-.78-.68-.5-1.22-1.17-.53-.66-.92-1.44-.38-.77-.6-1.6-.2-.83-.2-1.67 0-1.21.38-2.42.39-1.21 1.1-2.29.71-1.08 1.72-1.95 1-.86 2.22-1.38-.04.22-.04.45 0 1.15.38 2.25.39 1.1 1.08 2 .69.9 1.63 1.5.95.6 2.06.82Zm-8.18-7.21q-.27-.67-.27-1.3 0-.72.22-1.34.22-.63.63-1.12.4-.5.96-.8.56-.32 1.22-.32.7 0 1.24.3.53.3.87.74.34.45.5.97.16.52.16 1.02 0 .86-.32 1.75-.31.9-.84 1.69-.54.79-1.25 1.4-.72.6-1.51.92.32-.58.5-1.22.17-.63.17-1.29 0-.55-.13-1.07-.14-.52-.37-.97-.24-.46-.57-.82Z"/></svg>
                                Use Microsoft Edge (pre-installed on Windows)
                              </h4>
                              <ol className="mt-2 space-y-1.5 text-xs text-gray-600">
                                <li className="flex items-start gap-2">
                                  <span className="font-bold text-blue-600 mt-0.5">1.</span>
                                  Open Microsoft Edge from your Start Menu or taskbar
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="font-bold text-blue-600 mt-0.5">2.</span>
                                  <span>Navigate to <button onClick={handleCopyUrl} className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium">{typeof window !== 'undefined' ? window.location.origin : 'login.stockscan.uk'} {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</button></span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="font-bold text-blue-600 mt-0.5">3.</span>
                                  Click the install icon (⊕) in the address bar, or go to Menu (⋯) → Apps → Install StockScan
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="font-bold text-blue-600 mt-0.5">4.</span>
                                  Click "Install" in the prompt — StockScan will appear in your Start Menu and taskbar
                                </li>
                              </ol>
                            </div>
                          )}

                          {/* Generic Chrome Instructions */}
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <h4 className="font-medium text-gray-900 text-sm flex items-center gap-2">
                              <Chrome className="h-4 w-4 text-[#4285F4]" />
                              Use Google Chrome
                            </h4>
                            <ol className="mt-2 space-y-1.5 text-xs text-gray-600">
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-blue-600 mt-0.5">1.</span>
                                Open Chrome and go to <button onClick={handleCopyUrl} className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium">{typeof window !== 'undefined' ? window.location.origin : 'login.stockscan.uk'} {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</button>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-blue-600 mt-0.5">2.</span>
                                Click the install icon (⊕) in the address bar, or go to Menu (⋮) → "Install StockScan"
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-blue-600 mt-0.5">3.</span>
                                Click "Install" — StockScan opens in its own window and is added to your apps
                              </li>
                            </ol>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        {['No download needed', 'Auto-updates', 'Works offline', 'Taskbar/Dock shortcut'].map(f => (
                          <span key={f} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mobile */}
              {(os?.isIOS || os?.isAndroid) && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-purple-50">
                        <Smartphone className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">StockScan Mobile App</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          For the best mobile experience, use the dedicated StockScan mobile app with native barcode scanning and push notifications.
                        </p>
                        <Button variant="outline" className="mt-3" onClick={() => window.location.href = '/mobile-app'}>
                          <Smartphone className="h-4 w-4 mr-2" /> View Mobile App
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Installation Methods Compared</CardTitle>
            <CardDescription>Choose the best option for your workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-medium text-gray-700">Feature</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">
                      <div className="flex flex-col items-center gap-1">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span>Web Browser</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-blue-700">
                      <div className="flex flex-col items-center gap-1">
                        <Chrome className="h-4 w-4 text-blue-500" />
                        <span>PWA Install</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-slate-700">
                      <div className="flex flex-col items-center gap-1">
                        <HardDrive className="h-4 w-4 text-slate-500" />
                        <span>Desktop App</span>
                        <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">Windows</Badge>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { feature: 'Own app window', web: false, pwa: true, desktop: true },
                    { feature: 'Taskbar / Start Menu', web: false, pwa: true, desktop: true },
                    { feature: 'Offline support', web: false, pwa: true, desktop: true },
                    { feature: 'Auto-updates', web: true, pwa: true, desktop: true },
                    { feature: 'No install required', web: true, pwa: false, desktop: false },
                    { feature: 'System tray icon', web: false, pwa: false, desktop: true },
                    { feature: 'Hardware barcode scanner', web: false, pwa: false, desktop: true },
                    { feature: 'Native notifications', web: false, pwa: true, desktop: true },
                    { feature: 'Works on any browser', web: true, pwa: false, desktop: true },
                  ].map(row => (
                    <tr key={row.feature}>
                      <td className="py-2.5 pr-4 text-gray-700">{row.feature}</td>
                      {[row.web, row.pwa, row.desktop].map((val, i) => (
                        <td key={i} className="text-center py-2.5 px-4">
                          {val ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Server Connection Note */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Enterprise & SaaS Compatible</p>
                <p className="text-xs text-gray-500 mt-1">
                  All installation methods work with both StockScan Cloud (SaaS) and Enterprise servers. 
                  You can configure your server connection in Settings → Server after installation.
                  Currently connected to: <strong>{connection.label}</strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
