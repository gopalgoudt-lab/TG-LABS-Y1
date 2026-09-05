import type { ReactNode } from 'react';
import OrderSummaryLabels from '@/components/checkout/OrderSummaryLabels';
import ReceiptPricingPanel from '@/components/checkout/ReceiptPricingPanel';

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <>{children}<OrderSummaryLabels /><ReceiptPricingPanel /></>;
}
