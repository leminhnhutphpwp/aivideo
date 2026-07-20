'use client';

import React, { useState, useEffect } from 'react';
import { X, Award, Eye, Lock, Users, Plus, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useScrollLock } from '@/hooks/use-scroll-lock';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetName: string;
  creditsCost: number;
  currentVisibility?: 'private' | 'sharing' | 'public';
  currentTags?: string[];
  onConfirm: (visibility: 'sharing' | 'public', tags: string[]) => void;
}

export function PublishModal({ isOpen, onClose, assetName, currentVisibility, currentTags, onConfirm }: PublishModalProps) {
  const [visibility, setVisibility] = useState<'private' | 'sharing' | 'public'>(currentVisibility || 'private');
  const [tags, setTags] = useState<string[]>(currentTags || []);
  const [tagInput, setTagInput] = useState('');

  useScrollLock(isOpen);

  useEffect(() => {
    if (currentVisibility) setVisibility(currentVisibility);
  }, [currentVisibility]);

  useEffect(() => {
    if (currentTags) setTags(currentTags);
  }, [currentTags]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const cleaned = tagInput.trim().toLowerCase().replace(/#/g, '');
    if (cleaned && !tags.includes(cleaned) && tags.length < 5) {
      setTags([...tags, cleaned]);
      setTagInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  const handlePublishSubmit = () => {
    if (visibility === 'private') {
      onConfirm('sharing', tags);
    } else {
      onConfirm(visibility, tags);
    }
    onClose();
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
        className="relative z-10 w-full max-w-[560px] bg-[#16141a]/95 border border-white/12 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden backdrop-blur-xl p-6 md:p-6 flex flex-col gap-6 text-left"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 h-9 w-9 rounded-full bg-[#16141a]/60 hover:bg-white/10 text-slate-400 hover:text-white border border-white/12 flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-mono">
            Cài đặt chia sẻ tác phẩm
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-1 line-clamp-1">
            {assetName || 'Tác phẩm không tên'}
          </h2>
        </div>

        <div className="space-y-3.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono block px-1">
            Chọn trạng thái hiển thị
          </span>

          <div className="space-y-2.5">
            {/* Private */}
            <div
              onClick={() => setVisibility('private')}
              className={cn(
                "p-4 rounded-2xl border border-white/12 bg-white/[0.01] hover:bg-white/[0.02] flex items-start gap-3.5 cursor-pointer transition-all",
                visibility === 'private' && "border-[#FF5A1F]/30 bg-[#FF5A1F]/[0.02] shadow-[0_0_15px_rgba(255,90,31,0.02)]"
              )}
            >
              <div className={cn("h-9 w-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 border border-white/12 text-slate-500", visibility === 'private' && "bg-[#FF5A1F]/15 border-[#FF5A1F]/20 text-[#FF5A1F]")}>
                <Lock className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-200">Riêng tư (Private)</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Chỉ một mình bạn có quyền xem, tải và sử dụng tài nguyên này.</p>
              </div>
            </div>

            {/* Sharing (Free) */}
            <div
              onClick={() => setVisibility('sharing')}
              className={cn(
                "p-4 rounded-2xl border border-white/12 bg-white/[0.01] hover:bg-white/[0.02] flex items-start gap-3.5 cursor-pointer transition-all",
                visibility === 'sharing' && "border-[#FF5A1F]/30 bg-[#FF5A1F]/[0.02] shadow-[0_0_15px_rgba(255,90,31,0.02)]"
              )}
            >
              <div className={cn("h-9 w-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 border border-white/12 text-slate-500", visibility === 'sharing' && "bg-[#FF5A1F]/15 border-[#FF5A1F]/20 text-[#FF5A1F]")}>
                <Eye className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-200">Chia sẻ Cộng đồng (Sharing)</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Mọi thành viên đều có quyền xem, thả tim và sử dụng làm tư liệu tham chiếu miễn phí.</p>
              </div>
            </div>

            {/* Public (Paid Buyback) */}
            <div
              onClick={() => setVisibility('public')}
              className={cn(
                "p-4 rounded-2xl border border-white/12 bg-white/[0.01] hover:bg-white/[0.02] flex items-start gap-3.5 cursor-pointer transition-all relative overflow-hidden",
                visibility === 'public' && "border-[#FF5A1F]/30 bg-[#FF5A1F]/[0.02] shadow-[0_0_15px_rgba(255,90,31,0.02)]"
              )}
            >
              <div className="absolute right-0 top-0 h-10 w-24 bg-gradient-to-br from-amber-500 to-yellow-500 text-black text-[8px] font-black uppercase tracking-wider flex items-center justify-center rotate-45 translate-x-8 translate-y-[-10px] pointer-events-none select-none shadow-sm">
                VIP ONLY
              </div>

              <div className={cn("h-9 w-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 border border-white/12 text-slate-500", visibility === 'public' && "bg-amber-500/15 border-amber-500/30 text-amber-500")}>
                <Award className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <p className="text-sm font-bold text-slate-200">Sàn Thương Mại (Public)</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Đăng lên sàn để Admin xét duyệt mua lại tác phẩm. Nếu được duyệt, bạn sẽ nhận được phần thưởng tương xứng.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tags Input */}
        {visibility !== 'private' && (
          <div className="space-y-3 animate-item-rise">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono block px-1">
              Gắn từ khóa tìm kiếm (Tối đa 5 thẻ)
            </span>
            
            <div className="p-2.5 rounded-2xl border border-white/12 bg-[#16141a] flex flex-wrap gap-2 items-center focus-within:border-[#FF5A1F]/30 transition-all min-h-[50px]">
              {tags.map((tag, idx) => (
                <span key={tag} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 font-bold uppercase tracking-wider font-mono">
                  #{tag}
                  <button onClick={() => handleRemoveTag(idx)} className="h-4 w-4 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}

              {tags.length < 5 && (
                <div className="flex-1 min-w-[100px] flex items-center relative">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Gõ tag & Enter..."
                    className="w-full h-8 bg-transparent text-xs text-slate-300 outline-none placeholder:text-slate-400 pl-1 font-medium font-mono"
                  />
                  {tagInput.trim() && (
                    <button onClick={handleAddTag} className="absolute right-1 top-1 h-6 w-6 rounded-md bg-[#FF5A1F]/10 hover:bg-[#FF5A1F]/20 text-[#FF5A1F] flex items-center justify-center transition-all cursor-pointer">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {tags.length === 5 && (
              <p className="text-[9px] text-slate-400 font-mono tracking-tight flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-slate-500 shrink-0" />
                Đã đạt giới hạn tối đa 5 thẻ từ khóa.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 h-12 rounded-xl border border-white/12 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03] text-slate-400 hover:text-white font-bold text-sm tracking-tight transition-all cursor-pointer">
            Hủy
          </button>
          <button onClick={handlePublishSubmit} className="flex-1 h-12 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-extrabold text-sm tracking-tight shadow-[0_10px_20px_rgba(255,90,31,0.15)] hover:shadow-[0_12px_24px_rgba(255,90,31,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-97">
            <Check className="h-4.5 w-4.5" />
            Lưu thay đổi
          </button>
        </div>
      </motion.div>
    </div>
  );
}
