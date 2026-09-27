# StudyStreak MY

StudyStreak MY is an Expo React Native study app for Malaysian secondary-school Sejarah revision.

It includes:

- Form 1-5 chapter learning paths
- Chapter quizzes with progress locking
- Homework task tracking
- Daily study streaks
- English, Bahasa Melayu, and Chinese app language settings
- Supabase Auth and account profile storage
- Optional Gemini-powered AI summaries and chapter Q&A through a Supabase Edge Function

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

3. Run `supabase-setup.sql` in the Supabase SQL editor.

4. Deploy the Supabase Edge Functions and set secrets:

```text
GEMINI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

5. Start Expo:

```bash
npm start
```

## Store Notes

Before store submission, host the privacy policy and terms, then update the constants in `App.tsx` if the URLs change.

This is an independent study aid. It is not an official KPM, DBP, Apple, Google, or Supabase product.
