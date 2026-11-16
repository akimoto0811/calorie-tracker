# Calorie Tracker

A small calorie and macro tracker for you and your friends. It runs in the phone browser (you can add it to your home screen), and it's invite-only.

- **Add food three ways:** scan a barcode (filled in from [Open Food Facts](https://world.openfoodfacts.org)), take a photo of the nutrition label (read by Google Gemini, then you check the numbers), or type it in.
- **Track** calories, protein, carbs and fat against daily goals, plus saturated fat, sugar, fibre and salt when the label has them.
- **History** charts for the last week, month or 3 months.
- **Shared food library:** tick "Share with the food library" when you add a food. A friend (never the person who added it) checks it in the review queue before it goes live. Your food log and goals always stay private.
- **Sign in** with Google or an emailed link. Apple sign-in shows as "coming later".

Everything runs on free plans: Supabase (database, sign-in, photo storage), Vercel (hosting) and the Gemini API free tier.

---

## Setup guide (no coding needed)

It takes about 30–45 minutes. You'll create three free accounts and copy a few values between them. Keep a notes file open to paste values into as you go.

### 1. Create the database (Supabase)

1. Go to [supabase.com](https://supabase.com) and sign up (signing in with GitHub is easiest).
2. Click **New project**. Pick any name (e.g. `calorie-tracker`), make up a database password (save it somewhere), and choose the region closest to you. Click **Create new project** and wait a minute or two.
3. In the left sidebar open **SQL Editor**, then **New query**.
4. Open [`supabase/schema.sql`](supabase/schema.sql) in this repository, click the copy button (top right of the file on GitHub), paste it into the SQL editor, and press **Run**. You should see "Success. No rows returned". (It's safe to run again later.)
5. Get your two connection values. Click the **Connect** button at the top of the page (or go to **Project Settings → API Keys**) and copy:
   - **Project URL**, looks like `https://abcdefgh.supabase.co`
   - **anon / public key** (on newer projects it's called the **publishable key** and starts with `sb_publishable_`). Either works. **Don't** use the `service_role` / secret key.

### 2. Get a Gemini key (reads label photos)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in with a Google account.
2. Click **Create API key** and copy it.

The free tier is plenty for a group of friends. If it ever runs out for the day, the app tells you and you can type the numbers in instead. The key stays on the server and is never sent to people's phones.

### 3. Put the app online (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up **with GitHub**.
2. Click **Add New… → Project**, find `calorie-tracker` in the list and click **Import**. (If you don't see it, click "Adjust GitHub App Permissions" and give Vercel access to the repository.)
3. Open **Environment Variables** and add these four, one at a time:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | the Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the Supabase anon / publishable key |
   | `AI_PROVIDER` | `gemini` |
   | `GEMINI_API_KEY` | your Gemini key |

4. Click **Deploy**. After a minute you get a web address like `https://calorie-tracker-abc.vercel.app`. Copy it.

### 4. Tell Supabase where the app lives

In Supabase, go to **Authentication → URL Configuration**:

1. Set **Site URL** to your Vercel address, e.g. `https://calorie-tracker-abc.vercel.app`
2. Under **Redirect URLs** click **Add URL** and add `https://calorie-tracker-abc.vercel.app/**` (your address followed by `/**`). Save.

### 5. Optional: better email sign-in (you can skip this)

**You can skip this step and come back later.** Email sign-in already works without it, with two limits:

- The emailed link only works in the **same browser** you requested it from (request it on your phone, open it on your phone).
- Supabase's built-in sender only sends **a few emails per hour**, so if several friends sign in by email at once, some links won't arrive.

The easy way around both is for everyone to use **Continue with Google** (step 6). If you'd still like email sign-in to work on any device and for many people, do these two parts.

**Part A: connect your own email sender.** New free Supabase projects only let you edit the email templates after you do this. [Brevo](https://www.brevo.com) is free (300 emails a day) and doesn't need your own domain:

1. Sign up at Brevo. Under **Senders, Domains & Dedicated IPs → Senders**, add and verify the email address you want sign-in emails to come from.
2. Under **SMTP & API → SMTP**, click **Generate a new SMTP key** and copy it. Note the **Login** shown on that page too.
3. In Supabase go to **Authentication → Emails → SMTP Settings** (on some projects: **Project Settings → Authentication**), switch on **Enable custom SMTP**, and fill in:
   - Sender email: the address you verified in Brevo
   - Sender name: `Calorie Tracker`
   - Host: `smtp-relay.brevo.com`, Port: `587`
   - Username: the Brevo **Login**; Password: the SMTP key
4. Save. Then under **Authentication → Rate Limits**, raise **emails sent per hour** to something like 30.

**Part B: change the sign-in email.**

1. In Supabase go to **Authentication → Emails → Templates** and open **Magic Link**.
2. Replace the whole message body with:

   ```html
   <h2>Sign in to Calorie Tracker</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Tap here to sign in</a></p>
   ```

3. Save. Then open the **Confirm signup** template (new users get that one the first time they sign in by email) and paste the exact same body there too.

### 6. Turn on "Continue with Google"

1. In Supabase go to **Authentication → Sign In / Providers → Google**. Copy the **Callback URL** shown there (looks like `https://abcdefgh.supabase.co/auth/v1/callback`). Leave this tab open.
2. In a new tab open [console.cloud.google.com](https://console.cloud.google.com). Create a project (top bar → project picker → **New project**, any name).
3. Go to **APIs & Services → OAuth consent screen** (or **Google Auth Platform → Branding**). Click **Get started**, enter an app name (e.g. "Calorie Tracker") and your email, choose **External** audience, and finish.
4. Under **Audience**, click **Publish app** so your friends can use it. (Otherwise only people you add as "test users" can sign in.) Basic sign-in doesn't need Google's review.
5. Go to **Clients** (or **APIs & Services → Credentials → Create credentials → OAuth client ID**). Choose **Web application**. Under **Authorized redirect URIs** click **Add URI** and paste the Supabase Callback URL from step 1. Click **Create**.
6. Copy the **Client ID** and **Client secret**, paste them into the Supabase Google provider page, switch **Enable** on, and save.

### 7. Sign in and invite friends

1. Open your Vercel address and sign in. **The very first person to sign in gets in automatically**, so do this before sharing the link.
2. Set your goals on the **Profile** tab.
3. To invite a friend, type their email under **Invite a friend** on the Profile tab, then send them the app's address. Anyone already in the app can invite people. Uninvited emails can't create an account.
4. On iPhone: open the app in Safari → Share → **Add to Home Screen**. On Android: Chrome menu → **Add to Home screen**.

### Updating the app later

Vercel redeploys automatically every time a change is merged into the `main` branch on GitHub. If a change includes a new `supabase/schema.sql`, run it again in the SQL editor (step 1.4).

---

## How it works (for developers)

- **Next.js 15 (App Router)** with server components and server actions, deployed on Vercel.
- **Supabase** for Postgres, auth (magic link + Google), and a private `label-photos` storage bucket. Row-level security keeps each person's log and goals private (`supabase/schema.sql`):
  - `food_logs`: only the owner can read or write.
  - `profiles`: other members can read only `id` and `display_name`; goals come from the `my_profile()` function.
  - `foods`: you see your own foods plus everything approved or pending. You can't insert or update a food as approved; only `review_food()` can approve, and it refuses if the reviewer created the food.
  - `invites` + the `handle_new_user` trigger make the app invite-only (the first account is let in).
- **Barcode scanning** uses `@zxing/browser` in the page (works on iOS Safari and Android). `/api/barcode/[code]` checks your own library first, then Open Food Facts.
- **Label photos** are resized in the browser, uploaded to Supabase Storage, then `/api/read-label` sends them to the AI. The AI provider is behind a small interface in `src/lib/ai/`:
  - `types.ts` defines `LabelReader` and the prompt
  - `gemini.ts` is the Gemini implementation (structured JSON output; fields it couldn't read clearly come back in `uncertain` and are highlighted in the form)
  - `index.ts` picks the provider from `AI_PROVIDER`. To add another, implement `LabelReader` and add a case there.
- Log entries store a copy of the nutrition values, so editing or deleting a food never changes past days.

### Run locally

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev                  # http://localhost:3000
```

Add `http://localhost:3000/**` to Supabase's Redirect URLs to sign in locally. The camera needs HTTPS on phones, so test scanning on the Vercel deployment (or use `next dev --experimental-https`).

### Checks

```bash
npm run typecheck
npm run build
```
