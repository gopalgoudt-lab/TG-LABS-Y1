import Image from 'next/image';

type BrandLogoProps = { className?: string; priority?: boolean };

export default function BrandLogo({ className = '', priority = false }: BrandLogoProps) {
  return (
    <Image
      className={`brandLogo ${className}`.trim()}
      src="/tg-labs-logo.png"
      alt="TG Labs Diagnostics and Home Collection"
      width={1672}
      height={941}
      priority={priority}
    />
  );
}
