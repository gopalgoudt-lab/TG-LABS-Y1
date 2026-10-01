'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

export default function PatientHeaderAccount() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      return onAuthStateChanged(auth, (user) => setSignedIn(!!user));
    } catch {
      setSignedIn(false);
    }
  }, []);

  return signedIn
    ? <a className="refLogin" href="/patient">My Dashboard</a>
    : <a className="refLogin" href="/auth">Login</a>;
}
