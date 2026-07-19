'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Plus, Search, Grid3X3, List, Box, Image as ImageIcon,
  Film, Music, Download, Trash2, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { daemon, laravel, fetchRawFile } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';
import { useConfirmStore } from '@/stores/confirm-store';
import { UploadDialog } from '@/components/ui/upload-dialog';
import { t } from '@/lib/i18n';

const LARAVEL_URL = process.env.NEXT_PUBLIC_LARAVEL_URL || 'http://localhost:8000';

interface Asset {
  id: string;
  name: string;
  type: string;
  size: string;
  preview: string;
  date: string;
  source: 'laravel' | 'daemon';
  projectId?: string;
  fileName?: string;
  downloadUrl?: string;
}

const TYPE_FILTERS = [
  { slug: '', label: () => t('assets.all') },
  { slug: 'model', label: () => t('assets.model') },
  { slug: 'image', label: () => t('assets.image') },
  { slug: 'video', label: () => t('assets.film') },
  { slug: 'audio', label: () => t('assets.audio') },
];

function formatType(type: string): string {
  switch (type) {
    case 'model': return t('assets.model');
    case 'image': return t('assets.image');
    case 'video': return t('assets.film');
    case 'audio': return t('assets.audio');
    case 'document': return t('assets.document');
    default: return type;
  }
}

const EXT_TYPE_MAP: Record<string, string> = {
  mp4: 'video', webm: 'video', mov: 'video',
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image',
  mp3: 'audio', wav: 'audio', ogg: 'audio',
  glb: 'model', gltf: 'model', fbx: 'model', obj: 'model',
};

const ITEMS_PER_PAGE = 20;

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function mapLaravelAsset(a: any): Asset {
  // S3/R2 temporary URLs are absolute (https://...), route URLs are relative (/api/...)
  const rawUrl: string = a.url || '';
  const downloadUrl = rawUrl.startsWith('http')
    ? rawUrl
    : `${LARAVEL_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  return {
    id: a.uuid ?? a.id,
    name: a.original_name ?? a.name ?? 'Untitled',
    type: a.type || 'document',
    size: formatBytes(a.size_bytes),
    preview: downloadUrl,
    date: a.created_at ? new Date(a.created_at).toLocaleDateString('vi-VN') : '',
    source: 'laravel',
    downloadUrl,
  };
}

export default function AssetsPageWrapper() {
  return (
    <Suspense>
      <AssetsPage />
    </Suspense>
  );
}

function AssetsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const canUpload = (user as any)?.plan?.slug && (user as any)?.plan?.slug !== 'free';
  const addToast = useToastStore(s => s.addToast);
  const confirm = useConfirmStore(s => s.confirm);

  const initialType = searchParams.get('type') || '';
  const [filter, setFilter] = useState(initialType);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    const type = searchParams.get('type') || '';
    setFilter(type);
  }, [searchParams]);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    const [l, d] = await Promise.allSettled([
      laravel.assets()
        .then((list: any) => {
          const items = Array.isArray(list?.data) ? list.data : list?.data?.items || [];
          return items.length ? items.map(mapLaravelAsset) : [];
        })
        .catch(() => []),
      daemon.listProjects().then(async (projects) => {
        const items: Asset[] = [];
        for (const p of projects.slice(0, 30)) {
          try {
            const pid = p.uuid || p.id;
            if (!pid) continue;
            const files: any[] = await daemon.listFiles(pid);
            for (const f of files) {
              const ext = (f.name || '').split('.').pop()?.toLowerCase() || '';
              items.push({
                id: `d-${pid}-${f.name}`,
                name: f.name,
                type: EXT_TYPE_MAP[ext] || 'document',
                size: formatBytes(f.size),
                preview: ext.match(/^(png|jpg|jpeg|webp)$/) ? '' : '',
                date: f.mtime ? new Date(f.mtime).toLocaleDateString('vi-VN') : '',
                source: 'daemon',
                projectId: pid,
                fileName: f.name,
              });
            }
          } catch { /* skip */ }
        }
        return items;
      }).catch(() => []),
    ]);
    const allAssets: Asset[] = [
      ...(l.status === 'fulfilled' ? l.value : []),
      ...(d.status === 'fulfilled' ? d.value : []),
    ];
    allAssets.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
    setAssets(allAssets);
    setLoading(false);
  }, []);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const handleFilterChange = (slug: string) => {
    setFilter(slug);
    setVisibleCount(ITEMS_PER_PAGE);
    const next = slug ? `?type=${slug}` : '/assets';
    router.replace(next, { scroll: false });
  };

  const filteredAssets = assets.filter(a => {
    const matchesFilter = !filter || a.type === filter;
    const matchesSearch = a.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const visibleAssets = filteredAssets.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAssets.length;

  const handleDownload = async (asset: Asset) => {
    try {
      if (asset.source === 'laravel' && asset.downloadUrl) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const res = await fetch(asset.downloadUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = asset.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (asset.source === 'daemon' && asset.projectId && asset.fileName) {
        const { blobUrl, blob } = await fetchRawFile(asset.projectId, asset.fileName);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = asset.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        URL.revokeObjectURL(blobUrl);
      }
    } catch {
      addToast('Tải xuống thất bại', 'error');
    }
  };

  const handleDelete = async (asset: Asset) => {
    const ok = await confirm({
      title: 'Xoá tài sản',
      message: `Bạn có chắc muốn xoá "${asset.name}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xoá',
      cancelLabel: 'Huỷ',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      if (asset.source === 'laravel') {
        await laravel.deleteAsset(asset.id);
      } else if (asset.source === 'daemon' && asset.projectId && asset.fileName) {
        await daemon.deleteFile(asset.projectId, asset.fileName);
      }
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      addToast(`Đã xoá "${asset.name}"`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi xoá', 'error');
    }
  };

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    try {
      const results = await Promise.allSettled(
        files.map(file => laravel.uploadAsset(file))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      if (succeeded > 0) addToast(`Đã tải lên ${succeeded} tệp${failed > 0 ? `, ${failed} lỗi` : ''}`, 'success');
      if (failed > 0 && succeeded === 0) addToast('Tải lên thất bại', 'error');
      loadAssets();
    } catch (err: any) {
      addToast(err.message || 'Lỗi tải lên', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-6 lg:gap-12 pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-semibold tracking-tight text-white">{t('assets.title')}</h1>
          <p className="text-slate-500 font-medium tracking-tight">{t('assets.desc')}</p>
        </div>
        {canUpload && (
        <Button disabled={uploading} onClick={() => setUploadOpen(true)}
          className="h-12 px-8 rounded-xl bg-brand hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-sm shadow-brand/20 transition-all disabled:opacity-50">
          {uploading ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Plus className="h-5 w-5 mr-2" />
          )}
          {uploading ? t('common.loading') : t('assets.uploadButton')}
        </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex p-2 rounded-[20px] bg-[#16141a] border border-white/12 overflow-x-auto no-scrollbar">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.slug}
              onClick={() => handleFilterChange(f.slug)}
              className={`px-8 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
                filter === f.slug ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className="flex bg-[#16141a] p-1.5 rounded-xl border border-white/12 h-11">
            <Button variant="ghost" size="icon" onClick={() => setView('grid')}
              className={`h-8 w-8 rounded-lg ${view === 'grid' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setView('list')}
              className={`h-8 w-8 rounded-lg ${view === 'list' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>
              <List className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex md:w-72 items-center gap-3 rounded-xl border border-white/12 bg-[#16141a] px-4 h-11 group focus-within:border-brand/30 transition-all">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              placeholder={t('assets.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
              className="bg-transparent text-sm text-white outline-none w-full placeholder:text-slate-500 font-medium"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-32 space-y-4 bg-[#16141a] rounded-2xl border border-white/12">
          <Box className="h-12 w-12 text-slate-500 mx-auto" />
          <p className="text-slate-500 font-medium">{t('assets.empty')}</p>
        </div>
      ) : view === 'grid' ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 md:gap-6">
            <AnimatePresence mode="popLayout">
              {visibleAssets.map(asset => (
                <AssetCard key={asset.id} asset={asset} onDelete={handleDelete} onDownload={handleDownload} />
              ))}
            </AnimatePresence>
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button onClick={() => setVisibleCount(c => c + ITEMS_PER_PAGE)}
                variant="ghost"
                className="px-10 py-6 rounded-2xl border border-white/12 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">
                Xem thêm ({filteredAssets.length - visibleCount})
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="cinematic-card overflow-hidden border-white/12 isolate">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#16141a] text-[11px] uppercase tracking-widest font-bold text-slate-500 border-b border-white/12">
                <tr>
                  <th className="px-10 py-6">{t('assets.name')}</th>
                  <th className="px-10 py-6">{t('assets.type')}</th>
                  <th className="px-10 py-6">{t('assets.size')}</th>
                  <th className="px-10 py-6">{t('assets.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleAssets.map(asset => (
                  <tr key={asset.id} className="group hover:bg-white/[0.03] transition-all">
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-5">
                        <AssetIcon type={asset.type} className="h-6 w-6 text-brand" />
                        <span className="text-sm font-semibold text-white tracking-tight group-hover:text-brand transition-all">{asset.name}</span>
                        {asset.date && (
                          <span className="text-[10px] text-slate-400 font-medium ml-2">{asset.date}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <Badge variant="ghost" className="text-[10px] font-bold text-slate-500 uppercase border-white/10 px-3 py-1 bg-white/5">
                        {formatType(asset.type)}
                      </Badge>
                    </td>
                    <td className="px-10 py-7 text-xs font-bold text-slate-400">{asset.size}</td>
                    <td className="px-10 py-7 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={() => handleDownload(asset)} className="h-11 w-11 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                          <Download className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" onClick={() => handleDelete(asset)}
                          className="h-11 w-11 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-white/5">
            {visibleAssets.map(asset => (
              <div key={asset.id} className="p-4 space-y-3 hover:bg-white/[0.03] transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AssetIcon type={asset.type} className="h-5 w-5 text-brand" />
                    <span className="text-sm font-semibold text-white tracking-tight">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" onClick={() => handleDownload(asset)} className="h-9 w-9 rounded-xl text-slate-500 hover:text-white">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDelete(asset)}
                      className="h-9 w-9 rounded-xl text-slate-400 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <Badge variant="ghost" className="text-[10px] font-bold text-slate-500 uppercase border-white/10 px-2.5 py-0.5 bg-white/5">
                    {formatType(asset.type)}
                  </Badge>
                  <span className="font-bold text-slate-400">{asset.size}</span>
                </div>
                {asset.date && (
                  <p className="text-[10px] text-slate-500 font-medium">{asset.date}</p>
                )}
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center py-8 border-t border-white/12">
              <Button onClick={() => setVisibleCount(c => c + ITEMS_PER_PAGE)}
                variant="ghost"
                className="px-10 py-6 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">
                Xem thêm ({filteredAssets.length - visibleCount})
              </Button>
            </div>
          )}
           </div>
       )}
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUpload={handleUpload} />
    </div>
  );
}

function AssetCard({ asset, onDelete, onDownload }: { asset: Asset; onDelete: (asset: Asset) => void; onDownload: (asset: Asset) => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const isImage = asset.type === 'image';
  const isVideo = asset.type === 'video';
  const shouldFetch = isImage || isVideo;
  
  useEffect(() => {
    if (shouldFetch && asset.source === 'daemon' && asset.projectId && asset.fileName) {
      fetchRawFile(asset.projectId, asset.fileName)
        .then(r => setBlobUrl(r.blobUrl))
        .catch(() => {});
    } else if (shouldFetch && asset.source === 'laravel' && asset.preview) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      fetch(asset.preview, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then(r => r.blob())
        .then(blob => setBlobUrl(URL.createObjectURL(blob)))
        .catch(() => {});
    }
  }, [shouldFetch, asset.source, asset.projectId, asset.fileName, asset.preview]);
  
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="cinematic-card group overflow-hidden flex flex-col h-full border-white/12 bg-[#16141a]">
      <div className="h-52 relative bg-[#16141a] overflow-hidden">
        {blobUrl ? (
          isVideo ? (
            <video src={blobUrl} autoPlay muted loop playsInline
              className="object-cover w-full h-full opacity-70 group-hover:opacity-90 group-hover:scale-110 transition-all duration-1000"
            />
          ) : (
            // Plain <img> (not next/image) — reliably renders auth-fetched blob URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={blobUrl} alt={asset.name}
              className="object-cover w-full h-full opacity-70 group-hover:opacity-90 group-hover:scale-110 transition-all duration-1000"
              referrerPolicy="no-referrer"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <AssetIcon type={asset.type} className="h-16 w-16 text-slate-900" />
          </div>
        )}
        <div className="absolute inset-0 bg-brand/20 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-4 backdrop-blur-md">
          <Button onClick={() => onDownload(asset)} className="h-12 w-12 rounded-2xl bg-white text-black hover:scale-110 transition-transform">
            <Download className="h-6 w-6" />
          </Button>
          <Button onClick={() => onDelete(asset)}
            className="h-12 w-12 rounded-2xl bg-red-500/20 text-red-300 backdrop-blur-md border border-red-500/20 hover:scale-110 transition-transform">
            <Trash2 className="h-6 w-6" />
          </Button>
        </div>
      </div>
      <div className="p-6 space-y-2">
        <h3 className="text-sm font-semibold text-white truncate tracking-tight">{asset.name}</h3>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-bold uppercase text-brand tracking-widest">{formatType(asset.type)}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.size}</span>
        </div>
        {asset.date && (
          <p className="text-[10px] text-slate-500 font-medium">{asset.date}</p>
        )}
      </div>
    </motion.div>
  );
}

function AssetIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'model': return <Box className={className} />;
    case 'image': return <ImageIcon className={className} />;
    case 'video': return <Film className={className} />;
    case 'audio': return <Music className={className} />;
    default: return <ImageIcon className={className} />;
  }
}
