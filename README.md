# GymNexus Backend

Backend API for the [GymNexus frontend](https://github.com/m-talha1021/GymNexus-frontend), deployed on Vercel as serverless functions.

## Stack

- **Express** — API routes
- **Firebase Admin SDK** — talks to the same Firestore database (`gymnexus-0562`) the frontend uses, and verifies Firebase ID tokens
- **Vercel** — hosting (`api/index.js` is the serverless entry point)

## Endpoints

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Health check — `{ ok, service, firebase, time }` |
| GET | `/api/members` | Yes | List all members (newest first) |
| GET | `/api/members/:id` | Yes | One member |
| POST | `/api/members` | Yes | Create a member (`fullName`, `email`, `phone`) |
| PUT | `/api/members/:id` | Yes | Update a member |
| DELETE | `/api/members/:id` | Yes | Delete a member |

Protected routes need a Firebase ID token in the header:

```
Authorization: Bearer <idToken>
```

The frontend gets one from `auth.currentUser.getIdToken()`.

## Environment variables (Vercel)

| Variable | Required | What it is |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | Yes, for data routes | The Firebase service-account JSON for project `gymnexus-0562`, pasted as one string. Get it in Firebase Console → Project settings → Service accounts → Generate new private key. |
| `FRONTEND_URL` | No | Frontend origin allowed by CORS (defaults to any origin while unset). |

Without `FIREBASE_SERVICE_ACCOUNT`, `/api/health` still answers (`firebase: "not-configured"`) and the data routes return `503` with a clear message instead of crashing.

## Local development

```bash
npm install
cp .env.example .env   # then fill in FIREBASE_SERVICE_ACCOUNT
npm run dev            # http://localhost:3001/api/health
```

## Deploy

Pushing to `main` redeploys automatically on Vercel (project `gymnexus-backend`).
