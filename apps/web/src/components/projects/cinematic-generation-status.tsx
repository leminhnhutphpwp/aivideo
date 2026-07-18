'use client';

import { useState, useEffect, useRef } from 'react';
import { Zap, Sparkles, Cpu, Loader2, Play, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface GenerationStatusProps {
  status: 'queued' | 'running' | 'done' | 'failed' | 'interrupted';
  prompt?: string;
  elapsedSeconds: number;
  progress?: string[];
  onViewResult?: () => void;
  hasOutput?: boolean;
}

function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#FF5A1F]/40"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: '-10%',
          }}
          animate={{
            y: [0, -Math.random() * 400 - 100],
            x: [0, (Math.random() - 0.5) * 60],
            opacity: [0, 0.8, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            ease: 'easeOut',
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
}

function OrbPulse({ status }: { status: string }) {
  const isActive = status === 'queued' || status === 'running';
  const isDone = status === 'done';

  return (
    <div className="relative flex items-center justify-center h-12 w-12 md:h-16 md:w-16">
      {isDone && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-emerald-500/10"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <div className={cn(
        "absolute inset-0 rounded-2xl border transition-colors duration-500",
        isActive && "border-[#FF5A1F]/20 bg-[#FF5A1F]/5",
        isDone && "border-emerald-500/20 bg-emerald-500/5",
        !isActive && !isDone && "border-white/5 bg-white/5"
      )} />
      {isActive ? (
        <Loader2 className="h-6 w-6 text-[#FF5A1F] animate-spin" />
      ) : isDone ? (
        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
      ) : (
        <Cpu className="h-6 w-6 text-slate-500" />
      )}
    </div>
  );
}

function ElapsedTimer({ seconds, active }: { seconds: number; active: boolean }) {
  if (!active) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return (
    <motion.div
      key={seconds}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-sm font-mono text-slate-400"
    >
      <motion.div
        className="h-2 w-2 rounded-full bg-[#FF5A1F]"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
      <span>
        {mins > 0 && `${mins}m `}{secs.toString().padStart(2, '0')}s
      </span>
    </motion.div>
  );
}

function ProgressStream({ messages, active }: { messages?: string[]; active: boolean }) {
  if (!messages || messages.length === 0) return null;
  
  return (
    <div className="space-y-1.5">
      <AnimatePresence mode="popLayout">
        {messages.slice(-4).map((msg, i) => (
          <motion.p
            key={`${msg}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "text-xs flex items-center gap-2",
              i === messages.slice(-4).length - 1 && active
                ? "text-slate-300"
                : "text-slate-600"
            )}
          >
            <motion.span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              animate={i === messages.slice(-4).length - 1 && active ? {
                backgroundColor: ['#FF5A1F', '#ff8a5b', '#FF5A1F'],
              } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ backgroundColor: i === messages.slice(-4).length - 1 ? '#FF5A1F' : '#475569' }}
            />
            {msg}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function CinematicGenerationStatus({
  status,
  prompt,
  elapsedSeconds,
  progress,
  onViewResult,
  hasOutput,
}: GenerationStatusProps) {
  const isActive = status === 'queued' || status === 'running';
  const [displayPrompt, setDisplayPrompt] = useState('');
  const promptIndex = useRef(0);

  // Typewriter effect for prompt
  useEffect(() => {
    if (!prompt || !isActive) {
      setDisplayPrompt(prompt || '');
      return;
    }
    promptIndex.current = 0;
    setDisplayPrompt('');
    const chars = prompt.slice(0, 100);
    const interval = setInterval(() => {
      promptIndex.current++;
      setDisplayPrompt(chars.slice(0, promptIndex.current));
      if (promptIndex.current >= chars.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [prompt, isActive]);

  const statusLabel = {
    queued: 'Đã vào hàng đợi...',
    running: 'AI đang sáng tạo...',
    done: 'Hoàn thành',
    failed: 'Thất bại',
    interrupted: 'Bị gián đoạn',
  }[status] || status;

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-700 isolate",
        isActive && "border-[#FF5A1F]/15 bg-gradient-to-br from-[#1A0F0A] via-[#0A0A0A] to-[#0A0608] shadow-[0_0_60px_rgba(255,90,31,0.06)]",
        status === 'done' && "border-emerald-500/15 bg-gradient-to-br from-[#0A1510] to-[#0A0A0A]",
        status === 'failed' && "border-red-500/10 bg-gradient-to-br from-[#150A0A] to-[#0A0A0A]",
        status === 'interrupted' && "border-orange-500/10 bg-gradient-to-br from-[#150A0A] to-[#0A0A0A]",
      )}
    >
      {/* Animated background particles when active */}
      {isActive && <ParticleField />}

      <div className="relative p-3.5 md:p-5">
        {/* Top status bar */}
        <motion.div layout className="flex items-center justify-between mb-3 md:mb-4">
          <motion.div layout className="flex items-center gap-3">
            <motion.span
              layout
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.3em] px-3 py-1.5 rounded-full transition-all duration-500",
                isActive && "bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20",
                status === 'done' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                status === 'failed' && "bg-red-500/10 text-red-400 border border-red-500/20",
                status === 'interrupted' && "bg-orange-500/10 text-orange-400 border border-orange-500/20",
              )}
            >
              {statusLabel}
            </motion.span>

            <ElapsedTimer seconds={elapsedSeconds} active={isActive} />
          </motion.div>

          {status === 'done' && hasOutput && onViewResult && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              onClick={onViewResult}
              className="h-9 px-5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Xem kết quả
            </motion.button>
          )}
        </motion.div>

        {/* Main generation visual */}
        <motion.div layout className="flex flex-row items-center gap-3 md:gap-6">
          {/* Left: Orb visual */}
          <div className="shrink-0">
            <OrbPulse status={status} />
          </div>

          {/* Right: Content */}
          <div className="flex-1 min-w-0 space-y-2.5 md:space-y-3 text-left">
            {/* Prompt display */}
            {prompt && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                  <Zap className="h-3 w-3 inline mr-1.5 text-[#FF5A1F]" />
                  Prompt
                </p>
                <motion.p
                  layout
                  className="text-[13px] md:text-base text-slate-300 leading-relaxed line-clamp-2 font-medium"
                >
                  {isActive ? displayPrompt || '...' : prompt}
                  {isActive && displayPrompt.length < (prompt?.length || 0) && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="text-[#FF5A1F] ml-0.5"
                    >
                      |
                    </motion.span>
                  )}
                </motion.p>
              </div>
            )}

            {/* Loading bar when active */}
            {isActive && (
              <div className="w-full max-w-md h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF5A1F]/0 via-[#FF5A1F] to-[#FF8A5B]/60"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            )}

            {/* Progress messages */}
            <ProgressStream messages={progress} active={isActive} />

            {/* Done state: success animation */}
            {status === 'done' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="relative"
              >
                <motion.div
                  className="absolute -inset-4 rounded-full border-2 border-emerald-500/20"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-emerald-500/10 blur-xl"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-emerald-400 font-bold flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Hoàn thành!
                </motion.p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Ambient edge glow */}
      {isActive && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF5A1F]/30 to-transparent"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}
