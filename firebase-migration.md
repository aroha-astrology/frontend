# Firebase Phone OTP Migration

New project: `phoneotp-auth-deae6` (replaces `jyotish-ai-858e6`)

## Env Var Name Translation

The code uses `_AUTH_` infix naming — do NOT paste console names directly.

| Set in Vercel as | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_AUTH_API_KEY` | `AIzaSyD2DL_t825WXtELzvuy6bv_o4ZIGbhd-xs` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `phoneotp-auth-deae6.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_AUTH_PROJECT_ID` | `phoneotp-auth-deae6` |
| `NEXT_PUBLIC_FIREBASE_AUTH_APP_ID` | `1:529862190332:web:f63da3aa1c2f78dfc36379` |
| `FIREBASE_AUTH_PROJECT_ID` | `phoneotp-auth-deae6` |
| `FIREBASE_AUTH_SERVICE_ACCOUNT_JSON` | *(JSON from Firebase console → Service Accounts → Generate key)* |

## Where to Set

| Deployment | Vars needed |
|---|---|
| Frontend (app.arohaastrology.in) | All 6 above |
| Landing (arohaastrology.in) | All 6 above |
| Backend (jyotish-backend) | `FIREBASE_AUTH_PROJECT_ID` + `FIREBASE_AUTH_SERVICE_ACCOUNT_JSON` only |

## Mobile — google-services.json

Download from Firebase console → `phoneotp-auth-deae6` → Android app (`com.aroha.phoneotp`)

Replace:
- `C:\dev\aroha-astrology\mobile\google-services.json`
- `C:\dev\aroha-astrology\mobile\android\app\google-services.json`

> If app package name differs from `com.aroha.phoneotp`, add it in Firebase console → Project Settings → Your apps.

## Firebase Project Info

| Field | Value |
|---|---|
| Project ID | `phoneotp-auth-deae6` |
| Project Number | `529862190332` |
| Web App ID | `1:529862190332:web:f63da3aa1c2f78dfc36379` |
| iOS App ID | `1:529862190332:ios:e1053b2ceded8b4ec36379` |
| Android App ID | `1:529862190332:android:60b0feec5d8d1f3fc36379` |
| iOS Bundle ID | `com.aroha.phoneotp` |
| Android Package | `com.aroha.phoneotp` |

## Checklist

- [ ] Generate service account key from Firebase console
- [ ] Set 6 vars in Vercel → Frontend
- [ ] Set 6 vars in Vercel → Landing
- [ ] Set 2 vars in Vercel → Backend
- [ ] Download and replace `google-services.json` for mobile
