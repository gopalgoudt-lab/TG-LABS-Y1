# TG Labs V6 — Deployment Ready Package

This archive is the supplied TG Labs V6 application flattened to the repository root so Vercel can find the Next.js `app/` directory.

## GitHub
Upload the **contents of this archive** to the root of your TGLABS repository. The repository root must directly contain `app/`, `package.json`, `tsconfig.json`, `next-env.d.ts`, `lib/`, `services/`, and `prisma/`.

## Vercel settings
- Framework Preset: Next.js
- Root Directory: `./`
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: default

## Environment variables
Configure the variables required by the app using `.env.example` and `.env.production.example`. Never commit real secrets.

## Important
The source application was not intentionally rewritten. The primary correction is the folder layout: the contents of `tglabs-v6-app` are now at the deployment root.
