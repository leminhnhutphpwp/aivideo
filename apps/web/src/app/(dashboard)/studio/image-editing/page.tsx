'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Image, Wand2, Upload } from 'lucide-react';
import { daemon, laravel } from '@/lib/api/client';
import { useDaemonStore, initDaemonCheck } from '@/stores/daemon-store';
import { useToastStore } from '@/stores/toast-store';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';
import { ReferencePicker } from '@/components/studio/reference-picker';
import { PricePreview } from '@/components/studio/price-preview';
import { EnhancePromptButton } from '@/components/studio/enhance-prompt-button';

export default function ImageEditingPage() {
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const daemonOk = useDaemonStore(s => s.ok);
  const user = useAuthStore(s => s.user);
  const canUpload = (user as any)?.plan?.slug !== 'free';
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [priceData, setPriceData] = useState<any>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const priceAbortRef = useRef<AbortController | null>(null);

  useEffect(() => { initDaemonCheck(); }, []);

  useEffect(() => {
    const planTier = ((useAuthStore.getState().user as any)?.plan?.quality_tier_code || 'standard') as string;
    const quality = planTier === 'ultra' ? 'ultra' : planTier === 'premium' ? 'premium' : 'standard';

    if (priceAbortRef.current) {
      priceAbortRef.current.abort();
    }
    priceAbortRef.current = new AbortController();

    setPriceLoading(true);
    setPriceError(null);

    laravel.pricingCalculate({
      video_type: 'image_editing',
      duration: '5s',
      resolution: '720p',
      quality,
      quantity: 1,
    }).then((res: any) => {
      setPriceData(res);
    }).catch((err: any) => {
      if (err.name !== 'AbortError') {
        setPriceError(err.message || 'Không thể tính giá');
      }
    }).finally(() => {
      setPriceLoading(false);
    });
  }, []);

  const MAX_IMAGES = 9;

  const addImage = async (fileOrAsset: File | any) => {
    if (fileOrAsset instanceof File) {
      setReferenceFiles(prev => [...prev, fileOrAsset]);
      setReferencePreviews(prev => [...prev, URL.createObjectURL(fileOrAsset)]);
    } else if (fileOrAsset.id && fileOrAsset.previewUrl) {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(fileOrAsset.downloadUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const blob = await res.blob();
        const file = new File([blob], fileOrAsset.name, { type: fileOrAsset.mime || blob.type });
        setReferenceFiles(prev => [...prev, file]);
        setReferencePreviews(prev => [...prev, URL.createObjectURL(file)]);
      } catch { addToast('Lỗi tải ảnh', 'error'); }
    }
  };

  const removeImage = (index: number) => {
    setReferenceFiles(prev => prev.filter((_, i) => i !== index));
    setReferencePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePickerSelect = async (fileOrAsset: File | any) => {
    await addImage(fileOrAsset);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      addToast('Vui lòng nhập mô tả chỉnh sửa', 'warning');
      return;
    }
    setGenerating(true);
    try {
      const project = await daemon.createProject({ name: prompt.trim().slice(0, 60) || 'Image Edit', surface: 'image', skillId: 'image-editing' });
      const imageFilenames: string[] = [];
      for (const file of referenceFiles) {
        const uploadResult = await daemon.uploadFile(project.id, file);
        imageFilenames.push(uploadResult.filename || uploadResult.file || file.name);
      }
      await daemon.generate(project.id, {
        capability: referenceFiles.length > 0 ? 'i2i' : 't2i',
        prompt: prompt.trim(),
        surface: 'image',
        images: imageFilenames.length > 0 ? imageFilenames : undefined,
        metadata: { images: imageFilenames, inputImage: imageFilenames[0] },
        ...(priceData?.calculation_id ? { calculation_id: priceData.calculation_id, expected_total: priceData.pricing?.total_credits ?? priceData.total } : {}),
      });
      addToast(t('studio.sentSuccess'), 'success');
      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Validation failed') || msg.includes('validation')) {
        addToast('Thông tin không hợp lệ. Vui lòng kiểm tra lại prompt và ảnh.', 'error');
      } else {
        addToast(msg || t('studio.createFailed'), 'error');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 space-y-8 pb-20">
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/studio" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-white">Image Editing</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Chỉnh sửa ảnh bằng mô tả văn bản</p>
        </div>
      </div>

      <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6 space-y-5">
        {/* Reference images */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
            <Upload className="h-3 w-3" /> Ảnh gốc (tuỳ chọn, tối đa 9 ảnh)
          </label>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Bạn có thể thêm nhiều ảnh và gọi chúng trong mô tả bằng "image 1", "image 2", ...
          </p>
          {referencePreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {referencePreviews.map((preview, i) => (
                <div key={preview} className="relative aspect-square max-w-[140px]">
                  <img src={preview} alt={`Ảnh ${i + 1}`}
                    className="w-full h-full rounded-xl border border-white/10 object-cover" />
                  <span className="absolute top-1.5 left-1.5 bg-zinc-950/60 text-[10px] text-white px-1.5 py-0.5 rounded-md font-medium">
                    image {i + 1}
                  </span>
                  <button onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 shadow-sm">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            {referencePreviews.length > 0 && (
              <button onClick={() => setPickerOpen(true)}
                disabled={referencePreviews.length >= MAX_IMAGES}
                className="flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-white/10 bg-white/5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                <Image className="h-4 w-4" /> Thêm ảnh
              </button>
            )}
            {referencePreviews.length < MAX_IMAGES && referencePreviews.length === 0 && (
              <button onClick={() => setPickerOpen(true)}
                className="flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-[#FF5A1F]/30 bg-[#FF5A1F]/5 text-xs font-medium text-[#FF5A1F] hover:bg-[#FF5A1F]/10 hover:border-[#FF5A1F]/50 transition-all cursor-pointer">
                <Image className="h-4 w-4" /> Chọn ảnh
              </button>
            )}
          </div>
        </div>

        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Mô tả chỉnh sửa bạn muốn áp dụng lên ảnh..."
          rows={4} maxLength={2000}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-[#FF5A1F]/30 transition-all placeholder:text-slate-700 resize-none font-medium leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <EnhancePromptButton
            prompt={prompt}
            context={{ surface: 'image', skill_id: 'image-editing' }}
            onApply={setPrompt}
          />
          <span className="text-[10px] text-slate-600">{prompt.length}/2000</span>
        </div>

        {!generating && (
          <PricePreview
            priceData={priceData}
            loading={priceLoading}
            error={priceError}
            quantity={1}
          />
        )}
        <button onClick={handleGenerate} disabled={generating || daemonOk === false}
          className="w-full h-12 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm transition-all disabled:opacity-50 shadow-sm shadow-[#FF5A1F]/20 flex items-center justify-center gap-2 cursor-pointer">
          {generating ? (
            <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Đang xử lý...</>
          ) : (
            <><Wand2 className="h-4 w-4" />{referencePreviews.length > 0 ? 'Chỉnh sửa ảnh' : 'Tạo ảnh'}</>
          )}
        </button>
      </div>

      <ReferencePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
        acceptTypes="image/*"
        maxSizeMB={16}
        featureLabel="Ảnh tham chiếu"
        canUpload={canUpload}
        multiSelect
      />
    </div>
  );
}
