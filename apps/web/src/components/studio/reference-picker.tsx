'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Upload, FolderOpen, X, Image, Film, Check, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { laravel, LARAVEL_URL } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';

interface AssetItem {
  id: string;
  name: string;
  type: string;
  size: string;
  sizeBytes: number;
  mime?: string;
  previewUrl?: string;
  downloadUrl?: string;
}

interface ReferencePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: File | AssetItem) => void;
  acceptTypes: string;
  maxSizeMB: number;
  featureLabel: string;
  canUpload: boolean;
  multiSelect?: boolean;
  disabledNames?: string[];
}

const ASSETS_PER_PAGE = 20;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(mime: string): boolean {
  return mime.startsWith('image/');
}

export function ReferencePicker({ open, onClose, onSelect, acceptTypes, maxSizeMB, featureLabel, canUpload, multiSelect, disabledNames }: ReferencePickerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore(s => s.addToast);
  // Object URLs created for library asset previews — tracked so they can be revoked on
  // reload / close / unmount (loadAssets re-runs on every open and never freed them).
  const assetUrlsRef = useRef<string[]>([]);

  const revokeAssetPreviews = () => {
    assetUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    assetUrlsRef.current = [];
  };

  // Generate + cleanup object URLs for image and video previews
  useEffect(() => {
    const urls = uploadedFiles.map(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : ''
    );
    setPreviewUrls(urls);
    return () => {
      urls.forEach(u => { if (u) URL.revokeObjectURL(u); });
    };
  }, [uploadedFiles]);

  const acceptsVideo = acceptTypes.includes('video');
  const acceptsImage = acceptTypes.includes('image');
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const TYPE_FILTERS = [
    { slug: '', label: 'Tất cả' },
    ...(acceptsImage ? [{ slug: 'image', label: 'Ảnh' }] : []),
    ...(acceptsVideo ? [{ slug: 'video', label: 'Video' }] : []),
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (activeTab !== 'library') return;
    loadAssets();
  }, [open, activeTab]);

  const loadAssets = async () => {
    setLoading(true);
    // Free previews from the previous load before creating a fresh batch.
    revokeAssetPreviews();
    try {
      const res = await laravel.assets();
      const list = res?.data?.items || res?.data || [];
      const mapped: AssetItem[] = list
        .filter((a: any) => {
          const mime = a.mime_type || '';
          const matchType = acceptsImage && isImageType(mime) || acceptsVideo && mime.startsWith('video/');
          const sizeOk = !a.size_bytes || a.size_bytes <= maxSizeBytes;
          return matchType && sizeOk;
        })
        .map((a: any) => ({
          id: a.uuid || a.id,
          name: a.original_name || a.name || 'Untitled',
          type: (a.mime_type || '').startsWith('video/') ? 'video' : 'image',
          size: a.size_bytes ? formatSize(a.size_bytes) : '—',
          sizeBytes: a.size_bytes || 0,
          mime: a.mime_type,
          previewUrl: '',
          downloadUrl: `${LARAVEL_URL}/api/assets/${a.uuid || a.id}/download`,
        }));
      setAssets(mapped);

      // Download previews via authenticated fetch
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      for (const asset of mapped) {
        try {
          const r = await fetch(asset.downloadUrl!, { headers });
          if (r.ok) {
            const blob = await r.blob();
            asset.previewUrl = URL.createObjectURL(blob);
            assetUrlsRef.current.push(asset.previewUrl);
          }
        } catch { /* skip failed previews */ }
      }
      setAssets([...mapped]);
    } catch {
      addToast('Không thể tải tài nguyên', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(a => {
    const matchType = !typeFilter || a.type === typeFilter;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const toggleAsset = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectFromLibrary = () => {
    if (multiSelect) {
      const selected = assets.filter(a => selectedIds.includes(a.id));
      if (selected.length === 0) return;
      for (const asset of selected) onSelect(asset);
      setSelectedIds([]);
      onClose();
    } else {
      const asset = selectedIds.length > 0 ? assets.find(a => a.id === selectedIds[0]) : null;
      if (!asset) return;
      onSelect(asset);
      setSelectedIds([]);
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const valid: File[] = [];
    for (const file of Array.from(files).slice(0, multiSelect ? undefined : 1)) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidType = (acceptsImage && isImage) || (acceptsVideo && isVideo) || (!acceptsImage && !acceptsVideo);

      if (!isValidType) {
        addToast(`Loại file không được hỗ trợ`, 'warning');
        continue;
      }

      if (file.size > maxSizeBytes) {
        addToast(`"${file.name}" quá lớn (tối đa ${maxSizeMB}MB)`, 'warning');
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;

    setUploadedFiles(prev => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadConfirm = () => {
    if (uploadedFiles.length === 0) return;
    setUploading(true);
    for (const file of uploadedFiles) onSelect(file);
    setUploadedFiles([]);
    setUploading(false);
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Disable body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Revoke library preview blobs when the picker closes, and on unmount.
  useEffect(() => {
    if (!open) revokeAssetPreviews();
  }, [open]);
  useEffect(() => () => revokeAssetPreviews(), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#16141a]/70 backdrop-blur-md z-[999] flex items-center justify-center p-4"
          onClick={onClose}
        >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-full max-w-2xl bg-[#16141a] border border-white/10 rounded-2xl shadow-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/12">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#FF5A1F] to-[#6B2415] flex items-center justify-center">
                <Image className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{featureLabel}</h3>
                <p className="text-[10px] text-slate-500">Tối đa {maxSizeMB}MB</p>
              </div>
            </div>
            <button onClick={onClose} className="cursor-pointer p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          {canUpload ? (
            <div className="flex p-1.5 mx-4 mt-4 bg-[#16141a] rounded-2xl border border-white/12">
              <button
                onClick={() => { setActiveTab('library'); setSelectedIds([]); }}
                className={`cursor-pointer flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'library' ? 'bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Tài nguyên sẵn có
              </button>
              <button
                onClick={() => { setActiveTab('upload'); setSelectedIds([]); }}
                className={`cursor-pointer flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'upload' ? 'bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload mới
              </button>
            </div>
          ) : (
            <div className="mx-4 mt-4">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/12">
                <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">Tài nguyên sẵn có</span>
                <span className="ml-auto text-[10px] text-slate-400 bg-white/[0.03] px-2 py-0.5 rounded-full">Gói Free</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-4 max-h-[420px] overflow-y-auto">
            {activeTab === 'library' ? (
              <div className="space-y-4">
                {/* Filter + Search */}
                <div className="flex gap-3">
                  <div className="flex p-1 rounded-xl bg-[#16141a] border border-white/12">
                    {TYPE_FILTERS.map(f => (
                      <button key={f.slug}
                        onClick={() => setTypeFilter(f.slug)}
                        className={`cursor-pointer px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${typeFilter === f.slug ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/12 bg-[#16141a] px-3 h-9">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      placeholder="Tìm kiếm..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <FolderOpen className="h-10 w-10 text-slate-500 mx-auto" />
                    <p className="text-sm text-slate-500">Chưa có tài nguyên phù hợp</p>
                    <p className="text-xs text-slate-400">{canUpload ? 'Chuyển sang tab Upload mới để tải lên' : 'Tạo video AI để có tài nguyên sử dụng lại'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredAssets.map(asset => {
                      const isSelected = selectedIds.includes(asset.id);
                      const isDisabled = disabledNames?.includes(asset.name);
                      return (
                        <button key={asset.id}
                          onClick={() => {
                            if (isDisabled) return;
                            multiSelect ? toggleAsset(asset.id) : setSelectedIds([asset.id]);
                          }}
                          disabled={isDisabled}
                          className={`relative rounded-xl border overflow-hidden transition-all group ${isDisabled ? 'opacity-50 cursor-not-allowed border-white/12' : isSelected ? 'border-[#FF5A1F] ring-2 ring-[#FF5A1F]/30 cursor-pointer' : 'border-white/10 hover:border-white/20 cursor-pointer'}`}
                        >
                          {asset.previewUrl && asset.type === 'video' ? (
                            <div className="w-full aspect-square relative group/preview overflow-hidden bg-[#16141a]">
                              <video src={asset.previewUrl} className="w-full h-full object-cover" muted preload="metadata" />
                              {!isDisabled && (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#16141a]/40 opacity-0 group-hover/preview:opacity-100 transition-opacity">
                                  <div className="h-8 w-8 rounded-full bg-[#FF5A1F] flex items-center justify-center shadow-sm">
                                    <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : asset.previewUrl && asset.type === 'image' ? (
                            <img src={asset.previewUrl} alt={asset.name} className="w-full aspect-square object-cover" />
                          ) : (
                            <div className="w-full aspect-square bg-white/[0.02] flex items-center justify-center">
                              {asset.type === 'video' ? <Film className="h-8 w-8 text-slate-500" /> : <Image className="h-8 w-8 text-slate-500" />}
                            </div>
                          )}
                          
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#FF5A1F]/20 flex items-center justify-center">
                              <Check className="h-6 w-6 text-[#FF5A1F]" />
                            </div>
                          )}

                          {isDisabled && (
                            <div className="absolute inset-0 bg-[#16141a]/60 flex items-center justify-center">
                              <span className="text-[10px] font-medium text-white/70 bg-[#16141a]/50 px-2 py-1 rounded-md">Đã chọn</span>
                            </div>
                          )}

                          <div className="p-2 border-t border-white/12">
                            <p className="text-[10px] font-medium text-white truncate">{asset.name}</p>
                            <p className="text-[9px] text-slate-500">{asset.size}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 py-8">
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {uploadedFiles.map((file, index) => {
                        const isImage = file.type.startsWith('image/');
                        const previewUrl = previewUrls[index];
                        return (
                          <div key={`${file.name}-${file.size}-${index}`} className="relative rounded-xl border border-white/10 overflow-hidden bg-white/[0.02] group">
                            {file.type.startsWith('video/') && previewUrl ? (
                              <div className="w-full aspect-square relative group/preview overflow-hidden bg-[#16141a]">
                                <video src={previewUrl} className="w-full h-full object-cover" muted preload="metadata" />
                                <div className="absolute inset-0 flex items-center justify-center bg-[#16141a]/40 opacity-0 group-hover/preview:opacity-100 transition-opacity">
                                  <div className="h-8 w-8 rounded-full bg-[#FF5A1F] flex items-center justify-center shadow-sm">
                                    <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                                  </div>
                                </div>
                              </div>
                            ) : isImage && previewUrl ? (
                              <img src={previewUrl} alt={file.name} className="w-full aspect-square object-cover" />
                            ) : (
                              <div className="w-full aspect-square flex items-center justify-center">
                                {file.type.startsWith('video/') ? <Film className="h-8 w-8 text-slate-400" /> : <Image className="h-8 w-8 text-slate-400" />}
                              </div>
                            )}
                            <button
                              onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                              className="absolute top-1.5 right-1.5 cursor-pointer h-6 w-6 rounded-full bg-[#16141a]/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#16141a]/80"
                            >
                              <X className="h-3 w-3 text-white" />
                            </button>
                            <div className="p-2 border-t border-white/12">
                              <p className="text-[10px] font-medium text-white truncate">{file.name}</p>
                              <p className="text-[9px] text-slate-500">{formatSize(file.size)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => setUploadedFiles([])} className="cursor-pointer h-10 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm transition-colors">Chọn lại</Button>
                      <Button onClick={handleUploadConfirm} disabled={uploading} className="cursor-pointer h-10 px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white text-sm transition-colors disabled:opacity-50">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Xác nhận (${uploadedFiles.length})`}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-[#FF5A1F]/30 transition-all cursor-pointer"
                  >
                    <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400 mb-1">Kéo thả hoặc bấm để chọn file</p>
                    <p className="text-xs text-slate-400">{acceptTypes.split(',').join(', ')} · tối đa {maxSizeMB}MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptTypes}
                  multiple={multiSelect}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          {activeTab === 'library' && (
            <div className="flex items-center justify-between p-4 border-t border-white/12">
              <p className="text-[10px] text-slate-400">
                {multiSelect
                  ? `${filteredAssets.length} tài nguyên · đã chọn ${selectedIds.length}`
                  : `${filteredAssets.length} tài nguyên · chọn file để dùng lại`}
              </p>
              <Button
                onClick={handleSelectFromLibrary}
                disabled={selectedIds.length === 0}
                className="cursor-pointer h-10 px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm disabled:opacity-50 transition-colors"
              >
                <Check className="h-4 w-4 mr-2" />
                {multiSelect ? `Chọn ${selectedIds.length} file` : 'Chọn file này'}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
