# Bhishi Management System — Windows Setup Guide

## What's already built in this code
- 3 Portals: **Master Admin** (`/master-admin`), **Admin** (`/admin`), **Public Viewer Website** (`/`)
- Role-based login + route protection (middleware.ts)
- Master Admin can create/remove Admin accounts (card layout)
- Members CSV/XLSX import (Master Admin > Members)
- Payments Paid/Unpaid with 12-month tabs + PDF download (Admin > Payments)
- Winners module with **no-repeat lucky draw logic** (Admin > Winners)
- Public read-only Dashboard + Members page (Viewer website)
- Supabase schema + Row Level Security policies (`supabase/schema.sql`)

## Still to build (same pattern — see "Extending" section below)
- Attendance page + PDF (Phase 1)
- Topics/Events page + PDF (Phase 2)
- Gallery upload with Cloudinary (Phase 3)
- WhatsApp/SMS API integration

---

## STEP 1 — Install requirements (Windows)

1. Install **Node.js LTS**: https://nodejs.org (download the "LTS" installer, run it, keep clicking Next)
2. Install **VS Code** (or **Cursor**, which is VS Code + AI): https://code.visualstudio.com or https://cursor.sh
3. Check installation — open **PowerShell** or **Command Prompt** and run:
   ```
   node -v
   npm -v
   ```
   Both should print a version number.

## STEP 2 — Get this project onto your machine

1. Unzip the folder you downloaded (`bhishi-system`) anywhere, e.g. `C:\Projects\bhishi-system`
2. Open PowerShell in that folder (Shift + Right-click inside the folder → "Open PowerShell window here")
3. Install dependencies:
   ```
   npm install
   ```

## STEP 3 — Create your Supabase project (free)

1. Go to https://supabase.com → Sign up → **New Project**
2. Choose a name, a strong database password (save it somewhere), and the region closest to India (e.g. Singapore/Mumbai if available)
3. Wait ~2 minutes for the project to spin up
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. Open `supabase/schema.sql` from this project, copy ALL of it, paste into the SQL editor, click **Run**
   - This creates all 7 tables + security rules in one go

## STEP 4 — Get your Supabase keys

1. In Supabase Dashboard → **Project Settings** (gear icon) → **API**
2. Copy these 3 values:
   - **Project URL**
   - **anon public** key
   - **service_role** key (⚠️ keep this secret, never share it)
3. In your project folder, copy `.env.local.example` and rename the copy to `.env.local`
4. Paste the 3 values into `.env.local`

## STEP 5 — Create your first Master Admin

Since there's no public signup (by design — only Master Admin can create accounts), create the first one manually:

1. Supabase Dashboard → **Authentication** → **Users** → **Add User** → **Create new user**
2. Enter your email + a password, tick "Auto Confirm User", click Create
3. Copy the **User UID** shown in the table
4. Go back to **SQL Editor** → New Query → run:
   ```sql
   insert into profiles (id, full_name, role)
   values ('PASTE-USER-UID-HERE', 'Your Name', 'master_admin');
   ```
5. Done — you can now log in at `/login` with that email/password as Master Admin.

## STEP 6 — Set up Cloudinary (for Gallery, free)

1. Go to https://cloudinary.com → Sign up free
2. Dashboard shows your **Cloud Name** → put it in `.env.local` as `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
3. Go to **Settings → Upload** → **Add upload preset** → set **Signing Mode = Unsigned** → name it `bhishi_unsigned` → Save
4. Put `bhishi_unsigned` in `.env.local` as `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

## STEP 7 — Run it locally

```
npm run dev
```
Open http://localhost:3000 in your browser:
- `/` → Public Viewer website
- `/login` → Admin / Master Admin login

## STEP 8 — Deploy for free (Vercel)

1. Push this project to a GitHub repo (create repo on github.com, then in PowerShell inside the project folder):
   ```
   git init
   git add .
   git commit -m "Bhishi system first commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/bhishi-system.git
   git push -u origin main
   ```
2. Go to https://vercel.com → Sign up with GitHub → **New Project** → import your repo
3. In Vercel project settings → **Environment Variables**, add the same 5 keys from your `.env.local`
4. Click **Deploy** — you'll get a live URL like `bhishi-system.vercel.app` in ~2 minutes

---

## Extending — how to add the remaining pages yourself

Every remaining page (Attendance, Events, Gallery) follows the **exact same pattern** as `payments/page.tsx` and `winners/page.tsx`:
1. A Supabase table already exists for it (`attendance`, `events`, `gallery`)
2. `"use client"` component → `createClient()` from `@/lib/supabase/client`
3. `useEffect` to load data, functions to insert/update/delete
4. Same `card`, `btn-primary`, `badge-paid`/`badge-unpaid` CSS classes are already defined in `globals.css`

Paste this into **Cursor** (open this whole project folder in Cursor first) to generate the Attendance page:

```
Looking at the existing pattern in app/admin/payments/page.tsx and app/admin/winners/page.tsx 
in this project, create app/admin/attendance/page.tsx for Phase 1: Attendance.

Requirements:
- Month tabs like Payments page (reuse the same MONTHS array pattern)
- List all members from the 'members' table for the selected month
- Two buttons per member: Present / Absent, writing to the 'attendance' table 
  (member_id, month, status) — upsert on conflict (member_id, month)
- Members with no record yet for that month should visually default to "Absent"
- Add a "Download PDF" button at the top using jsPDF + jspdf-autotable exactly like 
  in payments/page.tsx, listing Alot No, Name, and Status
- Match the existing card/badge/button Tailwind classes already used in this project

Then create a matching read-only version at app/(viewer)/attendance/page.tsx using a 
server component like app/(viewer)/members/page.tsx.
```

Use the same approach (point Cursor at existing similar files) for Events and Gallery.

## WhatsApp/SMS API (add later)
For winner announcements, sign up for the **WhatsApp Cloud API** (free 1000 conversations/month) at
https://developers.facebook.com/docs/whatsapp/cloud-api or use **MSG91** (msg91.com) for India-priced SMS.
This is a separate API route (`app/api/notify/route.ts`) that you call after adding a winner — ask me
for this code once the core system above is working and deployed.
