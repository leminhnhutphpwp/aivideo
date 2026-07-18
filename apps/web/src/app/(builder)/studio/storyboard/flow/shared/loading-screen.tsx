'use client';

import { motion } from 'motion/react';

interface LoadingScreenProps {
  isEditing: boolean;
  loadProgress: number;
}

export function LoadingScreen({ isEditing, loadProgress }: LoadingScreenProps) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-950">
      <div className="text-center space-y-8">
        <motion.div
          className="mx-auto w-20 h-20 relative"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="absolute inset-0 rounded-full bg-[#FF5A1F]/20 blur-xl" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5B]" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[#FF5A1F]/30"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
        <div>
          <p className="text-base font-semibold text-white">
            {isEditing ? 'Đang tải storyboard...' : 'Đang khởi tạo Builder'}
          </p>
          <p className="text-[11px] text-slate-600 mt-1">Chuẩn bị không gian làm việc</p>
        </div>
        <div className="w-56 h-1 bg-white/[0.04] rounded-full overflow-hidden mx-auto">
          <motion.div
            className="h-full bg-gradient-to-r from-[#FF5A1F]/60 to-[#FF5A1F] rounded-full"
            animate={{ width: `${loadProgress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>
    </div>
  );
}
