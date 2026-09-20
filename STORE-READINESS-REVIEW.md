# Store readiness review — StudyStreak MY

Reviewer: Chong Wei (`KCW89`), 20 Sep 2026.
This PR is a **review only**. It does not change app behaviour. Use it as the checklist between “works in Expo Go on my phone” and “can be sold on the App Store / Play Store”.

**What I reviewed:** `sawzw/final-project` on `main` as of the 16 Aug 2026 push (single commit: “Initial project commit”).

---

## Honest verdict

The **product idea is publishable**. Notes + quizzes + homework + streak + EN/BM/Chinese + Supabase auth + a Gemini edge function is a real app, not a class template.

The **binary is not publishable**. A store reviewer who tries to build this repo today will fail before they even open the app:

- no iOS bundle ID, no Android package name
- no app icon, no splash, no `eas.json`
- `app.json` has no `icon` key at all
- no hosted privacy policy
- no in-app **Delete account** (Apple 5.1.1(v) + Play)
- Profile still says this is a “prototype” that stores logins in a local JSON file
- homework, quizzes, streaks, and AI chats never leave the phone (`AsyncStorage`), so a new device looks empty
- the AI tab talks to **Google Gemini** with no consent screen

Do the P0 items first. Do not pay for store listings until `eas build` produces an installable binary with a real icon and HTTPS auth.

---

## What the app actually is

| | |
|---|---|
| Public name | **StudyStreak MY** (`app.json` `expo.name`) |
| Slug / npm name | `studystreak-my` |
| Stack | Expo 54, React Native 0.81, TypeScript, Supabase Auth, Supabase Edge Function → Gemini |
| Content | Form 1–5 Sejarah chapters in `sejarahChapters.ts` (~46 chapters, ~230 quiz prompts) |
| UI | One 4,604-line `App.tsx` (Home / Tasks / Learn / AI / Progress / Profile) |

There is **no README**. `proposal.txt` is the spec. Write a short README before you invite testers, and rewrite the in-app privacy blurb — it still describes the old local-only prototype.

---

## P0 — the project cannot produce a store binary yet

### 1. `app.json` is missing every identity field stores require

Current file has `name`, `slug`, `version`, `orientation`, and an Android adaptive-icon **background colour only**. Missing:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#f8fafc"
    },
    "ios": {
      "bundleIdentifier": "com.sawzw.studystreakmy",
      "buildNumber": "1",
      "supportsTablet": false,
      "infoPlist": {
        "NSUserTrackingUsageDescription": "Not used. Remove this key if you do not track.",
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "package": "com.sawzw.studystreakmy",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#f8fafc"
      }
    },
    "plugins": ["expo-font"],
    "extra": { "eas": { "projectId": "(from eas build:configure)" } }
  }
}
```

Pick IDs you will not change. `com.sawzw.studystreakmy` is only a suggestion — use your own reverse-DNS.

`supportsTablet` is `true` today with no tablet layout work. Either test on iPad and add iPad screenshots, or set it to `false`.

### 2. No icons, no splash, no `assets/` folder

EAS / Xcode will refuse or ship a default Expo icon. Both stores reject a default Expo icon as “template / incomplete”.

**Fix:** one 1024×1024 master → `icon.png`, Android adaptive foreground, splash. Keep the mark inside the centre 66% for Android.

### 3. No EAS production profile

Missing `eas.json`. Expo Go is not the App Store.

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build -p ios --profile production
eas build -p android --profile production
```

You need a paid Apple Developer account and a Play Console account before `eas submit` will work.

### 4. `assetBundlePatterns: ["**/*"]` will drag class files into the binary

The repo root also has `proposal.txt`, `expo-qr.html`, `expo-qr.svg`, `json-db.example.json`, `supabase-setup.sql`, `scripts/repair_sejarah_chapters.py`, and `notes/…md`.

`expo-qr.html` still encodes `exp://192.168.100.10:8082` — a home-LAN URL. Do not ship that.

**Fix:** delete `assetBundlePatterns` (Expo default is enough) or point it at `assets/*` only. Move review docs out of the app bundle. Add `expo-qr.html` / `expo-qr.svg` to `.gitignore` if they are only for class demos.

---

## P0 — privacy, children, and AI (Apple 5.1.1 / 5.1.2, Play Data safety, PDPA)

Target users in `proposal.txt` are **Form 1–5, about 13–17**. You also have email/password accounts and a Gemini tutor. That is the strict store path.

| Requirement | Status now | What to do |
|---|---|---|
| Hosted privacy policy | Missing | GitHub Pages is enough. Name **Supabase** and **Google Gemini**, say where data lives, say you do not sell data, say how to delete. Put the URL in App Store Connect, Play Console, **and** Profile. |
| Terms of use | Missing | AI answers can be wrong; say “not a substitute for the textbook / teacher”. |
| In-app account deletion | Missing | Profile only has **Log out**. Apple 5.1.1(v): a Delete account button that wipes `auth.users`, `profiles`, and any future cloud rows. The JS client **cannot** call `auth.admin.deleteUser`. Add a Supabase Edge Function that uses the service role, then clear `AsyncStorage`. |
| Privacy text in the app | Wrong | `privacyBody` in `App.tsx` still says the prototype stores login data in a local JSON file. Reviewers read this. Update it, and add a tappable policy URL. |
| AI consent before first Gemini call | Missing | Apple 5.1.2(i): a screen that names Google Gemini, says chapter text + the student’s question leave the device, Accept / No thanks. Do this before `generateGeminiChapterSummary` / `generateGeminiChatAnswer`. |
| Age rating / Kids category | Not set | Rate **12+**. Do **not** tick Kids / Designed for Families. Add “I confirm I am 13 or older” on signup (Form 1 can be 13; if you allow younger, you need a parent flow and you should not ship Gemini). |
| Play Data safety + Apple Nutrition Labels | Missing | Email, name, user content (homework, quiz answers, AI chat), cloud (Supabase), optional crash logs later. |
| PDPA (Malaysia) | Not documented | You are collecting student emails. Say who the data user is, the purpose (account + progress), and the contact email. |

### Suggested delete-account shape

1. Profile → **Delete my account** → type `DELETE` to confirm.
2. Call `supabase.functions.invoke('delete-account')`.
3. Edge Function: verify JWT, delete `profiles` row, `auth.admin.deleteUser(user.id)`.
4. Client: `supabase.auth.signOut()`, wipe `studystreak-my-json-db-v1` from AsyncStorage.
5. Add a `profiles` delete policy or do the delete only with the service role (safer).

Today `supabase-setup.sql` **revokes DELETE** on `profiles` from `authenticated`. That is fine for normal use, and it is exactly why deletion must be a privileged function.

---

## P0 — data that stores will treat as “broken account sync”

Auth lives on Supabase. Almost everything else does not.

Written only to AsyncStorage via `lib/jsonDatabase.ts`:

- homework tasks
- quiz attempts
- streak / daily activity
- AI chat transcripts
- completed-notes flags
- a local copy of the user row

`profiles` on Supabase stores name, form, language, theme, notification flag, and streak columns — but `App.tsx` updates streak **locally** and I could not find a write of `current_streak` / `last_activity_date` back to Supabase after a quiz or task.

What a reviewer (or a student with a new phone) sees: they log in, and progress is gone. That fails “app is complete” and it fails your own proposal (“students remain logged in” / cloud account).

**Fix before publish**

1. Tables (all RLS: user can only read/write their own rows): `tasks`, `quiz_attempts`, `daily_activities`, `chapter_notes_completed`, `ai_chats`.
2. After login, load those rows. After each quiz / task / streak increment, upsert.
3. Keep AsyncStorage only as an offline cache, or drop it.
4. Mirror `current_streak`, `best_streak`, `last_activity_date` on `profiles` when `recordActivity` runs.

Until this exists, do not market “cloud account” or “progress saved”.

---

## P1 — features that look finished in the UI but are not

### Notifications toggle does nothing

Profile → Study reminders is a boolean written to `profiles.notifications_enabled`. There is no `expo-notifications`, no permission prompt, no scheduled reminder.

**Fix:** either wire `expo-notifications` (and add iOS `NSUserNotifications…` / Android 13 permission + Play declaration) **or** remove the toggle so you do not have to answer “yes we send notifications” on the Data safety form.

### Homework “proof / photo” is a text field

`HomeworkTask.proofUri` is typed as a URI. `TaskFormScreen` is a plain text box: “Add image URL or file note”. Proposal §7.8 promised an optional image.

**Fix for v1:** remove `proofUri` from the UI so Play does not ask for Photos / Camera permissions you do not use.

**Fix for v2:** `expo-image-picker` + upload to Supabase Storage with a locked-down bucket. Then you must add:

- iOS `NSPhotoLibraryUsageDescription` / `NSCameraUsageDescription` (real sentences, not “need photo”)
- Android Photo/Video permission declaration (Play 2024+ policy)
- a resize + size cap (your JSON DB already has a 5 MB ceiling)

### Chinese notes are a stub

`sejarahChapters.ts` Chinese bodies often say the chapter was “整理” from the textbook folder and “如需更完整的中文解释，可在本页使用 Gemini”. That is not a third language. A Chinese-medium reviewer (or parent) will call the listing misleading if the store page says EN / BM / Chinese.

**Fix:** finish Chinese notes **or** change the store listing and the language picker to “EN / BM, Chinese via AI summary”.

### Copyright / Guideline 5.2 (intellectual property)

The file header says: “Generated from textbook-based notes” and “do not paste full textbook pages”. Bahasa Melayu notes still read like condensed textbook language (e.g. Form 1 Bab 1).

KPM / Dewan Bahasa textbooks are not yours to republish. Stores remove apps that ship curriculum text they do not own.

**Fix**

- Rewrite notes in your own words (short original summaries).
- Add a credit: “Original revision notes for the KSSM Sejarah topics. Not an official KPM / DBP publication.”
- Do not ship PDFs. `.gitignore` already has `textbooks/*.pdf` — keep it that way.
- If any paragraph is still close to the book, replace it before you upload screenshots.

### Gemini edge function is in better shape than most student projects — a few gaps

`supabase/functions/ai-tutor/index.ts` already checks JWT, caps body size, hides the API key. Good. Still missing for a public app:

- `Access-Control-Allow-Origin: *` — lock this to your app origin, or drop CORS if only the app calls it.
- No per-user rate limit (a loop on the AI tab will spend your Gemini quota).
- No output filter / “AI can be wrong” banner on the AI screen (add the banner in the app even if the model is fine).
- Store the consent timestamp (`profiles.ai_consent_at`) so you can show it to a reviewer.

### One 4,604-line `App.tsx`

Not a store reject, but you will not be able to fix review feedback quickly in a single file. Before the second store submission, split `screens/`, `lib/auth.ts`, `lib/i18n.ts`, `theme`. Reviewers sometimes ask for a small change with a 48-hour clock.

---

## P1 — smaller product bugs worth fixing before review

- Signup catch block says *“Could not open the local JSON database”* even when Supabase failed (`handleAuthSubmit`). Use the real error.
- New users who must confirm email (`!signUpData.session`) are told to check email — good. There is no “resend confirmation” button.
- No forgot-password (`supabase.auth.resetPasswordForEmail` + a deep link / https redirect). Stores do not require it, parents will.
- `notificationsEnabled` defaults to `true` on signup. If you later add push, that is consent-by-default. Default **off** until the OS permission is granted.
- `lib/supabase.ts` still constructs a client with `https://example.supabase.co` + `missing-key` when env is empty. Fail with a clear screen instead of calling a dummy host.
- No crash reporting. A white screen on first launch is an automatic reject if the reviewer hits it.
- Accessibility: tab bar uses emoji / short labels; icon-only settings FAB is `⚙` with no `accessibilityLabel`.
- `package.json` pins `"typescript": "latest"` — lock a version before a store build so EAS is reproducible.

---

## P2 — store listing pack

**Apple**

- 1024 icon; 6.7" and 6.5" iPhone screenshots (Home, Learn, Quiz result, Streak, Profile with Delete account visible).
- Privacy + support URLs.
- Age rating 12+.
- Review notes + demo account that already has one completed quiz and one homework task (so screens are not empty).
- Export compliance: HTTPS only, standard exemption.
- If `supportsTablet` stays true: iPad screenshots.

**Google Play**

- Feature graphic 1024×500; phone screenshots; IARC questionnaire.
- Data safety matching the code (and matching the privacy page).
- Target API: Expo 54 / EAS production is fine. Do not upload an Expo-Go-derived debug APK.
- Short / full description that does **not** claim “official Sejarah textbook” or “guarantees SPM marks”.

**Listing copy you can start from**

> StudyStreak MY helps Malaysian secondary students revise Sejarah with short notes (Bahasa Melayu and English), chapter quizzes, homework tracking, and a daily study streak. An optional AI tutor (Google Gemini) can summarise a chapter you already opened. This is an independent study aid, not an official KPM app. AI answers can be wrong — check your textbook.

---

## Suggested three-week order

**Week 1 — identity + legal**

1. `assets/` icons and splash. Fill in `app.json` IDs. Add `eas.json`.
2. Hosted privacy policy + terms. Name Supabase and Gemini.
3. Profile: Privacy / Terms links + Delete account (edge function).
4. AI consent screen. Age checkbox (13+). Fix the in-app privacy blurb.
5. Remove proof-URI field and the dead notification toggle, **or** implement them properly.

**Week 2 — make the account real**

6. Supabase tables + RLS for tasks, attempts, streaks, chats.
7. Load/save after login so a second device matches the first.
8. Rewrite leftover textbook-close notes; finish or demote Chinese.
9. Rate-limit the edge function. Drop `**/*` asset bundling. Delete LAN QR files from the shipping tree.

**Week 3 — build and submit**

10. Preview build on a real iPhone and a real Android.
11. Screenshots + demo account with data.
12. `eas submit`. Watch Data safety / Privacy labels so they match the code.

---

## What is already in good shape

Keep these — they are why this project is closer than a typical class repo:

- Real product name and a written proposal.
- Supabase Auth with 8–128 char passwords, email check, and no password stored in AsyncStorage (legacy passwords are stripped in `normalizeAppData`).
- `profiles` RLS is correctly locked to `auth.uid()`.
- Gemini key is **not** in the app (`.env.example` says this explicitly; the edge function reads `GEMINI_API_KEY`).
- Edge function authenticates the user before calling Google.
- Streak rules (one count per day, opening the app does not count) are implemented in code, not only in the proposal.
- Expo SDK 54 is new enough for 2026 store targets.

The gap is **store identity, privacy/deletion, cloud progress, and copyright-clean notes** — not “learn more React Native”.
