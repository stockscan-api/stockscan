'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import {
  ScanLine,
  Camera,
  CameraOff,
  Search,
  Package,
  Hash,
  Loader2,
  AlertCircle,
  Barcode,
  RefreshCw,
  Copy,
  Tag,
  Plus,
  List,
  X,
} from 'lucide-react';

type Tab = 'scan' | 'codes';

interface ProductResult {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  quantity?: number;
  category?: string;
  description?: string;
  barcode?: string;
}

interface ProductCode {
  id: string;
  code: string;
  productId: string;
  productName?: string;
  type?: string;
  createdAt?: string;
}

export default function BarcodeScannerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('scan');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [product, setProduct] = useState<ProductResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lastScanned, setLastScanned] = useState('');

  // Product codes tab
  const [codes, setCodes] = useState<ProductCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [generateProductId, setGenerateProductId] = useState('');

  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  // Lookup a barcode
  const lookupBarcode = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setSearching(true);
    setProduct(null);
    setNotFound(false);
    setLastScanned(code.trim());
    try {
      const result = await apiClient.lookupBarcode(code.trim());
      if (result && (result.id || result.product)) {
        setProduct(result.product || result);
      } else {
        setNotFound(true);
      }
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setNotFound(true);
      } else {
        toast.error(err.message || 'Lookup failed');
      }
    } finally {
      setSearching(false);
    }
  }, []);

  // Initialize camera scanner
  const startScanner = useCallback(async () => {
    setCameraError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (html5QrCodeRef.current) {
        try { await html5QrCodeRef.current.stop(); } catch {}
      }
      const scannerId = 'barcode-scanner-region';
      const scanner = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText: string) => {
          // Debounce: only trigger if different from last
          lookupBarcode(decodedText);
          // Briefly pause scanning after a successful read
          try { scanner.pause(true); } catch {}
          setTimeout(() => {
            try { scanner.resume(); } catch {}
          }, 2000);
        },
        () => {} // Ignore scan failures (happens every frame without a code)
      );
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err?.message?.includes('Permission') || err?.name === 'NotAllowedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings and reload the page.');
      } else if (err?.message?.includes('NotFoundError') || err?.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(err?.message || 'Failed to start camera. Please ensure your device has a camera and the browser has permission to use it.');
      }
      setCameraActive(false);
    }
  }, [lookupBarcode]);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch {}
    }
    setCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try { html5QrCodeRef.current.stop(); } catch {}
      }
    };
  }, []);

  // Fetch product codes
  const fetchCodes = useCallback(async () => {
    setCodesLoading(true);
    try {
      const result = await apiClient.getAllProductCodes();
      setCodes(Array.isArray(result) ? result : result?.data || []);
    } catch (err: any) {
      console.error('Failed to fetch product codes:', err);
      toast.error('Failed to load product codes');
    } finally {
      setCodesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'codes') {
      fetchCodes();
    }
  }, [activeTab, fetchCodes]);

  // Generate product code
  const handleGenerateCode = async () => {
    if (!generateProductId.trim()) {
      toast.error('Enter a product ID');
      return;
    }
    setGeneratingCode(true);
    try {
      await apiClient.generateProductCode({ productId: generateProductId.trim() });
      toast.success('Product code generated');
      setGenerateProductId('');
      fetchCodes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate code');
    } finally {
      setGeneratingCode(false);
    }
  };

  // Manual search handler
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    lookupBarcode(manualCode);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <DashboardLayout allowedRoles={['STAFF', 'MANAGER', 'OWNER']}>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScanLine className="h-7 w-7 text-blue-600" />
            Barcode Scanner
          </h1>
          <p className="text-gray-500 mt-1">Scan barcodes to look up products or manage product codes</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'scan'
                ? 'bg-white text-gray-900 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Camera className="h-4 w-4" /> Scan & Lookup
          </button>
          <button
            onClick={() => setActiveTab('codes')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'codes'
                ? 'bg-white text-gray-900 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="h-4 w-4" /> Product Codes
          </button>
        </div>

        {activeTab === 'scan' && (
          <div className="space-y-6">
            {/* Camera Scanner */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-gray-400" />
                Camera Scanner
              </h2>

              {cameraError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 font-medium">Camera Error</p>
                    <p className="text-sm text-red-600 mt-1">{cameraError}</p>
                  </div>
                  <button onClick={() => setCameraError('')} className="ml-auto text-red-400 hover:text-red-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {/* Scanner viewport */}
                <div
                  ref={scannerRef}
                  className={`relative rounded-lg overflow-hidden bg-gray-900 ${
                    cameraActive ? 'min-h-[300px]' : 'min-h-[200px] flex items-center justify-center'
                  }`}
                >
                  <div id="barcode-scanner-region" className={cameraActive ? '' : 'hidden'} />
                  {!cameraActive && (
                    <div className="text-center p-8">
                      <CameraOff className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Camera is off</p>
                      <p className="text-gray-500 text-xs mt-1">Click the button below to start scanning</p>
                    </div>
                  )}
                </div>

                {/* Camera controls */}
                <div className="flex gap-3">
                  {!cameraActive ? (
                    <button
                      onClick={startScanner}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      Start Camera
                    </button>
                  ) : (
                    <button
                      onClick={stopScanner}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <CameraOff className="h-4 w-4" />
                      Stop Camera
                    </button>
                  )}
                </div>

                {lastScanned && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Barcode className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-blue-800">Last scanned: <span className="font-mono font-medium">{lastScanned}</span></span>
                    <button onClick={() => copyToClipboard(lastScanned)} className="ml-auto text-blue-500 hover:text-blue-700">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Lookup */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-gray-400" />
                Manual Lookup
              </h2>
              <form onSubmit={handleManualSearch} className="flex gap-3">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="Enter barcode or product code"
                />
                <button
                  type="submit"
                  disabled={searching || !manualCode.trim()}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </button>
              </form>
            </div>

            {/* Search Result */}
            {searching && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-gray-500">Looking up barcode...</p>
              </div>
            )}

            {product && !searching && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Product Found
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</p>
                      <p className="text-lg font-semibold text-gray-900">{product.name}</p>
                    </div>
                    {product.sku && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</p>
                        <p className="font-mono text-gray-700">{product.sku}</p>
                      </div>
                    )}
                    {product.category && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</p>
                        <p className="text-gray-700">{product.category}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {product.price !== undefined && product.price !== null && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Price</p>
                        <p className="text-lg font-semibold text-blue-600">£{Number(product.price).toFixed(2)}</p>
                      </div>
                    )}
                    {product.quantity !== undefined && product.quantity !== null && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</p>
                        <p className={`font-semibold ${Number(product.quantity) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.quantity} units
                        </p>
                      </div>
                    )}
                    {product.barcode && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-gray-700">{product.barcode}</p>
                          <button onClick={() => copyToClipboard(product.barcode!)} className="text-gray-400 hover:text-blue-600">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {product.description && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-gray-600 text-sm">{product.description}</p>
                  </div>
                )}
              </div>
            )}

            {notFound && !searching && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Product Not Found</h3>
                <p className="text-gray-500 text-sm">
                  No product found for barcode <span className="font-mono font-medium">{lastScanned}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'codes' && (
          <div className="space-y-6">
            {/* Generate Code */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-gray-400" />
                Generate Product Code
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={generateProductId}
                  onChange={(e) => setGenerateProductId(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Product ID"
                />
                <button
                  onClick={handleGenerateCode}
                  disabled={generatingCode || !generateProductId.trim()}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
                  Generate
                </button>
              </div>
            </div>

            {/* Product Codes List */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-gray-400" />
                  Product Codes
                </h2>
                <button
                  onClick={fetchCodes}
                  disabled={codesLoading}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${codesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {codesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : codes.length === 0 ? (
                <div className="text-center py-12">
                  <Barcode className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No product codes found</p>
                  <p className="text-gray-400 text-sm mt-1">Generate codes for your products above</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Code</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Product</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Type</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Created</th>
                        <th className="py-3 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {codes.map((code) => (
                        <tr key={code.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3 font-mono text-blue-600 font-medium">{code.code}</td>
                          <td className="py-3 px-3 text-gray-700">{code.productName || code.productId}</td>
                          <td className="py-3 px-3">
                            <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                              {code.type || 'BARCODE'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-500 text-xs">
                            {code.createdAt ? new Date(code.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => copyToClipboard(code.code)}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="Copy code"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
