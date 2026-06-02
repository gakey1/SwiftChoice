# SwiftChoice

A mobile micro-decision support app for everyday choices like what to eat, where to study, and what task to start. Three modules (Fuel, Focus, Priority) each give a single recommendation with one optional reroll. Built for INT3506 Advanced Studio 2 by Group 2.

The app runs on iOS and Android via React Native plus Expo. Cloud data lives in Firebase Firestore in the Sydney region; user preferences live on the device only.

## Prerequisites

Before cloning, set up these on your machine:

- **Node.js 22 LTS.** Anything 20.19.4 or higher works; 22 is the safer choice. Use a version manager like `nvm` so each project can pin its own version.
- **Xcode** (Mac only) for the iOS Simulator. Available free in the Mac App Store. Around 12 GB after install. You also need the Command Line Tools (`xcode-select --install`).
- **Android Studio** for the Android emulator. After install, configure `ANDROID_HOME` and add the SDK tools to your PATH (see Troubleshooting below).
- **Git** (any recent version).
- **A code editor.** Anything works; VS Code is the team's default.

You also need:

- A Google account that has been invited to the SwiftChoice Firebase project. Ask the team lead if you do not have access yet.

## Getting started

Clone the repo and install dependencies:

```bash
git clone git@github.com:gakey1/SwiftChoice.git
cd SwiftChoice
npm install
```

Set up environment variables. Copy the example file and fill in the Firebase config:

```bash
cp .env.example .env
```

To get the values:

1. Sign in to https://console.firebase.google.com with the Google account that has access to the project.
2. Pick the SwiftChoice project.
3. Click the gear icon next to Project Overview, then Project settings.
4. Scroll to Your apps, click the Web app entry, and copy each value into the matching `EXPO_PUBLIC_FIREBASE_*` variable in `.env`.

These values are not secrets in the cryptographic sense; they ship with any client that uses Firebase. Security comes from the Firestore rules in `firestore.rules`, not from hiding the config.

## Running the app

The dev server runs through Expo:

```bash
npx expo start
```

You will see a menu. Press:

- `i` to launch the iOS Simulator
- `a` to launch an Android emulator (Android Studio must have at least one AVD set up)
- `r` to reload the app
- `Ctrl+C` to stop the server

The first launch on each platform takes about 30 to 60 seconds while the simulator boots and the app installs. Subsequent runs are fast.

If you try the QR code on a real phone and see "This project requires a newer version of Expo Go", that is expected. Expo Go in the Play Store and App Store often lags the latest Expo SDK. Use the simulator or emulator instead. When we start integrating native modules in Sprint 1, we will move to development builds via `npx expo run:android` and `npx expo run:ios`, which skip Expo Go entirely.

## Project structure

```
SwiftChoice/
  App.tsx                  app entry point
  app.json                 expo config
  package.json
  tsconfig.json
  eslint.config.js
  .env.example             template for local env vars
  .firebaserc              firebase project alias
  firebase.json            firebase cli config
  firestore.rules          firestore security rules
  firestore.indexes.json   composite indexes

  src/
    components/            shared UI primitives (Button, Card, etc.)
    features/              module logic (fuel, focus, priority)
    hooks/                 cross-cutting React hooks
    navigation/            React Navigation setup
    screens/               screen-level components
    services/              external integrations (firebase, sqlite)
    stores/                Zustand stores
    theme/                 design tokens and module registry
    types/                 shared TypeScript types
    utils/                 pure helpers

  briefs/                  per-task briefs (one file per task)
  assets/                  app icons and splash assets
```

## Branching and pull requests

The `main` branch is protected. Direct commits to `main` are blocked. The flow looks like this:

1. Pull the latest `main`, then branch off it.
   ```bash
   git checkout main
   git pull
   git checkout -b feature/short-task-name
   ```
2. Make your changes. Commit often. Push when ready.
   ```bash
   git push -u origin feature/short-task-name
   ```
3. Open a pull request. At least one team member needs to review and approve.
4. After approval, squash-merge into `main`. Delete the feature branch.

Branch naming uses prefixes:

- `feature/` for new features
- `fix/` for bug fixes
- `chore/` for tooling, dependencies, docs

## Commit messages

We follow Conventional Commits. The shape:

```
type(scope): subject

[optional body]
```

Examples:

```
feat(fuel): add reroll button
fix(auth): collapse login error to one message
chore(setup): bump expo to 56.0.9
docs: update README with android setup notes
test(focus): add tests for energy-and-vibe input
```

Types in use: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`.

Scopes are module or area names: `setup`, `auth`, `fuel`, `focus`, `priority`, `history`, `nav`, `theme`, `firebase`, `lint`.

Subjects are lowercase, in the imperative mood, with no trailing full stop, under 70 characters.

Bodies are optional. Add one when there is a why that is not obvious from the diff. Wrap at 72 characters.

## Tests, lint, and types

Unit and component tests run through Jest and React Native Testing Library:

```bash
npm test               # run once
npm test -- --watch    # watch mode
```

Tests live next to the file they test (e.g. `Button.tsx` next to `Button.test.tsx`).

Lint and format:

```bash
npm run lint           # eslint
npm run lint:fix       # eslint with autofix
npm run format         # prettier on every file
npm run format:check   # prettier check only
```

Type check:

```bash
npx tsc --noEmit
```

Before pushing, run all of `npm run lint`, `npm run format:check`, and `npx tsc --noEmit`. The CI (when set up later) will run the same.

## Deploying Firestore rules and indexes

When `firestore.rules` or `firestore.indexes.json` change, redeploy:

```bash
# first time only, on each machine
npx firebase login

# every deploy
npx firebase deploy --only firestore
```

You will need to be logged in with a Google account that is a Firebase project member. The deploy targets the project pinned in `.firebaserc`.

The deployment shows two lines when it succeeds:

```
firestore: released rules firestore.rules to cloud.firestore
firestore: deployed indexes in firestore.indexes.json successfully
```

If you see permission errors, check your Firebase project membership.

## Troubleshooting

**`npx expo start` errors with "Node.js (vXX.YY.ZZ) is outdated and unsupported".**
Expo SDK 56 needs Node 22 (or any LTS 20.19.4 and up). Upgrade with nvm:

```bash
nvm install 22
nvm alias default 22
```

If you have both `nvm` and `mise` activating in your shell, the one that loads later in `.zshrc` wins. Add this near the end of your `.zshrc` to force nvm's default Node:

```bash
if command -v nvm >/dev/null 2>&1; then
  nvm use default --silent >/dev/null 2>&1
fi
```

Open a new terminal, run `node --version`, confirm you see v22, then re-run `npx expo start`.

**"No Android connected device found, and no emulators could be started automatically."**
You need `ANDROID_HOME` set and the SDK tools on your PATH. Android Studio installs the SDK at `~/Library/Android/sdk` on macOS. Add to your `.zshrc`:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"
```

Open a new terminal, run `which adb` to verify (you should see a path under `Library/Android/sdk`), and try `npx expo start` again.

**The app crashes at boot with "Missing Firebase config".**
Your `.env` is missing or empty. Copy `.env.example` to `.env` and fill in the values from the Firebase console.

**`@/...` imports fail with "Cannot find module".**
The `@/*` path alias resolves to `./src/*`. Restart your editor's TypeScript server. If you have run `npm install` recently, also restart Metro (`Ctrl+C` then `npx expo start` again).

**Expo Go on a real phone shows "This project requires a newer version of Expo Go".**
Use the iOS Simulator or Android emulator instead. Expo Go in the stores is often behind the latest SDK. We move to development builds in Sprint 1 anyway.

**Firebase deploy says "permission denied" or "no active project".**
Run `npx firebase login` to sign in, then `npx firebase use default` to select the SwiftChoice project. If your account is not a project member, ask the team lead to add you.

## Team

- Yvonne Gitonga (authentication, on-device and cloud storage, decision history, deployment)
- Bikash Adhikari (preferences, decision pools, data and analytics layer)
- Thi My Uyen Nguyen, also known as Tracy (app shell, module screens, recommendation algorithms, UI polish)

INT3506 Advanced Studio 2, Group 2, Semester 2 2026.
