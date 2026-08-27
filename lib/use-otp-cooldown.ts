'use client';

import { useEffect, useState } from 'react';

export function useOtpCooldown() {
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!cooldownUntil) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  return {
    remaining,
    coolingDown: remaining > 0,
    startCooldown: (seconds = 60) => setCooldownUntil(Date.now() + seconds * 1000),
  };
}
