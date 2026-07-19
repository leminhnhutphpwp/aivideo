'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Palette, Wand2, Film, Info, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { daemon, laravel } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useDaemonStore, initDaemonCheck } from '@/stores/daemon-store';
import { useToastStore } from '@/stores/toast-store';
import { t } from '@/lib/i18n';
import { RichSelect, type OptionDef } from '@/components/studio/rich-select';
import { sortSkillsByPopularity } from '@/components/studio/options';
import { PreviewBox } from '@/components/studio/preview-box';
import { PricePreview } from '@/components/studio/price-preview';
import { EnhancePromptButton } from '@/components/studio/enhance-prompt-button';

const ASPECTS = ['1:1', '4:3', '16:9', '9:16'];

const FALLBACK_ICON_MAP: Record<string, React.ElementType> = {
  cinematic: Film, realistic: ImageIcon, anime: Film,
  'oil-painting': Palette, minimalist: Palette, none: Palette,
  'product-visuals': ImageIcon, 'poster-campaigns': Film,
  'portraits-characters': ImageIcon, 'scenes-illustrations': ImageIcon,
  'ui-mockups': ImageIcon, 'branding-packaging': ImageIcon,
  infographics: ImageIcon, 'typography-text': ImageIcon,
};

export default function ImageStudioPage() {
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const daemonOk = useDaemonStore(s => s.ok);
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState('1:1');
  const [style, setStyle] = useState('none');
  const [styleOptions, setStyleOptions] = useState<OptionDef[]>([]);
  const [generating, setGenerating] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);

  // Lock body scroll while the example popup is open — released on every close
  // path (X, backdrop, copy, unmount), not just the ones that reset it manually.
  useEffect(() => {
    if (!exampleOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [exampleOpen]);
  const [priceData, setPriceData] = useState<any>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const priceAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    initDaemonCheck();
    // Load skills + popularity stats together (one stats call, no N+1). Stats are
    // JWT-only (studio is authenticated); if they fail we keep the default order.
    Promise.all([
      daemon.skills(),
      daemon.skillsStats().catch(() => ({})),
    ]).then(([data, stats]: [any, any]) => {
      const dirs = data.image_directions || [];
      if (dirs.length > 0) {
        let options: OptionDef[] = dirs
          .map((d: any) => ({
            value: d.id,
            label: d.label,
            desc: d.desc || '',
            suitableFor: (d.whenToUse || []).join(', ') || d.desc?.slice(0, 40) || '',
            icon: FALLBACK_ICON_MAP[d.id] || ImageIcon,
            examplePrompt: d.examplePrompt || '',
            examplePromptVi: d.examplePromptVi || '',
          }));
        // Surface the most-used / most-liked skills first; "none" stays pinned first.
        options = sortSkillsByPopularity(options, stats, (o) => o.value, 'start');
        setStyleOptions(options);
        // Ensure the selected style exists in options, otherwise pick the first one
        if (options.length > 0 && !options.find(o => o.value === style)) {
          setStyle(options[0].value);
        }
      }
    }).catch(() => { });
  }, []);

  // Price calculation on mount (images are flat fee, no duration/quantity variance)
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
      video_type: 'image_generation',
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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      addToast('Vui lòng nhập mô tả hình ảnh', 'warning');
      return;
    }
    setGenerating(true);
    try {
      const project = await daemon.createProject({ name: prompt.trim().slice(0, 60), surface: 'image', skillId: style });
      await daemon.generate(project.id, {
        capability: 't2i', prompt: prompt.trim(), surface: 'image',
        aspect, style: style || undefined,
        ...(priceData?.calculation_id ? { calculation_id: priceData.calculation_id, expected_total: priceData.pricing?.total_credits ?? priceData.total } : {}),
      });
      addToast(t('studio.sentSuccess'), 'success');
      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      addToast(err.message || t('studio.createFailed'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 pb-20 px-2 md:px-0">
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/studio" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-white">{t('studio.image')}</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">{t('studio.imageDesc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Prompt */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-[#16141a] border border-white/12 rounded-2xl p-6 space-y-4">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Mô tả</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder={t('studio.imagePlaceholder')}
              rows={8} maxLength={2000}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-[#FF5A1F]/30 transition-all placeholder:text-slate-500 resize-none font-medium leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <EnhancePromptButton
                prompt={prompt}
                context={{ surface: 'image', skill_id: style && style !== 'none' ? style : undefined }}
                onApply={setPrompt}
              />
              <span className="text-[10px] text-slate-400">{prompt.length}/2000</span>
            </div>
          </div>


        </div>

        {/* Right: Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-[#16141a] border border-white/12 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Cấu hình chung</h3>

            {/* Aspect ratio */}
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Tỷ lệ khung hình</label>
              <div className="flex flex-wrap gap-1.5">
                {ASPECTS.map(a => (
                  <button key={a} onClick={() => setAspect(a)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${aspect === a ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>{a}</button>
                ))}
              </div>
              <PreviewBox aspect={aspect} />
            </div>

            {/* Style */}
            <RichSelect label="Phong cách" value={style} onChange={setStyle}
              options={styleOptions} icon={Palette} />
            {styleOptions.find(o => o.value === style)?.examplePrompt && (
                  <button
                    onClick={() => { setExampleOpen(true); }}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-400 transition-colors -mt-1 cursor-pointer"
                  >
                    <Info className="h-3 w-3" />
                    Xem prompt mẫu
                  </button>
            )}

            {/* Credits + Generate */}
            <div className="pt-2 space-y-3">
              <PricePreview
                priceData={priceData}
                loading={priceLoading}
                error={priceError}
                quantity={1}
              />
              <button onClick={handleGenerate} disabled={!prompt.trim() || generating || daemonOk === false}
                className="w-full h-12 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm transition-all disabled:opacity-50 shadow-sm shadow-[#FF5A1F]/20 flex items-center justify-center gap-2 cursor-pointer">
                {generating ? (
                  <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />{t('studio.generating')}</>
                ) : (
                  <><Wand2 className="h-4 w-4" />{t('studio.generateImage')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Example prompt popup */}
      <AnimatePresence>
        {exampleOpen && styleOptions.find(o => o.value === style)?.examplePrompt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#16141a]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => { setExampleOpen(false); }}
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
                  <span className="text-xs font-semibold text-white">Prompt mẫu · {styleOptions.find(o => o.value === style)!.label}</span>
                </div>
                <button onClick={() => setExampleOpen(false)} className="text-slate-500 hover:text-white cursor-pointer">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5 space-y-4">
                {(() => {
                  const en = styleOptions.find(o => o.value === style)!.examplePrompt;
                  const vi = styleOptions.find(o => o.value === style)!.examplePromptVi;
                  return (
                    <>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tiếng Anh</span>
                        <p className="text-sm text-slate-300 leading-relaxed italic mt-1">
                          &ldquo;{en}&rdquo;
                        </p>
                      </div>
                      {vi && (
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tiếng Việt</span>
                          <p className="text-sm text-slate-300 leading-relaxed italic mt-1">
                            &ldquo;{vi}&rdquo;
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/12 bg-white/[0.01]">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(styleOptions.find(o => o.value === style)!.examplePrompt || '');
                    addToast('Đã sao chép (Tiếng Anh)', 'success');
                    setExampleOpen(false);
                  }}
                  className="h-9 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 text-xs font-medium border border-white/12 transition-colors cursor-pointer"
                >
                  Copy EN
                </button>
                {styleOptions.find(o => o.value === style)!.examplePromptVi && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(styleOptions.find(o => o.value === style)!.examplePromptVi || '');
                      addToast('Đã sao chép (Tiếng Việt)', 'success');
                      setExampleOpen(false);
                    }}
                    className="h-9 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium border border-cyan-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Copy className="h-3 w-3" />
                    Sao chép VI
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
