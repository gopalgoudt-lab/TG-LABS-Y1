import type { ReactNode } from 'react';
import OrderSummaryLabels from '@/components/checkout/OrderSummaryLabels';
import ReceiptPricingPanel from '@/components/checkout/ReceiptPricingPanel';
import TemporaryRazorpayPause from '@/components/checkout/TemporaryRazorpayPause';

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <><TemporaryRazorpayPause />{children}<OrderSummaryLabels /><ReceiptPricingPanel /></>;
}
