'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Command } from 'lucide-react';

export function BankCard() {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="relative h-52 w-[340px] md:h-56 md:w-[380px] shrink-0 rounded-[2rem] bg-gradient-to-br from-[#ff6b3d] to-[#1e293b] p-6 text-white shadow-md overflow-hidden group"
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] group-hover:bg-white/10 transition-colors" />
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
      <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-[#16141a]/10" />

      <div className="relative flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
             <Command className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-wider italic opacity-80">vira</span>
        </div>

        <div className="space-y-4">
          <div className="text-xl md:text-2xl font-semibold tracking-[0.2em] truncate">
            3455 4562 7710 3507
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest opacity-60">Card Holder Name</span>
              <span className="text-sm font-medium">Alexander Munoz</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase tracking-widest opacity-60">Expiry Date</span>
              <span className="text-sm font-medium">02/30</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
