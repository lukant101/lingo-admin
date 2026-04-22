# Firebase Preview Deployments for Lingo Admin

Automated preview deployments using Firebase Hosting Preview Channels and Claude Code on the web.

## How It Works

1. Claude Code (web/iOS) pushes changes to the `preview` branch
2. GitHub Actions builds the Expo web app
3. Firebase deploys to a preview channel
4. You refresh a stable URL on your phone to see changes

---

## Prerequisites

- Firebase project already set up (existing Lingo House project works)
- GitHub repo for Lingo Admin
- Firebase CLI installed locally (for initial setup only)

---

## Step 1: Enable Firebase Hosting

If hosting isn't already enabled on your Firebase project:

```bash
firebase init hosting
```

Select your existing project, set `dist` as the public directory, and configure as a single-page app.

## Step 2: Create `firebase.json`

Add to your project root:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      {
        "source": "/**",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      },
      {
        "source": "**/*.@(js|css|ico|svg|png|jpg|webp|woff2)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

## Step 3: Generate Firebase Service Account

```bash
# From your local machine (one-time setup)
firebase init hosting:github
```

This will:

- Create a service account in your GCP project
- Add the `FIREBASE_SERVICE_ACCOUNT` secret to your GitHub repo automatically
- Generate a starter workflow file (you can replace it with the one below)

If you prefer to do it manually:

1. Go to **GCP Console → IAM → Service Accounts**
2. Create a service account with the **Firebase Hosting Admin** role
3. Generate a JSON key
4. Add it as a GitHub secret named `FIREBASE_SERVICE_ACCOUNT`

## Step 4: Add the GitHub Actions Workflow

Create `.github/workflows/preview-deploy.yml`:

```yaml
name: Deploy to Firebase Preview Channel

on:
  push:
    branches: [preview]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build Expo web
        run: npx expo export --platform web
        env:
          # Add any env vars your app needs at build time
          EXPO_PUBLIC_FIREBASE_API_KEY: ${{ secrets.EXPO_PUBLIC_FIREBASE_API_KEY }}
          EXPO_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.EXPO_PUBLIC_FIREBASE_PROJECT_ID }}

      - name: Deploy to Firebase Preview Channel
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: preview
          expires: 14d
```

## Step 5: Create the Preview Branch

```bash
git checkout -b preview
git push -u origin preview
```

---

## Usage with Claude Code

### From the Claude iOS app or claude.ai/code:

1. Start a Claude Code web session connected to your repo
2. Tell Claude to make changes and push to the `preview` branch
3. GitHub Actions builds and deploys automatically (~1-2 min)
4. Refresh your preview URL on your phone

### Preview URL format:

```
https://YOUR_PROJECT_ID--preview-CHANNEL_HASH.web.app
```

The URL stays the same across deploys to the same channel. Bookmark it on your phone.

### Finding your preview URL:

- Check the GitHub Actions run output
- Or run locally: `firebase hosting:channel:list`

---

## Optional: PR-Based Previews

If you prefer pull request previews (each PR gets its own URL), replace the workflow trigger:

```yaml
on:
  pull_request:
    branches: [main]
```

And update the deploy step:

```yaml
- name: Deploy to Firebase Preview Channel
  uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    repoToken: ${{ secrets.GITHUB_TOKEN }}
    firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
    # omit channelId — the action auto-generates one per PR
    expires: 7d
```

Firebase will post the preview URL as a comment on the PR.

---

## Optional: Deploy to Production

Add a second workflow for production deploys when you merge to `main`:

Create `.github/workflows/production-deploy.yml`:

```yaml
name: Deploy to Firebase Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build Expo web
        run: npx expo export --platform web
        env:
          EXPO_PUBLIC_FIREBASE_API_KEY: ${{ secrets.EXPO_PUBLIC_FIREBASE_API_KEY }}
          EXPO_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.EXPO_PUBLIC_FIREBASE_PROJECT_ID }}

      - name: Deploy to Firebase Production
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
```

---

## Troubleshooting

**Build fails on `npx expo export`**

- Make sure `expo` is in your `dependencies` (not just `devDependencies`) or install it globally in the workflow
- Check that all `EXPO_PUBLIC_*` env vars are set in GitHub secrets

**Preview URL returns 404**

- Verify `"public": "dist"` in `firebase.json` matches Expo's output directory
- Check that the SPA rewrite rule is present

**Channel expired**

- Re-push to the `preview` branch to recreate it
- Increase `expires` value in the workflow if needed

**Firebase service account errors**

- Re-run `firebase init hosting:github` to regenerate credentials
- Ensure the service account has the `Firebase Hosting Admin` role
