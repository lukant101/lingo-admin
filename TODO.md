# TODO

## Setup (blocking first run)

- Create `.env.local` (copy from `.env.example`) and set `EXPO_PUBLIC_API_URL`.
- Register a ReCAPTCHA v3 site key under the `lingo-mates` Firebase project and paste it into `RECAPTCHA_SITE_KEY` in `lib/firebase.ts` to enable App Check on web.
- Create the `lingo-admin` Firebase project in the console (only needed before `npm run deploy:web`).
- Add the admin app's web origin to the Authorized Domains list in `lingo-mates` Firebase Auth settings.

## Follow-ups

- Decide whether to port Mates' email-verification gate and role-claim handling (`admin`, `reviewer`) into `contexts/AuthContext.tsx`.
