## Priority AI tie-breaker

The Priority module first ranks tasks using SwiftChoice’s normal transparent rules:

1. Urgency and importance score
2. Earlier deadline
3. Oldest task
4. Stable task ID fallback

When multiple tasks are still tied, the app can call a Cloudflare Worker that uses Gemini to decide the order and return a short, plain-language explanation.

The Gemini API key is stored only inside the Worker. It must never be placed inside the Expo application or committed to GitHub.

---

### Recommended team setup

Use the deployed Cloudflare Worker so that team members do not need their own Gemini API keys.

#### 1. Pull the latest code

```bash
git pull
npm install
```

#### 2. Create the root environment file

In the root of the SwiftChoice project, create a file named:

```text
.env
```

Add the deployed Worker URL supplied by Bikash:

```env
EXPO_PUBLIC_PRIORITY_AI_URL=<DEPLOYED_WORKER_URL>
```

Example:

```env
EXPO_PUBLIC_PRIORITY_AI_URL=https://priority-ai.example.workers.dev
```

Do not add a trailing slash unless the supplied URL includes one.

#### 3. Restart Expo

Expo must be restarted after creating or changing `.env`:

```bash
npx expo start -c
```

The `-c` option clears Metro’s cache and ensures the new environment value is loaded.

#### 4. Test the AI tie-breaker

1. Open the Priority module.
2. Add at least two tasks.
3. Give the tasks the same urgency and importance.
4. Tap **Rank My Tasks**.
5. When the tasks require a tie-break, the app contacts the Worker.
6. The ranked result displays a plain-language explanation of the tie-break decision.

Team members do not need a Gemini API key when using the deployed Worker.

---

### Fallback behaviour

The Priority module continues to work when:

- the Worker URL is missing;
- the device has no internet connection;
- the Worker is unavailable;
- Gemini returns an invalid response; or
- the request times out.

In these situations, SwiftChoice keeps the deterministic ranking produced by its normal urgency, importance, deadline, creation-time, and task-ID rules.

This means the Priority module does not depend on AI to remain functional.

---

### Environment variable safety

The following value is safe to place in the root `.env`:

```env
EXPO_PUBLIC_PRIORITY_AI_URL=https://your-worker.workers.dev
```

The following value must never be placed in the root `.env`:

```env
GEMINI_API_KEY=your-key
```

Variables beginning with `EXPO_PUBLIC_` are included in the mobile application bundle and must not contain secrets.

Do not commit either of these local files:

```text
.env
workers/priority-ai/.dev.vars
```

Only `.env.example` should be committed as an environment-variable template.

---

## Local Priority AI Worker setup

This setup is optional. Use it only when developing or testing the Worker locally instead of using the deployed Worker.

Each developer running the Worker locally must use their own Gemini API key.

### 1. Install Worker dependencies

From the project root:

```bash
cd workers/priority-ai
npm install
```

### 2. Create the Worker secrets file

Inside `workers/priority-ai`, create:

```text
.dev.vars
```

Add your own Gemini API key:

```env
GEMINI_API_KEY=your_own_gemini_api_key
```

Never commit `.dev.vars`.

### 3. Start the local Worker

```bash
npm run dev
```

The Worker should start at:

```text
http://127.0.0.1:8787
```

Keep this terminal open.

### 4. Configure the Expo app

Return to the SwiftChoice project root and create or update `.env`.

For the Android Studio emulator, use:

```env
EXPO_PUBLIC_PRIORITY_AI_URL=http://10.0.2.2:8787
```

The Android emulator uses `10.0.2.2` to access the host computer. Do not use `127.0.0.1` in the Expo `.env`, because that would point back to the emulator itself.

### 5. Start Expo in another terminal

From the project root:

```bash
npx expo start -c
```

The Android emulator can now send Priority tie-break requests to the locally running Worker.

---

## Worker deployment

Only the team member managing the shared Worker needs to perform these steps.

### 1. Open the Worker directory

```bash
cd workers/priority-ai
```

### 2. Authenticate Wrangler

```bash
npx wrangler login
```

### 3. Store the Gemini key as a Cloudflare secret

```bash
npx wrangler secret put GEMINI_API_KEY
```

Enter the Gemini API key when prompted.

The key is stored by Cloudflare and is not included in the repository or mobile application.

### 4. Deploy the Worker

```bash
npx wrangler deploy
```

Wrangler will display the deployed HTTPS Worker URL.

Example:

```text
https://priority-ai.example.workers.dev
```

Share only this Worker URL with the team. Do not share the Gemini API key.

Each team member then adds the URL to their root `.env`:

```env
EXPO_PUBLIC_PRIORITY_AI_URL=https://priority-ai.example.workers.dev
```

After changing the value, restart Expo:

```bash
npx expo start -c
```

---

## Troubleshooting

### The app ranks tasks but does not show an AI explanation

Check that the root `.env` contains:

```env
EXPO_PUBLIC_PRIORITY_AI_URL=<correct Worker URL>
```

Then restart Expo:

```bash
npx expo start -c
```

Also ensure the tasks genuinely require a tie-break, such as having the same urgency, importance, and deadline.

### The Android emulator cannot reach the local Worker

Use:

```env
EXPO_PUBLIC_PRIORITY_AI_URL=http://10.0.2.2:8787
```

Do not use:

```env
EXPO_PUBLIC_PRIORITY_AI_URL=http://127.0.0.1:8787
```

### The Worker returns an error

Confirm that:

- `workers/priority-ai/.dev.vars` exists for local development;
- the file contains a valid `GEMINI_API_KEY`;
- `npm run dev` is still running;
- the Gemini key has not expired or been disabled; and
- the Worker terminal shows the incoming `/tie-break` request.

### The environment change is not detected

Stop Expo and restart it with:

```bash
npx expo start -c
```

### The Worker is offline

SwiftChoice automatically uses deterministic fallback ranking. The Priority module should continue working without crashing.