'use client';

import { useEffect } from 'react';

const PAUSE_NOTICE = 'Online payments are temporarily unavailable while TG Labs completes Razorpay verification. Please pay by cash or UPI at sample collection.';

export default function TemporaryRazorpayPause() {
  useEffect(() => {
    const enforcePause = () => {
      const choices = Array.from(document.querySelectorAll<HTMLButtonElement>('.paymentChoice'));
      const online = choices.find((button) => button.textContent?.includes('Pay Online'));
      const qr = choices.find((button) => button.textContent?.includes('QR Code / UPI'));
      const collection = choices.find((button) => button.textContent?.includes('Pay at Sample Collection'));

      for (const button of [online, qr]) {
        if (!button) continue;
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.setAttribute('title', PAUSE_NOTICE);
      }

      if (collection && !collection.classList.contains('selected')) collection.click();
    };

    enforcePause();
    const observer = new MutationObserver(enforcePause);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <>
    <div className="razorpayPauseNotice" role="status">{PAUSE_NOTICE}</div>
    <style>{`
      .razorpayPauseNotice{max-width:720px;margin:12px auto 0;padding:12px 14px;border:1px solid #ead9a7;border-radius:12px;background:#fff8df;color:#725600;font-size:13px;line-height:1.5}
      .paymentChoice:disabled{cursor:not-allowed;opacity:.5;background:#f4f6f5!important;border-color:#d7dfdc!important}
      .paymentChoice:disabled b::after{content:' · Temporarily unavailable';font-weight:600;color:#8a6a00}
    `}</style>
  </>;
}
