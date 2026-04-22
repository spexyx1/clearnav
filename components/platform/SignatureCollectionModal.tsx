import { useState, useRef, useEffect, useCallback } from 'react';
import { X, PenLine, Upload, Trash2, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;
import { useAuth } from '@/lib/auth';

interface SignatureCollectionModalProps {
  officerName: string;
  officerTitle?: string;
  officerUserId?: string;
  onClose: () => void;
  onSaved: () => void;
}

type Mode = 'draw' | 'upload';

export default function SignatureCollectionModal({
  officerName,
  officerTitle = 'Chief Compliance Officer',
  officerUserId,
  onClose,
  onSaved,
}: SignatureCollectionModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleOverride, setTitleOverride] = useState(officerTitle);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [mode]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    setIsDrawing(true);
    lastPoint.current = getPoint(e, canvas);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPoint.current) return;

    const point = getPoint(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
    setHasDrawing(true);
  }, [isDrawing]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, etc.)');
      return;
    }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
  };

  const getSignatureBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (mode === 'upload') {
        if (!uploadedFile) return reject(new Error('No file selected'));
        return resolve(uploadedFile);
      }
      const canvas = canvasRef.current;
      if (!canvas) return reject(new Error('Canvas not found'));
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Failed to export canvas'));
        resolve(blob);
      }, 'image/png', 0.95);
    });
  };

  const handleSave = async () => {
    if (mode === 'draw' && !hasDrawing) {
      setError('Please draw your signature before saving.');
      return;
    }
    if (mode === 'upload' && !uploadedFile) {
      setError('Please select a signature image before saving.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const blob = await getSignatureBlob();
      const fileName = `compliance-officer-signature-${Date.now()}.png`;
      const filePath = `signatures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(filePath, blob, { contentType: 'image/png', upsert: false });

      if (uploadError) throw new Error('Failed to upload signature: ' + uploadError.message);

      const { data: urlData } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('compliance_officer_signatures')
        .insert({
          officer_user_id: officerUserId || null,
          officer_name: officerName,
          officer_title: titleOverride,
          signature_image_url: urlData.publicUrl,
          signature_image_path: filePath,
          is_active: true,
          designated_by: user?.id || null,
        });

      if (dbError) throw new Error('Failed to save signature record: ' + dbError.message);

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Collect Compliance Officer Signature</h2>
            <p className="text-sm text-gray-500 mt-0.5">This signature will be affixed to all KYC verification letters</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Designating</p>
              <p className="text-base font-semibold text-gray-900">{officerName}</p>
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Title (as it will appear on letters)</label>
                <input
                  type="text"
                  value={titleOverride}
                  onChange={e => setTitleOverride(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setMode('draw')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  mode === 'draw'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <PenLine className="w-4 h-4" />
                Draw Signature
              </button>
              <button
                onClick={() => setMode('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  mode === 'upload'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload Image
              </button>
            </div>

            {mode === 'draw' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Draw your signature in the box below</p>
                  {hasDrawing && (
                    <button
                      onClick={handleClear}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white"
                     style={{ touchAction: 'none' }}>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    className="w-full cursor-crosshair"
                    style={{ height: '160px', display: 'block' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                  />
                  {!hasDrawing && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-gray-300 text-sm select-none">Sign here</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1.5 text-center">Use your mouse or touch to draw your signature</p>
              </div>
            )}

            {mode === 'upload' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {uploadedPreview ? (
                  <div className="space-y-3">
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white p-4 flex items-center justify-center" style={{ minHeight: '160px' }}>
                      <img
                        src={uploadedPreview}
                        alt="Signature preview"
                        className="max-h-36 max-w-full object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                      >
                        Replace Image
                      </button>
                      <button
                        onClick={() => { setUploadedFile(null); setUploadedPreview(null); }}
                        className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-cyan-400 rounded-lg p-8 flex flex-col items-center gap-3 transition-colors group"
                    style={{ minHeight: '160px' }}
                  >
                    <Upload className="w-8 h-8 text-gray-300 group-hover:text-cyan-400 transition-colors" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Click to upload signature image</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, or GIF — transparent background recommended</p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                  <strong>Important:</strong> By saving this signature, you authorise it to be affixed to all future
                  KYC/AML verification letters issued by ClearNAV on behalf of its tenants. This designation can be
                  updated at any time by a Platform Administrator.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (mode === 'draw' && !hasDrawing) || (mode === 'upload' && !uploadedFile)}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save Signature</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
