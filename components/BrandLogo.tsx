import Image from 'next/image';

type BrandLogoProps = { className?: string; priority?: boolean };

export default function BrandLogo({ className = '', priority = false }: BrandLogoProps) {
  return (
    <Image
      className={`brandLogo ${className}`.trim()}
      src="/brand/tg-labs-logo.png"
      alt="TG Labs Diagnostics – Home Collection"
      width={1600}
      height={533}
      priority={priority}
    />
  );
}
