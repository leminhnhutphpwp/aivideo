import { forwardRef } from "react";
import { PLACEHOLDERS } from "@/constants/image-placeholders";

interface Props {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}

export const OptimizedImage = forwardRef<HTMLImageElement, Props>(function OptimizedImage(
  { src, alt, className = "", priority = false, style },
  ref
) {
  const baseName = src.split("/").pop()!;
  const placeholder = PLACEHOLDERS[baseName];
  const smSrc = src.replace("/landing/", "/landing/sm/");
  const mdSrc = src.replace("/landing/", "/landing/md/");
  const lgSrc = src.replace("/landing/", "/landing/lg/");

  return (
    <img
      ref={ref}
      src={lgSrc}
      srcSet={`${smSrc} 640w, ${mdSrc} 1024w, ${lgSrc} 1600w`}
      sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1600px"
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={placeholder ? { ...style, backgroundImage: `url(${placeholder})`, backgroundSize: "cover" } : style}
    />
  );
});
