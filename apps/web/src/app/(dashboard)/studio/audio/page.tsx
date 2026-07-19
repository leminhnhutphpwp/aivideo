'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Music, Mic, Wand2, Clock, Lock, Crown } from 'lucide-react';
import { daemon } from '@/lib/api/client';
import { useDaemonStore, initDaemonCheck } from '@/stores/daemon-store';
import { useToastStore } from '@/stores/toast-store';
import { t } from '@/lib/i18n';
import { VoiceSelector } from '@/components/studio/voice-selector';
import { useAuthStore } from '@/stores/auth-store';

export default function AudioStudioPage() {
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const daemonOk = useDaemonStore(s => s.ok);
  const user = useAuthStore(s => s.user);
  const plan = (user as any)?.plan;
  const hasAudio = Boolean(plan?.audio_generation);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(15);
  const [voiceId, setVoiceId] = useState('');
  const [voiceoverText, setVoiceoverText] = useState('');
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { initDaemonCheck(); }, []);

  if (!hasAudio) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-0 space-y-8 pb-20">
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/studio" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-white">{t('studio.audio')}</h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">{t('studio.audioDesc')}</p>
          </div>
        </div>
        <div className="relative flex flex-col items-center justify-center py-16 md:py-24 px-4 md:px-6 rounded-2xl bg-gradient-to-b from-[#0c0c0c] to-[#080808] border border-white/12 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#FF5A1F]/5 blur-[100px] pointer-events-none" />
          <div className="relative flex flex-col items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#FF5A1F]/20 to-[#FF8A5B]/10 border border-[#FF5A1F]/20 flex items-center justify-center shadow-sm shadow-[#FF5A1F]/10">
              <Lock className="h-10 w-10 text-[#FF5A1F]" />
            </div>
            <div className="text-center space-y-3 max-w-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20">
                <Crown className="h-3 w-3 text-[#FF5A1F]" />
                <span className="text-[9px] font-bold text-[#FF5A1F] uppercase tracking-wider">Pro</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Tính năng yêu cầu nâng cấp</h2>
              <p className="text-sm text-slate-500 leading-relaxed">Gói Free chưa hỗ trợ tạo âm thanh và giọng đọc AI. Nâng cấp lên Pro để mở khóa toàn bộ tính năng.</p>
            </div>
            <Link href="/billing">
              <button className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#FF6A2B] text-white font-bold text-sm shadow-sm shadow-[#FF5A1F]/20 hover:shadow-[#FF5A1F]/30 transition-all flex items-center gap-2 cursor-pointer">
                <Crown className="h-4 w-4" /> Nâng cấp ngay
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!prompt.trim() && !voiceoverText.trim()) {
      addToast('Vui lòng nhập mô tả âm thanh hoặc nội dung thuyết minh', 'warning');
      return;
    }
    setGenerating(true);
    try {
      const project = await daemon.createProject({ name: prompt.trim().slice(0, 60) || voiceoverText.trim().slice(0, 60), surface: 'audio' });
      await daemon.generate(project.id, {
        capability: 't2a', prompt: prompt.trim() || voiceoverText.trim(), surface: 'audio',
        duration,
        ...(voiceoverEnabled && voiceId ? { voice: voiceId, voiceover: voiceoverText || undefined } : {}),
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
    <div className="max-w-4xl mx-auto px-4 md:px-0 space-y-8 pb-20">
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/studio" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-white">{t('studio.audio')}</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">{t('studio.audioDesc')}</p>
        </div>
      </div>

      <div className="bg-[#16141a] border border-white/12 rounded-2xl p-6 space-y-5">
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder={t('studio.audioPlaceholder')}
          rows={3} maxLength={2000}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-[#FF5A1F]/30 transition-all placeholder:text-slate-500 resize-none font-medium leading-relaxed"
        />

        <div className="space-y-3">
          <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
            <Clock className="h-3 w-3" /> {t('studio.duration')}
          </label>
          <div className="flex items-center gap-3">
            <input type="range" min={5} max={60} step={1} value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#FF5A1F]"
            />
            <span className="text-sm font-semibold text-white w-12 text-right">{duration}s</span>
          </div>
          <div className="flex gap-1.5">
            {[5, 10, 15, 30, 45, 60].map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${duration === d ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>{d}s</button>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/12 rounded-xl overflow-hidden">
          <button onClick={() => setVoiceoverEnabled(!voiceoverEnabled)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.02] transition-all cursor-pointer">
            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Mic className="h-3 w-3" /> Thuyết minh
            </span>
            <div className={`h-4 w-7 rounded-full transition-colors ${voiceoverEnabled ? 'bg-[#FF5A1F]' : 'bg-white/10'}`}>
              <div className={`h-3.5 w-3.5 rounded-full bg-white transition-transform ${voiceoverEnabled ? 'translate-x-3.5' : 'translate-x-0.5'} mt-0.25`} />
            </div>
          </button>
          {voiceoverEnabled && (
            <div className="px-3 pb-3 space-y-3">
              <VoiceSelector value={voiceId} onChange={setVoiceId} />
              <textarea value={voiceoverText} onChange={e => setVoiceoverText(e.target.value)}
                placeholder="Nội dung thuyết minh..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-[#FF5A1F]/30 transition-all placeholder:text-slate-500 resize-none"
              />
            </div>
          )}
        </div>

        <button onClick={handleGenerate} disabled={(!prompt.trim() && !voiceoverText.trim()) || generating || daemonOk === false}
          className="w-full h-12 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm transition-all disabled:opacity-50 shadow-sm shadow-[#FF5A1F]/20 flex items-center justify-center gap-2 cursor-pointer">
          {generating ? (
            <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />{t('studio.generating')}</>
          ) : (
            <><Wand2 className="h-4 w-4" />{t('studio.generateAudio')}</>
          )}
        </button>
      </div>
    </div>
  );
}
