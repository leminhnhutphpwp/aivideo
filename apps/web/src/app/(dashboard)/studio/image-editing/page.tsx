'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Image, Wand2, Upload, Palette, Info, Copy, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { daemon, laravel } from '@/lib/api/client';
import { useDaemonStore, initDaemonCheck } from '@/stores/daemon-store';
import { useToastStore } from '@/stores/toast-store';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';
import { ReferencePicker } from '@/components/studio/reference-picker';
import { PricePreview } from '@/components/studio/price-preview';
import { EnhancePromptButton } from '@/components/studio/enhance-prompt-button';
import { RichSelect, type OptionDef } from '@/components/studio/rich-select';
import { sortSkillsByPopularity } from '@/components/studio/options';
import { PreviewBox } from '@/components/studio/preview-box';

// Only the aspect buckets the qwen-image provider maps to a real size (others fall back to
// square). Auto-detected from the uploaded photo so a landscape house / portrait old photo
// isn't squashed into 1:1.
const ASPECTS = ['1:1', '16:9', '9:16'];

const FALLBACK_ICON_MAP: Record<string, React.ElementType> = {
  cinematic: Film, realistic: Image, anime: Film,
  'oil-painting': Palette, minimalist: Palette, none: Palette,
  'phuc-che-nha-co': Image, 'cai-tao-ngoai-that': Image, 'tan-trang-noi-that': Image,
  'thiet-ke-san-vuon': Image, 'nang-cap-thien-nhien': Image, 'phuc-hoi-anh-cu': Image,
};

/** Nearest supported aspect bucket for a given pixel size (perceptual log-ratio distance). */
function closestAspect(w: number, h: number): string {
  if (!w || !h) return '1:1';
  const r = Math.log(w / h);
  const cands: [string, number][] = [['1:1', 1], ['16:9', 16 / 9], ['9:16', 9 / 16]];
  let best = '1:1';
  let bestDiff = Infinity;
  for (const [name, val] of cands) {
    const d = Math.abs(r - Math.log(val));
    if (d < bestDiff) { bestDiff = d; best = name; }
  }
  return best;
}

export default function ImageEditingPage() {
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const daemonOk = useDaemonStore(s => s.ok);
  const user = useAuthStore(s => s.user);
  const canUpload = (user as any)?.plan?.slug !== 'free';
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState('1:1');
  const [style, setStyle] = useState('none');
  const [styleOptions, setStyleOptions] = useState<OptionDef[]>([]);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [priceData, setPriceData] = useState<any>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const priceAbortRef = useRef<AbortController | null>(null);

  useEffect(() => { initDaemonCheck(); }, []);

  // Lock body scroll while the example popup is open.
  useEffect(() => {
    if (!exampleOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [exampleOpen]);

  // Load the image-direction skills (incl. the 6 restoration presets) into the style picker.
  useEffect(() => {
    Promise.all([
      daemon.skills(),
      daemon.skillsStats().catch(() => ({})),
    ]).then(([data, stats]: [any, any]) => {
      const dirs = data.image_directions || [];
      if (dirs.length > 0) {
        let options: OptionDef[] = dirs.map((d: any) => ({
          value: d.id,
          label: d.label,
          desc: d.desc || '',
          suitableFor: (d.whenToUse || []).join(', ') || d.desc?.slice(0, 40) || '',
          icon: FALLBACK_ICON_MAP[d.id] || Image,
          examplePrompt: d.examplePrompt || '',
          examplePromptVi: d.examplePromptVi || '',
        }));
        options = sortSkillsByPopularity(options, stats, (o) => o.value, 'start');
        setStyleOptions(options);
        if (options.length > 0 && !options.find(o => o.value === style)) {
          setStyle(options[0].value);
        }
      }
    }).catch(() => { });
  }, []);

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

  // Auto-match the output aspect to the first uploaded photo so restoration keeps the
  // original framing instead of being squashed into a square.
  const autoDetectAspect = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setAspect(closestAspect(img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const addImage = async (fileOrAsset: File | any) => {
    const isFirst = referenceFiles.length === 0;
    if (fileOrAsset instanceof File) {
      if (isFirst) autoDetectAspect(fileOrAsset);
      setReferenceFiles(prev => [...prev, fileOrAsset]);
      setReferencePreviews(prev => [...prev, URL.createObjectURL(fileOrAsset)]);
    } else if (fileOrAsset.id && fileOrAsset.previewUrl) {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(fileOrAsset.downloadUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const blob = await res.blob();
        const file = new File([blob], fileOrAsset.name, { type: fileOrAsset.mime || blob.type });
        if (isFirst) autoDetectAspect(file);
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

  const activeStyle = style && style !== 'none' ? style : undefined;
  const selectedOption = styleOptions.find(o => o.value === style);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      addToast('Vui lòng nhập mô tả chỉnh sửa', 'warning');
      return;
    }
    setGenerating(true);
    try {
      const hasImages = referenceFiles.length > 0;
      const project = await daemon.createProject({
        name: prompt.trim().slice(0, 60) || 'Image Edit',
        surface: 'image',
        skillId: activeStyle || 'image-editing',
      });
      const imageFilenames: string[] = [];
      for (const file of referenceFiles) {
        const uploadResult = await daemon.uploadFile(project.id, file);
        imageFilenames.push(uploadResult.filename || uploadResult.file || file.name);
      }
      await daemon.generate(project.id, {
        capability: hasImages ? 'i2i' : 't2i',
        prompt: prompt.trim(),
        surface: 'image',
        // Only pass aspect when editing a real photo — it drives the output framing.
        ...(hasImages ? { aspect } : {}),
        style: activeStyle,
        images: hasImages ? imageFilenames : undefined,
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

  const hasImages = referencePreviews.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 space-y-8 pb-20">
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/studio" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-white">Chỉnh sửa & Phục chế ảnh</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Tải ảnh, chọn phong cách (phục chế nhà, ảnh cũ…) và mô tả điều bạn muốn</p>
        </div>
      </div>

      <div className="bg-[#16141a] border border-white/12 rounded-2xl p-6 space-y-5">
        {/* Reference images */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
            <Upload className="h-3 w-3" /> Ảnh gốc (tuỳ chọn, tối đa 9 ảnh)
          </label>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Bạn có thể thêm nhiều ảnh và gọi chúng trong mô tả bằng &ldquo;image 1&rdquo;, &ldquo;image 2&rdquo;, ...
          </p>
          {referencePreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {referencePreviews.map((preview, i) => (
                <div key={preview} className="relative aspect-square max-w-[140px]">
                  <img src={preview} alt={`Ảnh ${i + 1}`}
                    className="w-full h-full rounded-xl border border-white/10 object-cover" />
                  <span className="absolute top-1.5 left-1.5 bg-[#16141a]/60 text-[10px] text-white px-1.5 py-0.5 rounded-md font-medium">
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

        {/* Style picker — includes the 6 restoration presets */}
        <div className="space-y-2">
          <RichSelect label="Phong cách" value={style} onChange={setStyle}
            options={styleOptions} icon={Palette} />
          <div className="flex items-center gap-3">
            {selectedOption?.desc && (
              <p className="text-[11px] text-slate-500 leading-snug flex-1">{selectedOption.desc}</p>
            )}
            {selectedOption?.examplePrompt && (
              <button onClick={() => setExampleOpen(true)}
                className="flex items-center gap-1 shrink-0 text-[10px] text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer">
                <Info className="h-3 w-3" /> Xem prompt mẫu
              </button>
            )}
          </div>
        </div>

        {/* Prompt */}
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Mô tả chỉnh sửa bạn muốn áp dụng lên ảnh..."
          rows={4} maxLength={2000}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-[#FF5A1F]/30 transition-all placeholder:text-slate-500 resize-none font-medium leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <EnhancePromptButton
            prompt={prompt}
            context={{ surface: 'image', skill_id: activeStyle }}
            onApply={setPrompt}
          />
          <span className="text-[10px] text-slate-400">{prompt.length}/2000</span>
        </div>

        {/* Aspect ratio — only relevant when editing a real photo */}
        {hasImages && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tỷ lệ khung hình</label>
              <span className="text-[10px] text-slate-500">Tự nhận theo ảnh gốc</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ASPECTS.map(a => (
                <button key={a} onClick={() => setAspect(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${aspect === a ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>{a}</button>
              ))}
            </div>
            <PreviewBox aspect={aspect} />
          </div>
        )}

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
            <><Wand2 className="h-4 w-4" />{hasImages ? 'Chỉnh sửa ảnh' : 'Tạo ảnh'}</>
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

      {/* Example prompt popup */}
      <AnimatePresence>
        {exampleOpen && selectedOption?.examplePrompt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#16141a]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => setExampleOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-lg bg-[#1f1c25] border border-white/12 rounded-2xl shadow-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/12">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-white">Prompt mẫu · {selectedOption.label}</span>
                </div>
                <button onClick={() => setExampleOpen(false)} className="text-slate-500 hover:text-white cursor-pointer">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5 space-y-4">
                {selectedOption.examplePromptVi && (
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tiếng Việt</span>
                    <p className="text-sm text-slate-300 leading-relaxed italic mt-1">&ldquo;{selectedOption.examplePromptVi}&rdquo;</p>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tiếng Anh</span>
                  <p className="text-sm text-slate-300 leading-relaxed italic mt-1">&ldquo;{selectedOption.examplePrompt}&rdquo;</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/12 bg-white/[0.01]">
                <button
                  onClick={() => {
                    setPrompt(selectedOption.examplePromptVi || selectedOption.examplePrompt || '');
                    addToast('Đã áp dụng prompt mẫu', 'success');
                    setExampleOpen(false);
                  }}
                  className="h-9 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium border border-cyan-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="h-3 w-3" /> Dùng prompt này
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
