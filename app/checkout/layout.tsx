import type { ReactNode } from 'react';
import OrderSummaryLabels from '@/components/checkout/OrderSummaryLabels';

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <>{children}<OrderSummaryLabels /></>;
}
