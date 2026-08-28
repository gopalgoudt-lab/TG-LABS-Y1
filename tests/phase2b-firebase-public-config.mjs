const NAMES = Object.freeze({
  apiKey: 'PHASE2B_FIREBASE_PUBLIC_API_KEY',
  authDomain: 'PHASE2B_FIREBASE_PUBLIC_AUTH_DOMAIN',
  projectId: 'PHASE2B_FIREBASE_PUBLIC_PROJECT_ID',
  appId: 'PHASE2B_FIREBASE_PUBLIC_APP_ID',
});

export function phase2bFirebasePublicConfig(environment = process.env) {
  const config = Object.fromEntries(
    Object.entries(NAMES).map(([key, name]) => {
      const value = environment[name]?.trim();
      if (!value) throw new Error(`Missing required public configuration variable: ${name}`);
      return [key, value];
    }),
  );

  if (!/^[a-z][a-z0-9-]{4,29}$/.test(config.projectId)) {
    throw new Error('Phase 2B Firebase public project ID is invalid.');
  }
  if (![`${config.projectId}.firebaseapp.com`, `${config.projectId}.web.app`].includes(config.authDomain)) {
    throw new Error('Phase 2B Firebase public auth domain does not match the configured project.');
  }

  return config;
}
