import Image from 'next/image';

type BrandLogoProps = { className?: string; priority?: boolean; variant?: 'default' | 'footer' };

export default function BrandLogo({ className = '', priority = false, variant = 'default' }: BrandLogoProps) {
  const isFooter = variant === 'footer';

  return (
    <Image
      className={`brandLogo ${className}`.trim()}
      src={isFooter ? '/brand/tg-labs-logo-footer.png' : '/brand/tg-labs-logo.png'}
      alt="TG Labs Diagnostics – Home Collection"
      width={1600}
      height={isFooter ? 666 : 533}
      priority={priority}
    />
  );
}
