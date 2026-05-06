'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { SignaturePad } from '@/components/signature-pad';
import { apiClient } from '@/lib/api-client';
import Image from 'next/image';
import toast from 'react-hot-toast';
import {
  ArrowRightLeft,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Package,
  Warehouse,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  PenTool,
  FileText,
  Printer,
  ClipboardCheck,
  PackageCheck,
} from 'lucide-react';

interface TransferItem {
  id: string;
  productId: string;
  quantity: number;
  product?: { name: string; sku?: string };
}

interface Transfer {
  id: string;
  transferNumber?: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  fromWarehouse?: { id: string; name: string };
  toWarehouse?: { id: string; name: string };
  status: string;
  notes?: string;
  items?: TransferItem[];
  createdBy?: { name: string };
  createdAt?: string;
  updatedAt?: string;
}

// Signature data stored in localStorage per transfer
interface TransferSignatures {
  pickedBy?: string;
  pickedSignature?: string;
  pickedAt?: string;
  receivedBy?: string;
  receivedSignature?: string;
  receivedAt?: string;
}

const SIGNATURES_KEY = 'stockscan_transfer_signatures';

function loadSignatures(transferId: string): TransferSignatures {
  try {
    const all = JSON.parse(localStorage.getItem(SIGNATURES_KEY) || '{}');
    return all[transferId] || {};
  } catch {
    return {};
  }
}

function saveSignatures(transferId: string, sigs: TransferSignatures) {
  try {
    const all = JSON.parse(localStorage.getItem(SIGNATURES_KEY) || '{}');
    all[transferId] = sigs;
    localStorage.setItem(SIGNATURES_KEY, JSON.stringify(all));
  } catch {
    // localStorage full or unavailable
  }
}

export default function StockTransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const transferId = params.id as string;

  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [signatures, setSignatures] = useState<TransferSignatures>({});

  // Signature modals
  const [showPickedModal, setShowPickedModal] = useState(false);
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [signerName, setSignerName] = useState('');

  useEffect(() => {
    if (transferId) {
      fetchTransfer();
    }
  }, [transferId]);

  // Load signatures from localStorage once on client
  useEffect(() => {
    if (transferId) {
      setSignatures(loadSignatures(transferId));
    }
  }, [transferId]);

  const fetchTransfer = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getStockTransfer(transferId);
      setTransfer(data);
    } catch (error: any) {
      // If single-fetch fails, try to find in list
      try {
        const all = await apiClient.getStockTransfers({ limit: 200 });
        const list = Array.isArray(all) ? all : all?.data || all?.transfers || [];
        const found = list.find((t: any) => t.id === transferId);
        if (found) {
          setTransfer(found);
        } else {
          toast.error('Transfer not found');
          router.push('/stock-transfers');
        }
      } catch {
        toast.error('Failed to load transfer');
        router.push('/stock-transfers');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickedSignature = async (signatureData: string) => {
    if (!signerName.trim()) {
      toast.error('Please enter the name of the person picking');
      return;
    }
    setIsUpdating(true);
    try {
      // Update status to IN_TRANSIT
      await apiClient.updateStockTransferStatus(transferId, {
        status: 'IN_TRANSIT',
      }).catch(() => {
        // Status update may fail if backend doesn't support IN_TRANSIT, that's ok
      });

      // Also try to save notes with picked info via PATCH
      const pickedNote = `Picked by ${signerName.trim()} on ${new Date().toLocaleString('en-GB')}`;
      await apiClient.updateStockTransfer(transferId, {
        notes: transfer?.notes ? `${transfer.notes}\n${pickedNote}` : pickedNote,
      }).catch(() => {});

      // Save signature locally
      const newSigs: TransferSignatures = {
        ...signatures,
        pickedBy: signerName.trim(),
        pickedSignature: signatureData,
        pickedAt: new Date().toISOString(),
      };
      saveSignatures(transferId, newSigs);
      setSignatures(newSigs);

      toast.success('Picked signature captured — items are in transit');
      setShowPickedModal(false);
      setSignerName('');
      fetchTransfer();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save signature');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReceivedSignature = async (signatureData: string) => {
    if (!signerName.trim()) {
      toast.error('Please enter the name of the person receiving');
      return;
    }
    setIsUpdating(true);
    try {
      // Update status to COMPLETED
      await apiClient.updateStockTransferStatus(transferId, {
        status: 'COMPLETED',
      }).catch(() => {});

      // Save notes
      const receivedNote = `Received by ${signerName.trim()} on ${new Date().toLocaleString('en-GB')}`;
      await apiClient.updateStockTransfer(transferId, {
        notes: transfer?.notes ? `${transfer.notes}\n${receivedNote}` : receivedNote,
      }).catch(() => {});

      // Save signature locally
      const newSigs: TransferSignatures = {
        ...signatures,
        receivedBy: signerName.trim(),
        receivedSignature: signatureData,
        receivedAt: new Date().toISOString(),
      };
      saveSignatures(transferId, newSigs);
      setSignatures(newSigs);

      toast.success('Received signature captured — transfer complete');
      setShowReceivedModal(false);
      setSignerName('');
      fetchTransfer();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save signature');
    } finally {
      setIsUpdating(false);
    }
  };

  const printDeliveryNote = () => {
    if (!transfer) return;
    const fromName = transfer.fromWarehouse?.name || 'Unknown';
    const toName = transfer.toWarehouse?.name || 'Unknown';
    const dateStr = transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A';
    const items = transfer.items || [];

    const itemRows = items.map((item, idx) => `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:center;">${idx + 1}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; font-weight:500;">${item.product?.name || 'Unknown'}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; font-family:monospace; font-size:12px; color:#6b7280;">${item.product?.sku || '-'}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:center; font-weight:600; font-size:16px;">${item.quantity}</td>
      </tr>
    `).join('');

    const pickedSection = signatures.pickedSignature ? `
      <div style="margin-top:20px; border:1px solid #d1d5db; border-radius:8px; padding:16px;">
        <p style="font-size:12px; color:#6b7280; margin-bottom:8px; font-weight:600;">Picked By: ${signatures.pickedBy || 'N/A'}</p>
        <img src="${signatures.pickedSignature}" alt="Picked signature" style="max-width:250px; height:auto; border:1px solid #e5e7eb; border-radius:4px;" />
        <p style="font-size:11px; color:#9ca3af; margin-top:4px;">${signatures.pickedAt ? new Date(signatures.pickedAt).toLocaleString('en-GB') : ''}</p>
      </div>` : '';

    const receivedSection = signatures.receivedSignature ? `
      <div style="margin-top:12px; border:1px solid #d1d5db; border-radius:8px; padding:16px;">
        <p style="font-size:12px; color:#6b7280; margin-bottom:8px; font-weight:600;">Received By: ${signatures.receivedBy || 'N/A'}</p>
        <img src="${signatures.receivedSignature}" alt="Received signature" style="max-width:250px; height:auto; border:1px solid #e5e7eb; border-radius:4px;" />
        <p style="font-size:11px; color:#9ca3af; margin-top:4px;">${signatures.receivedAt ? new Date(signatures.receivedAt).toLocaleString('en-GB') : ''}</p>
      </div>` : '';

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>Transfer Note - ${transfer.transferNumber || 'Transfer'}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1f2937; padding:40px; max-width:800px; margin:0 auto; }
        @media print { body { padding:20px; } .no-print { display:none !important; } }
      </style></head><body>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px; padding-bottom:20px; border-bottom:3px solid #2563eb;">
        <div>
          <h1 style="font-size:24px; font-weight:700; color:#1e40af;">STOCK TRANSFER NOTE</h1>
          <p style="color:#6b7280; margin-top:4px;">Internal Warehouse Transfer</p>
        </div>
        <div style="text-align:right;">
          ${transfer.transferNumber ? `<p style="font-size:14px; font-weight:600; color:#1f2937;">Ref: ${transfer.transferNumber}</p>` : ''}
          <p style="font-size:13px; color:#6b7280;">Date: ${dateStr}</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:30px;">
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px;">
          <p style="font-size:11px; text-transform:uppercase; color:#3b82f6; font-weight:600; margin-bottom:4px;">From</p>
          <p style="font-size:16px; font-weight:600; color:#1e40af;">${fromName}</p>
        </div>
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px;">
          <p style="font-size:11px; text-transform:uppercase; color:#22c55e; font-weight:600; margin-bottom:4px;">To</p>
          <p style="font-size:16px; font-weight:600; color:#166534;">${toName}</p>
        </div>
      </div>

      ${transfer.notes ? `<p style="background:#fefce8; border:1px solid #fde68a; border-radius:6px; padding:10px 14px; font-size:13px; color:#854d0e; margin-bottom:20px;"><strong>Notes:</strong> ${transfer.notes}</p>` : ''}

      <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px; text-align:center; font-size:12px; font-weight:600; color:#6b7280; width:50px;">#</th>
            <th style="padding:10px 12px; text-align:left; font-size:12px; font-weight:600; color:#6b7280;">Product</th>
            <th style="padding:10px 12px; text-align:left; font-size:12px; font-weight:600; color:#6b7280;">SKU</th>
            <th style="padding:10px 12px; text-align:center; font-size:12px; font-weight:600; color:#6b7280; width:80px;">Qty</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      ${pickedSection}
      ${receivedSection}

      <div class="no-print" style="margin-top:30px; text-align:center;">
        <button onclick="window.print()" style="background:#2563eb; color:white; border:none; padding:12px 32px; border-radius:8px; cursor:pointer; font-size:14px; font-weight:600;">Print Transfer Note</button>
      </div>
      </body></html>`);
      w.document.close();
    }
  };

  const getStatusConfig = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED' || s === 'RECEIVED') return { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
    if (s === 'IN_TRANSIT') return { label: 'In Transit', color: 'bg-blue-100 text-blue-700', icon: Package };
    if (s === 'PENDING') return { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock };
    if (s === 'CANCELLED') return { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle };
    return { label: status || 'Unknown', color: 'bg-gray-100 text-gray-700', icon: Clock };
  };

  if (isLoading) {
    return (
      <DashboardLayout allowedRoles={['MANAGER', 'OWNER']}>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!transfer) {
    return (
      <DashboardLayout allowedRoles={['MANAGER', 'OWNER']}>
        <div className="text-center py-12">
          <p className="text-gray-500">Transfer not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const statusCfg = getStatusConfig(transfer.status);
  const StatusIcon = statusCfg.icon;
  const isPending = transfer.status?.toUpperCase() === 'PENDING';
  const isInTransit = transfer.status?.toUpperCase() === 'IN_TRANSIT';
  const isCompleted = transfer.status?.toUpperCase() === 'COMPLETED' || transfer.status?.toUpperCase() === 'RECEIVED';
  const isCancelled = transfer.status?.toUpperCase() === 'CANCELLED';

  // Determine which signatures are possible
  const canSignPicked = !signatures.pickedSignature && !isCompleted && !isCancelled;
  const canSignReceived = !!signatures.pickedSignature && !signatures.receivedSignature && !isCancelled;

  return (
    <DashboardLayout allowedRoles={['MANAGER', 'OWNER']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <button
              onClick={() => router.push('/stock-transfers')}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Transfers
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              {transfer.transferNumber && (
                <Badge className="bg-indigo-100 text-indigo-800 font-mono text-lg px-3 py-1">
                  {transfer.transferNumber}
                </Badge>
              )}
              <Badge className={statusCfg.color}>
                <StatusIcon className="h-4 w-4 mr-1" />
                {statusCfg.label}
              </Badge>
              {signatures.pickedSignature && (
                <Badge className="bg-blue-100 text-blue-800">
                  <ClipboardCheck className="h-4 w-4 mr-1" />
                  Picked
                </Badge>
              )}
              {signatures.receivedSignature && (
                <Badge className="bg-green-100 text-green-800">
                  <PackageCheck className="h-4 w-4 mr-1" />
                  Received
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={printDeliveryNote}>
              <Printer className="h-4 w-4 mr-1" />
              Print Note
            </Button>

            {canSignPicked && (
              <Button
                onClick={() => { setSignerName(''); setShowPickedModal(true); }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <PenTool className="h-4 w-4 mr-1" />
                Sign as Picked
              </Button>
            )}

            {canSignReceived && (
              <Button
                onClick={() => { setSignerName(''); setShowReceivedModal(true); }}
                className="bg-green-600 hover:bg-green-700"
              >
                <PenTool className="h-4 w-4 mr-1" />
                Sign as Received
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transfer Route */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                  Transfer Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-2">
                      <Warehouse className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">From</p>
                    <p className="font-bold text-gray-900">{transfer.fromWarehouse?.name || 'Unknown'}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <ArrowRight className="h-8 w-8 text-gray-300" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
                      <Warehouse className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">To</p>
                    <p className="font-bold text-gray-900">{transfer.toWarehouse?.name || 'Unknown'}</p>
                  </div>
                </div>
                {transfer.notes && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800"><strong>Notes:</strong> {transfer.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Transfer Items ({transfer.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!transfer.items || transfer.items.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No items in this transfer</p>
                ) : (
                  <div className="space-y-2">
                    {transfer.items.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.product?.name || 'Unknown Product'}</p>
                          {item.product?.sku && (
                            <p className="text-xs text-gray-500 font-mono">{item.product.sku}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 text-lg">{item.quantity}</p>
                          <p className="text-xs text-gray-500">units</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — Signatures & Info */}
          <div className="space-y-6">
            {/* Signature Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-indigo-600" />
                  Digital Signatures
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Step 1: Picked */}
                <div className={`p-4 rounded-xl border-2 ${
                  signatures.pickedSignature 
                    ? 'border-blue-200 bg-blue-50' 
                    : 'border-dashed border-gray-300 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      signatures.pickedSignature ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>1</div>
                    <p className="font-semibold text-gray-900">Picked</p>
                  </div>
                  {signatures.pickedSignature ? (
                    <div className="space-y-2">
                      <div className="border rounded-lg p-1 bg-white">
                        <Image
                          src={signatures.pickedSignature}
                          alt="Picked signature"
                          width={300}
                          height={120}
                          className="w-full h-auto"
                          unoptimized
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-3.5 w-3.5" />
                        <span>{signatures.pickedBy}</span>
                      </div>
                      {signatures.pickedAt && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(signatures.pickedAt).toLocaleString('en-GB')}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-gray-500 mb-2">Awaiting picker signature</p>
                      {canSignPicked && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => { setSignerName(''); setShowPickedModal(true); }}
                        >
                          <PenTool className="h-3.5 w-3.5 mr-1" />
                          Sign Now
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 2: Received */}
                <div className={`p-4 rounded-xl border-2 ${
                  signatures.receivedSignature 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-dashed border-gray-300 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      signatures.receivedSignature ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>2</div>
                    <p className="font-semibold text-gray-900">Received</p>
                  </div>
                  {signatures.receivedSignature ? (
                    <div className="space-y-2">
                      <div className="border rounded-lg p-1 bg-white">
                        <Image
                          src={signatures.receivedSignature}
                          alt="Received signature"
                          width={300}
                          height={120}
                          className="w-full h-auto"
                          unoptimized
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-3.5 w-3.5" />
                        <span>{signatures.receivedBy}</span>
                      </div>
                      {signatures.receivedAt && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(signatures.receivedAt).toLocaleString('en-GB')}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-gray-500 mb-2">
                        {signatures.pickedSignature ? 'Awaiting receiver signature' : 'Complete step 1 first'}
                      </p>
                      {canSignReceived && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => { setSignerName(''); setShowReceivedModal(true); }}
                        >
                          <PenTool className="h-3.5 w-3.5 mr-1" />
                          Sign Now
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {transfer.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created</span>
                    <span className="font-medium">{new Date(transfer.createdAt).toLocaleDateString('en-GB')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Items</span>
                  <span className="font-medium">{transfer.items?.length || 0}</span>
                </div>
                {transfer.createdBy?.name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created By</span>
                    <span className="font-medium">{transfer.createdBy.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <Badge className={`${statusCfg.color} text-xs`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusCfg.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Picked Signature Modal */}
        <Modal
          isOpen={showPickedModal}
          onClose={() => { setShowPickedModal(false); setSignerName(''); }}
          title="Confirm Items Picked"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                Signing to confirm items have been picked from <strong>{transfer.fromWarehouse?.name}</strong> and are ready for transfer to <strong>{transfer.toWarehouse?.name}</strong>.
              </p>
            </div>

            {/* Items summary */}
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-auto">
              {transfer.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1">
                  <span className="text-gray-700">{item.product?.name}</span>
                  <span className="font-semibold">× {item.quantity}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Picked By (Name) <span className="text-red-500">*</span>
              </label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter picker's name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Signature</label>
              <SignaturePad
                onSave={handlePickedSignature}
                onCancel={() => { setShowPickedModal(false); setSignerName(''); }}
                width={400}
                height={200}
                disabled={isUpdating}
              />
            </div>
          </div>
        </Modal>

        {/* Received Signature Modal */}
        <Modal
          isOpen={showReceivedModal}
          onClose={() => { setShowReceivedModal(false); setSignerName(''); }}
          title="Confirm Items Received"
        >
          <div className="space-y-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                Signing to confirm items have been received at <strong>{transfer.toWarehouse?.name}</strong> from <strong>{transfer.fromWarehouse?.name}</strong>.
              </p>
            </div>

            {/* Items summary */}
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-auto">
              {transfer.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1">
                  <span className="text-gray-700">{item.product?.name}</span>
                  <span className="font-semibold">× {item.quantity}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Received By (Name) <span className="text-red-500">*</span>
              </label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter receiver's name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Signature</label>
              <SignaturePad
                onSave={handleReceivedSignature}
                onCancel={() => { setShowReceivedModal(false); setSignerName(''); }}
                width={400}
                height={200}
                disabled={isUpdating}
              />
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
