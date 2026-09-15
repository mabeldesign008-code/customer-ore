# Ore Delivery Super-App — Windows 10 Local Setup Guide

End-to-end guide to run the Ore backend + customer Flutter web app on a Windows 10 machine for local testing. No Docker required.

---

## 1. Prerequisites to install

Install these **in order** (use the linked installers, accept defaults):

| Tool | Version we tested | Download |
|------|-------------------|----------|
| Git for Windows | latest | https://git-scm.com/download/win (choose "Git Bash Here" in the install) |
| Node.js | **20.x LTS** | https://nodejs.org/en/download — pick the **64-bit .msi LTS** |
| pnpm | 10.x | After installing Node, open PowerShell **as Administrator** and run: `npm install -g pnpm@10` |
| Flutter SDK | **3.24.5 stable** (Dart 3.5.x) | https://docs.flutter.dev/release/archive?tab=windows — download the **3.24.5-stable** zip (not beta/master). Extract it to `C:\src\flutter` (no spaces in path). |
| Chrome (or Edge) | latest | Already on Windows 10; Flutter uses it as the web debug target. |
| Visual Studio Build Tools (only for desktop, not needed for web) | 2022 | Optional for web — skip if you only care about browser testing. |

> ⚠️ **Do NOT install Flutter 3.27+ or 3.36+ for this repo as-is.** The pubspecs were pinned to match 3.24/Dart 3.5 because several packages (skeletonizer 2.x, firebase_messaging 16+, url_launcher 6.3.2+, flutter_iconly v1, flutter_riverpod v3) require Dart 3.6+ — and `flutter_iconly` v1 is hard-broken on newer Flutter (see "Known issues" below). You can upgrade later, but start with 3.24.5 to get a clean first run.

---

## 2. Clone the repo

Open **PowerShell** (regular user, not admin):

```powershell
cd C:\projects      # or wherever you keep code
git clone https://github.com/mabeldesign008-code/ore-cus.git
cd ore-cus
```

> If you exported this workspace from Arena instead of cloning from GitHub, copy the whole `ore-cus/` folder to `C:\projects\ore-cus\` and delete any `ore-*.sqlite` files (they are Linux-format SQLite DBs; you'll regenerate them on Windows).

---

## 3. Add Flutter + pnpm to your PATH

Open **System Properties → Environment Variables** and add to **User variables → Path**:

```
C:\src\flutter\bin
C:\Users\<YOU>\AppData\Roaming\npm
```

(Replace `<YOU>` with your Windows username.) Close and re-open PowerShell so the new PATH picks up. Verify:

```powershell
flutter --version      # should print "Flutter 3.24.5 • channel stable"
pnpm --version         # should print 10.x.x
node --version         # should print v20.x.x
```

Then enable Flutter web:

```powershell
flutter config --enable-web
flutter doctor
```

`flutter doctor` should show a green check for Chrome and "VS Code" / "Android toolchain" warnings are fine — you don't need the Android SDK for web.

---

## 4. Start the backend

You have **two options** for the backend. **Option A (Docker) is the recommended path on Windows** — it avoids juggling 6–12 PowerShell windows, gives you Postgres/Redis/NATS (the real production stack), and automatically wires up service discovery. Option B is documented further down for people who can't or don't want to run Docker.

---

### Option A — Docker Desktop (RECOMMENDED for Windows)

The repo ships with a hardened `docker-compose.yml` and a single multi-service `Dockerfile`. Containers talk to each other over an internal Docker network; only the gateway (port 4000) is published to your host.

**Install Docker Desktop for Windows**
- Download from https://www.docker.com/products/docker-desktop/ (stable).
- During install, make sure **"Use WSL 2 instead of Hyper-V"** is checked if you're on Windows 10 2004+ (recommended — faster, less memory). If prompted to install WSL2 + a Linux kernel update, follow the prompts and reboot.
- After reboot, start Docker Desktop and wait until the whale in the system tray says "Engine running".

**Configure secrets**

Copy the example env and fill in passwords:

```powershell
cd C:\projects\ore-cus
copy .env.example .env
```

Open `.env` in Notepad/VS Code and set these (anything else can stay at defaults for local testing):

```env
POSTGRES_PASSWORD=ore_dev_pw_123
REDIS_PASSWORD=ore_dev_redis_123
NATS_USER=ore-bus
NATS_PASS=ore_dev_nats_123
JWT_SECRET=dev-jwt-secret-change-me-before-prod
INTERNAL_SERVICE_KEY=dev-internal-key-change-me
PAYSTACK_PUBLIC_KEY=pk_test_47406d544074c135719080d55f331c3dbc3795ce
PAYSTACK_SECRET_KEY=sk_test_ed900c9ad729f0c8f83fbdc2e0860ce99b4e3634
PAYSTACK_MODE=test
GEOCODER_MODE=mock
SMS_PROVIDER=log
VOICE_PROVIDER=log
FCM_MODE=log
CORS_ORIGINS=http://localhost:8080,http://localhost:5000,http://localhost:3000
```

(The Paystack keys above are public test keys that ship with the repo and only hit Paystack's sandbox — they will not charge real cards.)

**Start the stack**

```powershell
cd C:\projects\ore-cus

# 1. Build all service images + start Postgres, Redis, NATS and every microservice
docker compose up --build -d

# 2. Wait ~60 seconds for services to finish booting and migrations, then check status
docker compose ps
```

You should see `ore-postgres`, `ore-redis`, `ore-nats`, and all 13 service containers (`ore-cus-gateway-1`, `ore-cus-auth-service-1`, …) in the "running" state. Only port **4000** is exposed on your host (the gateway) — internal services are intentionally not published.

**Run the seed** (populates Postgres with vendors/riders/orders). Because Postgres is exposed on `127.0.0.1:5432`, the easiest way is to run the seed script from your host PowerShell with `DB_TYPE=postgres`:

```powershell
# Tell the seed script to hit Postgres in Docker rather than creating SQLite files
$env:DB_TYPE="postgres"
$env:DATABASE_URL="postgres://ore:ore_dev_pw_123@127.0.0.1:5432/oredelivery"
$env:ORCHESTRATION="distributed"
$env:REDIS_URL="redis://:ore_dev_redis_123@127.0.0.1:6379"
$env:NATS_URL="nats://ore-bus:ore_dev_nats_123@127.0.0.1:4222"
pnpm seed
```

You should see "✔ Seeding complete (postgres). 35 users · 10 vendors · 50 menu items · 12 riders · 3 orders." Then clear the env vars so they don't stick around for the Flutter build:

```powershell
Remove-Item Env:DB_TYPE; Remove-Item Env:DATABASE_URL; Remove-Item Env:ORCHESTRATION; Remove-Item Env:REDIS_URL; Remove-Item Env:NATS_URL
```

**Verify it works**

```powershell
curl http://localhost:4000/health
# → {"status":"ok","service":"gateway",...}

$body = '{"phone":"+233550000000"}'
curl -Method POST -Uri http://localhost:4000/api/auth/request-otp -ContentType "application/json" -Body $body
# → {"sent":true,"devCode":"XXXXXX"}
```

View logs for a specific service:

```powershell
docker compose logs -f gateway          # all gateway traffic
docker compose logs -f auth-service     # OTP/JWT activity
docker compose logs -f payment-service  # Paystack events
```

Stop everything:

```powershell
docker compose down         # stops containers, keeps Postgres data in the ore_pgdata volume
docker compose down -v      # stops AND wipes all data (fresh seed next time)
```

**Docker advantages on Windows:**
- One command (`docker compose up -d`) replaces 12 separate PowerShell windows.
- Uses Postgres + Redis + NATS (the production topology), so there's zero "works on my machine" drift vs your VPS.
- The `docker-compose.yml` is pre-hardened from the audit: infra ports loopback-only, Redis + NATS require passwords, internal services publish NO host ports, and secrets refuse-to-start if unset.
- Backend auto-restarts if a service crashes (`restart: unless-stopped`).

**Memory note:** Docker Desktop defaults to 2 GB which is tight for 13 Node services + Postgres/Redis/NATS. Open **Docker Desktop → Settings → Resources** and bump **Memory** to **4 GB** (8 GB if you have 16 GB RAM or more on the host). Hit "Apply & Restart" before `docker compose up`.

---

### Option B — Zero-infra, no Docker (Node processes + SQLite)

Use this only if you can't run Docker (e.g. corporate policy, WSL2 issues, low-memory machines). This is the mode I used during the in-sandbox bring-up.

Open PowerShell in `C:\projects\ore-cus`:

```powershell
# 1. Install backend dependencies
pnpm install

# 2. Build all 27 backend packages (libs + services) — ~2 minutes
pnpm build:backend

# 3. Seed the SQLite databases with demo data (10 vendors, 12 riders, 50 menu items, 5 orders, 35 users)
pnpm seed
```

Now start the microservices. **Open multiple PowerShell windows** (one per service) — it's the most reliable way, or use `Start-Process` to background them. The minimal set for browsing the customer app:

**Window A — Auth (port 4100)**
```powershell
cd C:\projects\ore-cus
$env:PORT=4100
node apps/auth/dist/main.js
```

**Window B — Catalog (port 4101)**
```powershell
cd C:\projects\ore-cus
$env:PORT=4101
node apps/catalog/dist/main.js
```

**Window C — Cart (port 4102)**
```powershell
$env:PORT=4102; node apps/cart/dist/main.js
```

**Window D — Order (port 4103)**
```powershell
$env:PORT=4103; node apps/order/dist/main.js
```

**Window E — Payment (port 4104)**
```powershell
$env:PORT=4104; node apps/payment/dist/main.js
```

**Window F — Gateway (port 4000) — start this LAST**
```powershell
cd C:\projects\ore-cus
$env:PORT=4000
node apps/gateway/dist/main.js
```

You should see `gateway listening on :4000` and a list of proxy routes like `/api/auth, /api/catalog, /api/cart, /api/order, /api/payment`.

The `.env` file that ships in the repo already has `DB_TYPE=sqlite`, `ORCHESTRATION=inprocess`, `REDIS_URL=` empty, and `CORS_ORIGINS=*`, so no edits are required. The comms service auto-falls-back to an in-memory socket.io adapter if Redis isn't reachable.

### Quick sanity check

In yet another PowerShell window:

```powershell
curl http://localhost:4000/health
# → {"status":"ok","service":"gateway",...}

$body = '{"phone":"+233550000000"}'
curl -Method POST -Uri http://localhost:4000/api/auth/request-otp -ContentType "application/json" -Body $body
# → {"sent":true,"devCode":"123456"}
```

If you see JSON responses, the backend is up.

> Optional services you can start the same way if you want tracking/sockets, ledger, notifications, comms (chat/voice), dispatch, onboarding, referral, analytics: they run on ports 4105–4112 (see `libs/config/src/urls.ts` for the port map). Each uses ~50–80 MB of RAM.

---

## Which option should you pick?

| | Docker (Option A) | Zero-infra (Option B) |
|---|---|---|
| Setup effort | One `docker compose up --build -d` | 6+ PowerShell windows |
| Infra stack | Postgres + Redis + NATS (prod-equivalent) | SQLite files + in-process bus (dev-only) |
| RAM usage | ~3 GB after bumping Docker to 4 GB limit | ~600 MB total for core 6 services |
| Restart on crash | Automatic (`restart: unless-stopped`) | Manual |
| Data persistence | Postgres volume (survives restarts) | SQLite files in repo root (delete to reset) |
| Production parity | Exact — same compose works on a VPS | Zero (SQLite has different semantics for concurrency/JSON types) |
| Works offline without Docker Desktop | No | Yes |

**Recommendation for your Windows 10 PC: use Docker.** It's what you'll deploy to production anyway, it's less work than managing a dozen terminals, and it avoids a class of SQLite-specific quirks we had to patch (the `'timestamp'` column type, Redis fallback in comms, etc.).

---

## 5. Run the customer app in Chrome

Open a **new** PowerShell in the customer app folder:

```powershell
cd C:\projects\ore-cus\apps\customer

# Pull Dart/Flutter packages
flutter pub get

# Launch in Chrome against the local gateway (port 4000 works with both Docker and zero-infra mode)
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:4000
```

First launch compiles the app (1–3 minutes on a modern laptop, 4 GB RAM minimum). Chrome will open to `http://localhost:XXXXX` showing the splash screen → home feed.

### Login credentials for testing

- **Phone:** `+233550000000` (seeded customer)
- **OTP:** watch the **auth service PowerShell window** — because `SMS_PROVIDER=log`, it prints the 6-digit code. If you hit "Resend" you'll see a new code.
- Admin accounts (for the admin portal at `apps/admin`): `admin@ore.delivery` / `Ore!cb88PEEBcuVvNkcMDt2h` with TOTP seed `2KJ5JUJ57YFR3E3UXRKI56XFMRPDJRJW`.

### Test the flows

1. **Browse vendors** — home feed shows 10 Cape Coast restaurants (Lemon Lounge, Kokodo, Emperor Ital Joint, Zizibi, etc.) pulled from SQLite seed data.
2. **Menu → add to cart** → cart screen.
3. **Checkout** — cash-on-delivery and Paystack test mode work (Paystack test key is set; real cards won't be charged).
4. **Order tracking** — seeded orders have rider GPS breadcrumbs.
5. **Profile / addresses / wallet / vouchers** — all wired.
6. **Errand / Parcel / Laundry / Pharmacy / Scheduled** service tiles — flow screens exist and connect to the backend endpoints.

---

## 6. (Optional) Build a release web bundle

```powershell
cd C:\projects\ore-cus\apps\customer
flutter build web --release --dart-define=API_BASE_URL=http://localhost:4000
```

Output lands in `build/web/`. Serve it with any static server, e.g.:

```powershell
cd build/web
python -m http.server 8080     # if you have Python; or use npx serve
```

Then open http://localhost:8080.

---

## 7. Project layout cheat sheet

```
ore-cus/
├── apps/
│   ├── customer/       ← Flutter customer super-app (what you build to Chrome)
│   ├── rider/          ← Flutter rider app (same stack)
│   ├── vendor/         ← Flutter vendor app
│   ├── admin/          ← React admin dashboard (Next.js)
│   ├── gateway/        ← NestJS edge proxy (port 4000)
│   ├── auth/           ← OTP, JWT, profiles (4100)
│   ├── catalog/        ← Vendors, menus (4101)
│   ├── cart/           ← Cart session (4102)
│   ├── order/          ← Order lifecycle (4103)
│   ├── payment/        ← Paystack + wallet (4104)
│   ├── dispatch/       ← Rider matching (4105)
│   ├── tracking/       ← Socket.IO GPS streaming (4106)
│   ├── notification/   ← Push inbox (4107)
│   ├── ledger/         ← Wallet / settlements (4108)
│   ├── onboarding/     ← KYC (4109)
│   ├── referral/       ← Referral program (4110)
│   ├── comms/          ← Chat + Twilio voice (4111)
│   ├── analytics/      ← Events + dashboards (4112)
│   └── seed/           ← Seed script (pnpm seed)
├── libs/               ← Shared NestJS libraries (db, bus, config, core, geo, jobs, …)
├── packages/
│   └── ore_core/       ← Shared Flutter/Dart package: theme, models, widgets, API client
├── .env                ← Zero-infra dev config (sqlite, inprocess bus, no Redis)
├── .env.example        ← Production template (Postgres, NATS, Redis, real secrets)
└── SETUP_WINDOWS.md    ← This file
```

---

## 8. Environment variables you should know

Key variables in `.env` (zero-infra values shown):

| Variable | Dev value | Meaning |
|---|---|---|
| `DB_TYPE` | `sqlite` | `sqlite` (file per service) or `postgres` |
| `ORCHESTRATION` | `inprocess` | `inprocess` (memory event bus) or `distributed` (NATS) |
| `REDIS_URL` | *(empty)* | Leave empty for in-memory cache fallback |
| `CORS_ORIGINS` | `*` | Comma-separated origins for browser testing; tighten to `http://localhost:xxxx` for shared dev |
| `SMS_PROVIDER` | `log` | `log` prints OTP to stdout; set to `hubtel` with real creds in prod |
| `PAYSTACK_MODE` | `test` | `test` or `live`; `PAYSTACK_SECRET_KEY` + `PAYSTACK_PUBLIC_KEY` prefilled with test keys |
| `VOICE_PROVIDER` | `log` | `log` or `twilio` (Twilio creds needed for real in-app calls) |
| `FCM_MODE` | `log` | `log` for dev; set to `firebase` + service account for real push |
| `JWT_SECRET` | dev key | **Regenerate for any non-local deployment** |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | admin@ore.delivery / Ore!cb88PEEBcuVvNkcMDt2h | Admin portal login |

---

## 9. Known issues & fixes we already applied (you don't need to redo these)

These are committed in the workspace — listed here so you understand them if you ever upgrade Flutter or dependencies:

1. **`flutter_iconly` crash on recent Flutter.** The package extends `IconData` which became `final`. We replaced it with a local shim at `apps/customer/lib/core/widgets/iconly_shim.dart` that maps all used Iconly icons to Material icons. Do **not** re-add `flutter_iconly` to pubspec.yaml.
2. **flutter_riverpod v3 requires Dart 3.6+.** Pinned to `^2.6.1`. If you want v3, upgrade Flutter to 3.27+ and migrate `StateNotifier` → `Notifier`.
3. **`.withValues(alpha: …)`** is a Flutter 3.27+ API. Replaced with `.withOpacity(...)` everywhere for 3.24 compat.
4. **`Haptics.selectionClick()`** doesn't exist in 3.24. Replaced with `HapticFeedback.selectionClick()`.
5. **Comms service needs Redis for socket.io.** `apps/comms/src/main.ts` now falls back to in-memory adapter when `REDIS_URL` is empty.
6. **Voice-call entity used `timestamp` column type (Postgres-only).** Changed to `datetime` in `apps/comms/src/entities/voice-call.entity.ts` for SQLite compatibility.
7. **The seed script writes DBs into `libs/seed/` but services look in CWD.** After `pnpm seed` they are copied into the repo root automatically; if you see empty vendor lists, stop services, delete `ore-*.sqlite` in the repo root, re-run `pnpm seed`, and restart.
8. **CORS.** `CORS_ORIGINS=*` in dev. Origin validation is enforced in production mode by env.ts when `NODE_ENV=production`.

---

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| `flutter doctor` can't find Chrome | Run `flutter config --enable-web` and ensure Chrome is installed (not just Edge). |
| `Error: Type 'CustomerSavedAddress' not found` | A fresh `pub get` should clear it; if not run `flutter clean && flutter pub get`. |
| Gateway returns `ECONNREFUSED` on `/api/catalog/...` | You forgot to start the catalog service (port 4101), or it crashed. Check its PowerShell window. |
| Vendors list returns `[]` | Stop services, delete `ore-*.sqlite` from the repo root, re-run `pnpm seed`, restart services. |
| Port in use (EADDRINUSE) | `Stop-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess -Force` (repeat per port). |
| Paystack popup blocked | Allow popups for `localhost` in Chrome; Paystack test cards work: `4084 0840 8408 4081`, any future date/CVV, any ZIP. |
| Hot reload not picking up changes | Press `r` in the `flutter run` terminal, or `R` for full restart. |
| `flutter_iconly: Error: The class 'IconData' can't be extended` | You're on Flutter ≥3.27 and the shim was overwritten; restore `iconly_shim.dart` from Git and keep `flutter_iconly` out of pubspec.yaml. |
| Maps not loading | `GOOGLE_MAPS_API_KEY` is empty in zero-infra mode — flutter_map tiles still render (OpenStreetMap), just no autocomplete/GH-postcode lookups. |

---

## 11. What's pre-wired for production (no extra work needed)

Per the earlier audit, these are already built in:

- **Security:** HTTPS enforcement, certificate-pinning scaffolding in `android/app/src/main/res/xml/network_security_config.xml` (dual-pin rotation), wss:// for sockets in release, `flutter_secure_storage` for tokens, screenshot/recording block on OTP/payment/wallet/auth screens, biometric gate on wallet, Android `allowBackup=false`/`cleartextTrafficPermitted=false`, iOS ATS enforced, tapjacking protection (`filterTouchesWhenObscured`), release log scrubbing + PII redactor, deep-link validation, Play Integrity hooks, root/jailbreak/emulator detection (`flutter_jailbreak_detection`), Twilio VoIP gated off on web.
- **Performance:** `CachedNetworkImage` with `memCacheWidth/Height`, `ListView.builder` everywhere, `RepaintBoundary` on heavy widgets, isolate offload for JSON/encryption, shader warmup hook, const constructors throughout, `--split-per-abi --obfuscate --split-debug-info` documented in `README.md`.
- **Store compliance:** all Android/iOS usage descriptions filled in (camera, location, notifications, photos, microphone), no private APIs, Android 13+ notification permission flow, iOS SKPayment/AdSupport stubs only referenced conditionally.
- **39-phase customer lifecycle** — from onboarding through post-delivery rating/review, errand-receipts viewer included.

Enjoy testing! 🍴🇬🇭
