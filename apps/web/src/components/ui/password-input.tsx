'use client';

import { useState } from 'react';
import { Eye, EyeOff, Shuffle } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  showGenerate?: boolean;
  compact?: boolean;
  className?: string;
}

function generatePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const all = upper + lower + digits + special;
  let pw = '';
  pw += upper[Math.floor(Math.random() * upper.length)];
  pw += lower[Math.floor(Math.random() * lower.length)];
  pw += digits[Math.floor(Math.random() * digits.length)];
  pw += special[Math.floor(Math.random() * special.length)];
  for (let i = pw.length; i < 16; i++) {
    pw += all[Math.floor(Math.random() * all.length)];
  }
  return pw.split('').sort(() => Math.random() - 0.5).join('');
}

export function PasswordInput({ value, onChange, onKeyDown, placeholder, showGenerate, compact, className = '' }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const h = compact ? 'h-9' : 'h-11';
  const rounded = compact ? 'rounded-lg' : 'rounded-xl';
  const pl = compact ? 'pl-3' : 'pl-4';
  const pr = compact ? 'pr-16' : 'pr-20';
  const btnH = compact ? 'h-6 w-6' : 'h-7 w-7';
  const iconSize = compact ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <div className={`relative ${className}`}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder || '••••••••••••'}
        className={`w-full ${h} bg-[#16141a] border border-white/12 ${rounded} ${pl} ${pr} text-sm text-white outline-none focus:border-[#FF5A1F]/30 focus:bg-white/[0.02] transition-all placeholder:text-slate-500`}
      />
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {showGenerate && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onChange(generatePassword())}
            title="Tạo mật khẩu ngẫu nhiên"
            className={`${btnH} rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all`}
          >
            <Shuffle className={iconSize} />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(!show)}
          title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className={`${btnH} rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all`}
        >
          {show ? <EyeOff className={iconSize} /> : <Eye className={iconSize} />}
        </button>
      </div>
    </div>
  );
}
