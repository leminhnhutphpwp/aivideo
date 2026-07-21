'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Pause, Mic, Music, Type, AlertCircle } from 'lucide-react';
import { daemon } from '@/lib/api/client';
import { CustomSelect } from '@/components/ui/select';

interface Voice {
  voiceId: string;
  name: string;
  provider?: string;
  category?: string;
  labels?: Record<string, string>;
  previewUrl?: string;
}

type ProviderType = 'default' | 'elevenlabs';
type VoiceType = 'tts' | 'sfx';

export function VoiceSelector({ value, onChange, onUsableChange }: { value: string; onChange: (v: string) => void; onUsableChange?: (usable: boolean) => void }) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [provider, setProvider] = useState<ProviderType>('default');
  const [voiceType, setVoiceType] = useState<VoiceType>('tts');
  const [accent, setAccent] = useState('');
  const [gender, setGender] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setLoading(true);
    if (provider === 'elevenlabs') {
      // ElevenLabs voices are fetched live from the provider — an empty list means it's
      // not configured/reachable, so treat empty as "not usable".
      daemon.voicesElevenLabs()
        .then((data: any) => { const list = data.voices || []; setVoices(list); setAvailable(list.length > 0); })
        .catch(() => { setVoices([]); setAvailable(false); })
        .finally(() => setLoading(false));
    } else {
      // Default provider ships a static voice list; the daemon's `available` flag tells us
      // whether the underlying TTS provider actually has credentials. Missing flag (older
      // daemon) ⇒ assume available to avoid false warnings.
      daemon.voices()
        .then((data: any) => { setVoices(data.voices || []); setAvailable(data.available !== false); })
        .catch(() => { setVoices([]); setAvailable(false); })
        .finally(() => setLoading(false));
    }
  }, [provider]);

  useEffect(() => {
    if (!loading) onUsableChange?.(available);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, loading]);

  // Stop any in-flight preview and free its blob URL when the selector unmounts.
  useEffect(() => () => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      if (el.src) URL.revokeObjectURL(el.src);
    }
  }, []);

  const filtered = voices.filter(v => {
    if (accent && v.labels?.accent?.toLowerCase() !== accent.toLowerCase()) return false;
    if (gender && v.labels?.gender?.toLowerCase() !== gender.toLowerCase()) return false;
    if (provider === 'elevenlabs' && voiceType === 'sfx' && v.category !== 'sound_effects') return false;
    if (provider === 'elevenlabs' && voiceType === 'tts' && v.category === 'sound_effects') return false;
    return true;
  });

  const accents = [...new Set(voices.map(v => v.labels?.accent).filter(Boolean))] as string[];
  const genders = [...new Set(voices.map(v => v.labels?.gender).filter(Boolean))] as string[];

  const handlePreview = async (voiceId: string) => {
    if (playing === voiceId) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    try {
      const url = await daemon.ttsPreview(voiceId);
      const audio = new Audio(url);
      audio.onended = () => { setPlaying(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlaying(null); URL.revokeObjectURL(url); };
      audio.play().catch(() => setPlaying(null));
      audioRef.current = audio;
      setPlaying(voiceId);
    } catch {
      setPlaying(null);
    }
  };

  const selected = voices.find(v => v.voiceId === value);

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
        <Mic className="h-3 w-3" /> Tùy chọn giọng đọc
      </label>

      {!loading && !available && (
        <div className="flex items-start gap-2 text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-lg px-2.5 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" />
          <span>Chưa có giọng đọc khả dụng. Vui lòng cấu hình nhà cung cấp giọng đọc trong trang quản trị trước khi tạo.</span>
        </div>
      )}

      {/* Provider & Voice Type row */}
      <div className="flex gap-1.5">
        <CustomSelect
          value={provider}
          onChange={(v) => { setProvider(v as ProviderType); setAccent(''); setGender(''); onChange(''); }}
          options={[
            { value: 'default', label: 'Mặc định' },
            { value: 'elevenlabs', label: 'ElevenLabs' },
          ]}
          className="flex-1"
        />
        {provider === 'elevenlabs' && (
          <CustomSelect
            value={voiceType}
            onChange={(v) => { setVoiceType(v as VoiceType); setAccent(''); setGender(''); }}
            options={[
              { value: 'tts', label: 'Giọng đọc' },
              { value: 'sfx', label: 'Hiệu ứng' },
            ]}
            className="flex-1"
          />
        )}
      </div>

      {/* Accent & Gender filters */}
      {(accents.length > 1 || genders.length > 1) && (
        <div className="flex gap-1.5">
          {accents.length > 1 && (
            <CustomSelect
              value={accent}
              onChange={setAccent}
              options={[
                { value: '', label: 'Vùng miền' },
                ...accents.map(a => ({ value: a, label: a }))
              ]}
              className="flex-1"
            />
          )}
          {genders.length > 1 && (
            <CustomSelect
              value={gender}
              onChange={setGender}
              options={[
                { value: '', label: 'Giới tính' },
                ...genders.map(g => ({ value: g, label: g === 'female' ? 'Nữ' : g === 'male' ? 'Nam' : g }))
              ]}
              className="flex-1"
            />
          )}
        </div>
      )}

      {/* Current selection summary — non-interactive; the list below is the actual picker. */}
      <div className="relative">
        <div className="w-full h-9 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 text-left">
          <Volume2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="flex-1 text-[11px] text-white truncate">
            {loading ? 'Đang tải...' : selected ? selected.name : 'Chọn giọng...'}
          </span>
        </div>
      </div>

      {/* Voice list */}
      <div className="max-h-40 overflow-y-auto space-y-0.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
        {filtered.map(v => (
          <button key={v.voiceId} onClick={() => onChange(v.voiceId)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${value === v.voiceId ? 'bg-[#FF5A1F]/10 border border-[#FF5A1F]/20' : 'hover:bg-white/5 border border-transparent'}`}>
            <div onClick={e => { e.stopPropagation(); handlePreview(v.voiceId); }}
              className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all shrink-0 cursor-pointer">
              {playing === v.voiceId ? (
                <div className="flex items-end gap-[2px] h-3">
                  <div className="w-[2.5px] bg-[#FF5A1F] rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0s' }} />
                  <div className="w-[2.5px] bg-[#FF5A1F] rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                  <div className="w-[2.5px] bg-[#FF5A1F] rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.3s' }} />
                  <div className="w-[2.5px] bg-[#FF5A1F] rounded-full animate-pulse" style={{ height: '80%', animationDelay: '0.1s' }} />
                </div>
              ) : <Play className="h-3 w-3 text-slate-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-white truncate">{v.name}</div>
              <div className="flex items-center gap-2 text-[9px] text-slate-500">
                {v.labels?.gender && <span>{v.labels.gender === 'female' ? 'Nữ' : 'Nam'}</span>}
                {v.labels?.accent && <span>{v.labels.accent}</span>}
                {v.provider && <span className="text-[8px] px-1 rounded bg-white/5">{v.provider}</span>}
                {v.category && <span className="text-[8px] px-1 rounded bg-[#FF5A1F]/10 text-[#FF5A1F]">{v.category === 'sound_effects' ? 'SFX' : 'TTS'}</span>}
              </div>
            </div>
          </button>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-[10px] text-slate-400 text-center py-3">Không tìm thấy giọng phù hợp</p>
        )}
      </div>
    </div>
  );
}
