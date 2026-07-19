import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/landing/footer";

export type LegalTocItem = {
  id: string;
  label: string;
};

export type LegalLayoutProps = {
  title: string;
  intro: string;
  effectiveDate: string;
  toc: LegalTocItem[];
  children: React.ReactNode;
};

/**
 * Shared shell for static legal pages (Terms, Privacy, Refund).
 * Server component — dark theme, readable typography, sticky table of contents.
 */
export function LegalLayout({ title, intro, effectiveDate, toc, children }: LegalLayoutProps) {
  return (
    <div className="relative min-h-screen bg-[#16141a] text-white overflow-x-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-0 left-1/4 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[140px] opacity-10 bg-[#FF5A1F]" />

      {/* Simple top bar (legal pages are outside the anchor-scroll landing nav) */}
      <header className="relative z-10 w-full border-b border-white/12">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between px-6 md:px-10 h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5B] flex items-center justify-center">
              <span className="text-white font-black text-[10px]">W</span>
            </div>
            <span className="text-sm font-bold tracking-wide text-white">Wavise Studio</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Về trang chủ
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-[1100px] mx-auto px-6 md:px-10 py-12 md:py-16">
        {/* Title block */}
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-display)] font-bold tracking-tight text-white text-3xl md:text-4xl mb-4">
            {title}
          </h1>
          <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl">{intro}</p>
          <p className="mt-4 text-xs font-mono uppercase tracking-widest text-[#FF5A1F]/80">
            Ngày hiệu lực: {effectiveDate}
          </p>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-10">
          {/* Table of contents */}
          <aside className="hidden lg:block">
            <nav className="sticky top-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                Mục lục
              </p>
              <ul className="space-y-2 border-l border-white/12">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block pl-4 -ml-px border-l border-transparent hover:border-[#FF5A1F] text-xs text-slate-400 hover:text-white transition-colors leading-snug py-0.5"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <article className="legal-content max-w-none text-slate-300">{children}</article>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/** A titled section inside a legal page. `id` must match a TOC item. */
export function LegalSection({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-10">
      <h2 className="font-[family-name:var(--font-display)] font-bold text-white text-xl md:text-2xl mb-4 flex items-baseline gap-3">
        <span className="text-[#FF5A1F] text-sm font-mono">{String(index).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="space-y-3 text-sm md:text-[15px] leading-relaxed text-slate-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_strong]:text-slate-200 [&_a]:text-[#FF5A1F] [&_a:hover]:underline">
        {children}
      </div>
    </section>
  );
}

/** Highlighted callout box for important legal notices. */
export function LegalCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-xl border border-[#FF5A1F]/25 bg-[#FF5A1F]/[0.05] px-4 py-3 text-sm text-slate-200 leading-relaxed">
      {children}
    </div>
  );
}
