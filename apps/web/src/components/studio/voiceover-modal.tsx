'use client';

import { useState } from 'react';
import { X, Mic, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { laravel } from '@/lib/api/client';
import { VoiceSelector } from '@/components/studio/voice-selector';

interface VoiceoverModalProps {
  open: boolean;
  onClose: () => void;
  storyboardUuid: string;
  defaultText: string;
  onSuccess: (url: string) => void;
}

export function VoiceoverModal({ open, onClose, storyboardUuid, defaultText, onSuccess }: VoiceoverModalProps) {
  const [voice, setVoice] = useState('');
  const [text, setText] = useState(defaultText);
  const [loading, setLoading] = useState(false);
  const [usable, setUsable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!usable) { setError('Chưa cấu hình giọng đọc. Vui lòng liên hệ quản trị viên.'); return; }
    if (!voice) { setError('Vui lòng chọn giọng đọc'); return; }
    if (!text.trim()) { setError('Vui lòng nhập nội dung thuyết minh'); return; }
    setError(null);
    setLoading(true);
    try {
      const result = await laravel.addVoiceover(storyboardUuid, { voice, voiceover_text: text.trim() });
      onSuccess(result.output_url);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#16141a]/80 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="relative z-10 w-full max-w-[480px] bg-[#1f1c25] border border-white/12 rounded-2xl overflow-hidden p-6 flex flex-col gap-5 text-left shadow-[0_0_80px_rgba(0,0,0,0.8)]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/12 flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center">
            <Mic className="h-4 w-4 text-[#FF5A1F]" />
          </div>
          <h2 className="text-base font-bold text-white">Thêm giọng đọc</h2>
        </div>

        <VoiceSelector value={voice} onChange={setVoice} onUsableChange={setUsable} />

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-slate-500">Nội dung thuyết minh</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full bg-[#16141a]/30 border border-white/12 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-400 outline-none resize-none focus:border-[#FF5A1F]/30 transition-all"
            placeholder="Nhập nội dung thuyết minh..."
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !usable}
          className="w-full h-11 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6B35] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          {loading ? 'Đang tạo...' : 'Tạo giọng đọc'}
        </button>
      </motion.div>
    </div>
  );
}
