import { FAQ_ITEMS } from "./faq-data";

/**
 * Server-rendered FAQ. Uses native <details>/<summary> so it is fully
 * accessible and expandable without client JS, and its content is crawlable in
 * the initial HTML. The matching FAQPage JSON-LD is emitted alongside so search
 * engines and AI assistants read exactly what the user sees.
 */
export function FaqSection() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="relative w-full bg-[#030305] py-24 lg:py-32 px-6 md:px-12 lg:px-20 overflow-hidden"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FF5A1F] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
            Câu hỏi thường gặp
          </span>
          <h2
            id="faq-heading"
            className="font-[family-name:var(--font-display)] font-black text-white tracking-tight leading-tight"
            style={{ fontSize: "clamp(28px, 4vw, 52px)" }}
          >
            Giải đáp về Wavise Studio
          </h2>
          <p className="mt-4 text-slate-400 text-base md:text-lg font-light">
            Những điều cần biết trước khi bắt đầu tạo video AI đầu tiên của bạn.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item, idx) => (
            <details
              key={idx}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 transition-colors hover:border-white/15 open:border-[#FF5A1F]/30 open:bg-white/[0.03]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-white font-semibold text-base md:text-lg [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-[#FF5A1F] text-2xl leading-none transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 text-slate-400 leading-[1.7] font-light">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
