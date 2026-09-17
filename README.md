# ZENTRIX 2026

> **The Kavery Engineering College (Autonomous)**  
> Mecheri, Salem District, Tamil Nadu — 636 453  
> **Event Date: 28 September 2026**
> *Phase 1: Internal College Event (CSE, IT, AI & DS)*

---

## 📌 Project Overview

**ZENTRIX 2026** is the official web application for the internal college technical and non-technical event of **The Kavery Engineering College (Autonomous)**. The portal handles public event showcases, student registrations with instant digital pass generation, secure organizer authentication, and a live administrative command center.

### Tech Stack
- **Frontend:** Pure Semantic HTML5, Vanilla CSS3 (Custom Cyberpunk Design System & Micro-animations), Vanilla JavaScript (ES6+).
- **Backend & Database:** Supabase (Managed PostgreSQL, Row-Level Security, Realtime, Triggers, Functions).
- **Authentication:** Supabase Auth (`signInWithPassword`) + PostgreSQL Role-Based Authorization table (`admin_users`).
- **Hosting & CDN:** Vercel (Static Site Deployment with Clean URLs and Security Headers).
- **External Dependencies:** Zero heavy frameworks (no React, Next.js, Angular, Vue, Tailwind, or Bootstrap).

---

## 📁 Repository Structure

```
symposium-2k26/
├── index.html              # Public homepage (Hero, countdown, 8 event cards, about, contact)
├── register.html           # 3-Step student registration wizard with live validation
├── success.html            # Registration confirmation pass & downloadable PNG receipt
├── login.html              # Administrator authentication portal
├── admin.html              # Protected administrative command center & telemetry dashboard
│
├── css/
│   ├── style.css           # Global design tokens, cyberpunk theme, ambient glow & typography
│   ├── register.css        # Step wizard, form controls, and validation alerts
│   ├── success.css         # Confirmation pass card, watermark styling & print styles
│   ├── login.css           # Admin login card & glassmorphism styling
│   ├── admin.css           # 12-column table, metrics grid, filters & modal styles
│   └── animations.css      # 60fps animations, scroll reveals, particle canvas, reduced-motion
│
├── js/
│   ├── config.js           # Supabase client singleton & configuration loader
│   ├── events.js           # Central event registry (all 8 symposium events) & homepage renderer
│   ├── app.js              # Navigation hamburger toggle, scroll effects & countdown timer
│   ├── registration.js     # Form validation, duplicate check, and Supabase insertion logic
│   ├── success.js          # Pass parameter validator & 1000x650 canvas receipt generator
│   ├── auth.js             # Supabase Auth controller, session guards & role verifier
│   ├── admin.js            # Live telemetry metrics, search, filters, modal & CSV exporter
│   └── animations.js       # Scroll reveal observer, background canvas particles & parallax
│
├── assets/
│   ├── logo.png            # The Kavery Engineering College emblem
│   └── poster.png          # Symposium official poster asset
│
├── supabase/
│   ├── schema.sql          # PostgreSQL DDL: registrations, admin_users, sequences, triggers
│   └── policies.sql        # Row Level Security (RLS) policies & SECURITY DEFINER is_admin()
│
├── vercel.json             # Vercel deployment configuration (cleanUrls, headers, rewrites)
├── .gitignore              # Git ignore rules for secrets, keys, and system files
└── README.md               # Complete setup, deployment, and testing documentation
```

---

## 🚀 Complete Step-by-Step Deployment Guide

Follow these exact steps to launch the symposium portal to production on Vercel with Supabase:

### STEP 1: Create Supabase Project
1. Visit [supabase.com](https://supabase.com) and log in or create an account.
2. Click **"New Project"**.
3. Set your project details:
   - **Name:** `symposium-2k26`
   - **Database Password:** Generate and securely save a strong database password.
   - **Region:** Southeast Asia (Singapore) or closest region to Tamil Nadu, India.
4. Click **"Create new project"** and wait ~2 minutes for provisioning to complete.

---

### STEP 2: Run `schema.sql`
1. In your Supabase project dashboard, navigate to the **SQL Editor** from the left sidebar.
2. Click **"New query"**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) from this repository, copy its entire contents, and paste them into the SQL Editor.
4. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`).
5. Confirm that the query executes with `Success. No rows returned.`.
   - *This provisions the `registrations` table, `admin_users` table, ID generation sequence, and the automatic `registration_id` trigger function.*

---

### STEP 3: Run `policies.sql`
1. Click **"New query"** in the SQL Editor.
2. Open [`supabase/policies.sql`](supabase/policies.sql) from this repository, copy its entire contents, and paste them into the SQL Editor.
3. Click **"Run"**.
4. Confirm successful execution.
   - *This enables and forces Row-Level Security (RLS) on all tables, establishes the `is_admin()` `SECURITY DEFINER` function, grants anonymous students `INSERT`-only permission, and restricts `SELECT`, `UPDATE`, and `DELETE` exclusively to verified administrators.*

---

### STEP 4: Create Admin Authentication Account
1. In Supabase, navigate to **Authentication → Users** from the left sidebar.
2. Click **"Add User"** → **"Create new user"**.
3. Enter your administrator email (e.g. `admin@kavery.edu.in`) and a secure password.
4. Click **"Create User"** and copy the generated **User UID** (UUID format).
5. Open the **SQL Editor** again and run the following SQL command to authorize this user as an administrator:
   ```sql
   INSERT INTO admin_users (id, email, role)
   VALUES ('YOUR_COPIED_USER_UID', 'admin@kavery.edu.in', 'superadmin');
   ```
6. Verify the row exists:
   ```sql
   SELECT * FROM admin_users;
   ```
   *(Only users present in both `auth.users` AND `admin_users` can access the admin dashboard).*

---

### STEP 5: Configure Supabase URL and Anon Key
1. In your Supabase project dashboard, navigate to **Project Settings → API** (or **Settings → API**).
2. Locate and copy:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **Project API Keys → `anon` `public` key** (starts with `eyJ...`)
   > ⛔ **CRITICAL SECURITY RULE:** Never copy or use the `service_role` key in frontend code. Use the **`anon`** key only.
3. Open [`js/config.js`](js/config.js) and replace the placeholder values:
   ```javascript
   const SUPABASE_URL      = (typeof window !== 'undefined' && window.SUPABASE_URL) ? window.SUPABASE_URL : 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) ? window.SUPABASE_ANON_KEY : 'eyJhbGciOi...YOUR_ANON_KEY';
   ```
4. Save the file.

---

### STEP 6: Upload Project to GitHub
1. Initialize git in the project root if not already done:
   ```bash
   git init
   git add .
   git commit -m "feat: zentrix 2026 production-ready portal"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (e.g. `symposium-2k26`).
3. Link and push your code:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/symposium-2k26.git
   git push -u origin main
   ```

---

### STEP 7: Import GitHub Repository into Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** → **"Project"**.
3. Locate your `symposium-2k26` repository and click **"Import"**.

---

### STEP 8: Configure Required Environment Variables (If Used)
- For static HTML/JS frontends, `js/config.js` provides client-side Supabase keys directly via the public anon key.
- If you use dynamic build-time script injection, you may optionally specify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the **Environment Variables** panel in Vercel.
- Framework Preset: Select **"Other"** (static site).
- Build and Output Settings: Leave default (no build command needed; output directory is root `./`).

---

### STEP 9: Deploy
1. Click the **"Deploy"** button in Vercel.
2. Vercel will process your static assets and deploy to its global edge CDN in ~15–30 seconds.
3. Once complete, Vercel will present you with your production URL (e.g. `https://symposium-2k26.vercel.app`).

---

### STEP 10: Open Deployed Website
1. Open your production Vercel URL in your web browser.
2. Verify:
   - Homepage loads with zero console errors.
   - College branding and countdown timer are active.
   - Background canvas particles drift smoothly.
   - Navigation links and mobile hamburger toggle work seamlessly.

---

### STEP 11: Test Student Registration
1. On the homepage, click **"Register Now"** on any event card (e.g., **Bug Hunters**).
2. Confirm the registration page opens with the selected event radio pre-checked.
3. Test validations:
   - Try submitting with empty fields → verify inline error messages appear.
   - Enter an invalid phone number or email → verify format rejection.
4. Fill in authentic student details:
   - **Full Name:** E.g. `Arun Kumar S`
   - **Register Number:** E.g. `610622104001`
   - **Department:** `CSE`
   - **Year:** `3rd Year`
   - **Email:** `student@kavery.edu.in`
   - **Phone:** `9876543210`
   - Accept the declaration checkbox and click **"REGISTER NOW"**.
5. Verify:
   - The button shows `Submitting...` with a loading spinner.
   - On success, the portal redirects to `success.html?regId=SYM2K26-CSE-...`.
   - The verified digital pass renders with authentic details and registration ID.
   - Click **"DOWNLOAD CONFIRMATION"** → verify high-resolution pass PNG (`SYM2K26-Pass-....png`) downloads to your machine.
6. Try registering again with the exact same Register Number and Event → confirm the system prevents duplicate entry with an alert.

---

### STEP 12: Test Admin Login
1. Navigate to `/login.html` (or `/login`).
2. Test invalid login:
   - Enter an incorrect password → verify "Invalid email or password" error banner.
3. Test unauthenticated dashboard access:
   - Try navigating directly to `/admin.html` in an Incognito window → verify immediate redirection back to `/login.html`.
4. Enter the administrator email and password created in **Step 4**.
5. Click **"LOGIN"**.
6. Verify:
   - The login button enters the verification state.
   - Role authorization against `admin_users` succeeds.
   - The browser redirects to `/admin.html`.

---

### STEP 13: Test Dashboard
1. On `admin.html`:
   - Verify the admin email and role badge (`[SUPERADMIN]` / `[ADMIN]`) appear in the navbar.
   - Verify the **TOTAL REGISTRATIONS** count and event counters accurately reflect the student registration created in Step 11.
2. Test Live Search:
   - Type the registered student's name or register number into the search bar → verify immediate real-time row filtering.
3. Test Filters:
   - Filter by Department (`CSE`) or Event (`BUG HUNTERS`) → verify matching records update.
4. Test Detail Modal & Attendance Toggle:
   - Click the "Action" button on a registration row → verify the detail modal opens with all participant data.
   - Click **"Mark Attended"** → verify status updates to `ATTENDED` in real-time.
5. Test CSV Export:
   - Click **"EXPORT CSV"** → verify a formatted RFC4180 CSV spreadsheet downloads with all 12 columns.
6. Test Logout:
   - Click **"LOGOUT"** → verify session is terminated and you are returned to `/login.html`.

---

## 🛡️ Security Architecture

| Vector | Protection Mechanism |
|---|---|
| **Database RLS** | PostgreSQL `FORCE ROW LEVEL SECURITY` applied to all tables; anonymous users can only `INSERT`. |
| **Admin Authorization** | Custom `is_admin()` `SECURITY DEFINER` function verifies the caller's `auth.uid()` against `admin_users`. |
| **Credential Safety** | Only the public `anon` key is configured in frontend code; `service_role` is **never** used. |
| **Session Protection** | Client-side `checkAuthGuard()` route guard terminates non-admin sessions and protects `admin.html`. |
| **HTTP Headers** | Configured in `vercel.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`. |

---

## 🏛️ Institution & Event Details

- **Institution:** The Kavery Engineering College (Autonomous)
- **Campus:** Kavery Knowledge Park, Mecheri, Salem District, Tamil Nadu — 636 453
- **Organizing Departments:** Computer Science & Engineering (CSE), Information Technology (IT), Artificial Intelligence & Data Science (AI & DS)
- **Event Date:** 28 September 2026

*ZENTRIX 2026 — IGNITE IDEAS. INNOVATE FUTURE.*
