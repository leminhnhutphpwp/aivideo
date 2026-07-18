"use client";

import React from "react";
import Link from "next/link";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import { useAuth } from "@/hooks/use-auth";

export function Footer() {
  const ls = useLandingSettings();
  const { isLoggedIn } = useAuth();
  return (
    <footer className="w-full bg-zinc-950 border-t border-white/[0.04] py-12 px-6 md:px-12 lg:px-20">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5B] flex items-center justify-center">
            <span className="text-white font-black text-[8px]">W</span>
          </div>
          <span className="text-sm text-slate-600 font-medium">
            {ls.footer_copyright}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Link href="/dieu-khoan-dich-vu" className="text-xs text-slate-600 hover:text-slate-400 transition-colors font-medium tracking-wide">
            Điều khoản dịch vụ
          </Link>
          <Link href="/chinh-sach-bao-mat" className="text-xs text-slate-600 hover:text-slate-400 transition-colors font-medium tracking-wide">
            Chính sách bảo mật
          </Link>
          <Link href="/chinh-sach-hoan-tien" className="text-xs text-slate-600 hover:text-slate-400 transition-colors font-medium tracking-wide">
            Hoàn tiền &amp; Credit
          </Link>
          {ls.footer_contact_url && ls.footer_contact_url !== "#" && (
            <Link href={ls.footer_contact_url} className="text-xs text-slate-600 hover:text-slate-400 transition-colors font-medium tracking-wide">
              Liên hệ
            </Link>
          )}
          <Link href={isLoggedIn ? "/studio" : "/login"} className="text-xs text-[#FF5A1F]/80 hover:text-[#FF5A1F] transition-colors font-medium tracking-wide">
            {isLoggedIn ? "Studio" : "Đăng nhập"}
          </Link>
        </div>
      </div>
    </footer>
  );
}
