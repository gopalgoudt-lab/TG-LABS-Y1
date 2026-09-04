'use client';
import { useState } from 'react';
import type { PublicOffer } from './PartnerOfferCard';

export default function ServiceabilityCheck({
  type,
  slug,
  offer,
  onSupported,
}: {
  type: string;
  slug: string;
  offer: PublicOffer;
  onSupported?: (pincode: string) => void;
}) {
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState('');
  const [supportedPin, setSupportedPin] = useState<string | null>(null);

  async function check() {
    setSupportedPin(null);
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setStatus('Enter a valid 6-digit pincode.');
      return;
    }

    setStatus('Checking…');
    try {
      const q = new URLSearchParams({
        pincode: pin,
        partner: offer.partner.slug,
        offer: offer.offerId,
        type,
        product: slug,
      });
      const response = await fetch(`/api/serviceability?${q}`);
      const data = await response.json();
      if (data.supported) {
        setStatus('Home collection is available.');
        setSupportedPin(pin);
      } else {
        setStatus('Home collection is not available for this selection.');
      }
    } catch {
      setStatus('Unable to check serviceability right now.');
    }
  }

  function updatePin(value: string) {
    setPin(value.replace(/\D/g, ''));
    setSupportedPin(null);
    setStatus('');
  }

  return (
    <div className="serviceCheck">
      <label>
        Pincode
        <input
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(event) => updatePin(event.target.value)}
        />
      </label>
      <button type="button" onClick={check}>Check</button>
      <span role="status">{status}</span>
      {supportedPin === pin && onSupported ? (
        <button type="button" className="btn primary" onClick={() => onSupported(pin)}>
          Add to Cart
        </button>
      ) : null}
    </div>
  );
}
