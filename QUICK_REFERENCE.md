# GigShield Play Store Deployment - Quick Reference Card

## 🚀 FASTEST PATH TO PLAY STORE (Summary)

```
Total Time: ~1.5 hours (plus 2-4 hour Google review)
Cost: $25 (one-time Play Store account)
Effort: Minimal (no Android SDK needed)
Method: EAS Build (cloud deployment)
```

---

## ⚡ COMMAND SEQUENCE (Copy & Paste)

### 1️⃣ ONE-TIME SETUP (5 minutes)

```powershell
# Install global tools
npm install -g eas-cli expo-cli

# Login
eas login

# Navigate to project
cd d:\AI Integration\gigshield\frontend

# Install dependencies
npm install

# Verify Expo account username
eas whoami
# Copy your username and update app.json: "owner": "your_username"
```

### 2️⃣ TEST BUILD (15 minutes)

```powershell
# Build APK for testing on device
eas build --platform android --profile preview

# When done: Download link appears
# Install on phone via link/QR/USB
# Test app thoroughly
```

### 3️⃣ PRODUCTION BUILD (20 minutes)

```powershell
# Before this: Create Google Play Dev account ($25)
# Download service account JSON to: frontend/gigshield-play-account.json

# Build AAB for Play Store
eas build --platform android --profile production
```

### 4️⃣ SUBMIT TO STORE (5 minutes)

```powershell
# Upload to Play Store internal testing
eas submit --platform android --latest

# When prompted:
# 1. Choose latest production build ✓
# 2. Service account path: ./gigshield-play-account.json
# 3. Track: internal
```

### 5️⃣ RELEASE (5 minutes in Play Console)

```
1. Go to https://play.google.com/console
2. GigShield → Testing → Internal testing → Releases
3. Create new release → Choose build
4. Add release notes
5. Submit for review
6. Wait 2-4 hours for approval
7. Approve & release to production
```

---

## 📋 FILES CREATED/MODIFIED

✅ **Already Created:**

- `frontend/eas.json` - EAS build config
- `frontend/.easignore` - Files to exclude from build
- `frontend/.env.production` - Production environment variables
- `frontend/SETUP_EAS.bat` - Automated setup script (Windows)

✅ **Already Modified:**

- `frontend/app.json` - Added package name, bundle ID, owner

⚠️ **ACTION REQUIRED:**

- Update `frontend/app.json` line 11: Change `"owner": "YOUR_EXPO_USERNAME"` to your actual Expo username
- Get `gigshield-play-account.json` from Google Play Console and save to `frontend/` folder

---

## 🆘 COMMON ERRORS & FIXES

### ❌ "Not logged in to EAS"

```powershell
eas login
# Follow browser login
```

### ❌ "Metro bundling failed"

```powershell
cd frontend
npm install --legacy-peer-deps
eas build --platform android --profile production --clear-cache
```

### ❌ "Build stuck at 95%"

- Wait 10-15 minutes (first builds are slow)
- Press Ctrl+C and check: `eas build --list`

### ❌ "Service account auth failed"

1. Go to https://console.cloud.google.com/
2. Find service account used by Play Console
3. Ensure role = **Editor** (not just member)
4. Re-download JSON key
5. Try again

### ❌ "APK won't install on phone"

```
Settings → Apps → Special app access → Install unknown apps → Enable [your browser]
```

### ❌ "App crashes on launch"

```powershell
# Test locally first
cd frontend
npm run start

# Fix any issues, then rebuild
eas build --platform android --profile production --clear-cache
```

---

## 💾 FILE STRUCTURE REFERENCE

```
d:\AI Integration\gigshield\
├── frontend/
│   ├── SETUP_EAS.bat                    ← Run this for automated setup
│   ├── eas.json                         ← EAS config (created)
│   ├── .easignore                       ← Build exclusions (created)
│   ├── .env.production                  ← Production config (created)
│   ├── app.json                         ← App config (✅ UPDATED)
│   ├── package.json                     ← Dependencies
│   ├── gigshield-play-account.json      ← GET from Play Console
│   ├── src/
│   ├── assets/
│   └── ...
├── backend/
│   └── api/

└── ...
```

---

## 🔑 KEY DECISIONS ALREADY MADE

**Why EAS Build?**

- ✅ No Android SDK required (your constraint)
- ✅ Avoids Metro/TypeScript issues
- ✅ Simplest path for you
- ✅ Cloud builds = identical results across devices
- ✅ Built-in Play Store integration

**Why Not Local Android Studio?**

- ❌ 15GB disk space
- ❌ 45-90 minute setup
- ❌ Windows PATH issues
- ❌ Beginner-unfriendly debugging
- ❌ You explicitly said "would cause issues"

**Why Not Bare React Native?**

- ❌ Still requires Android SDK
- ❌ You lose Expo benefits
- ❌ More complex
- ❌ Not suitable

---

## 📱 VERSION NUMBERS TO KNOW

Your Current Setup:

```
React Native:       0.73.6 ✅
Expo SDK:           54.0.33 ✅
Node.js needed:     18+ (you have this)
EAS CLI:            5.9.0+ (install with: npm install -g eas-cli)
Minimum Android:    Android 6.0 (minSdkVersion: 23)
```

---

## ✅ PRE-FLIGHT CHECKLIST

Before `eas build`:

- [ ] `app.json` has correct `"owner": "your_username"`
- [ ] `app.json` has correct `"package": "com.gigshield.app"`
- [ ] `frontend/src/` has no TypeScript errors
- [ ] `npm install` completed without errors
- [ ] `eas login` works (`eas whoami` shows username)
- [ ] Internet connection active

Before `eas submit`:

- [ ] Production build completed (`eas build --profile production`)
- [ ] `gigshield-play-account.json` in `frontend/` folder
- [ ] Service account has **Editor** role in Google Cloud
- [ ] Tested APK works on actual device

Before Play Store release:

- [ ] Build appears in "Internal testing" in Play Console
- [ ] Tested for 24+ hours without crashes
- [ ] App store listing filled: privacy policy, ratings, etc.

---

## 📊 COST BREAKDOWN

| Item                   | Cost         | Notes                            |
| ---------------------- | ------------ | -------------------------------- |
| Expo Free Tier         | $0           | 1 free build/month               |
| Pay-as-you-go builds   | $0.50-2 each | For more than 1/month            |
| Play Store account     | $25          | One-time, never again            |
| Custom domain          | $0-15/yr     | Optional, for branding           |
| **Minimum first year** | **$25**      | Just Play Store account          |
| **If 10 builds/month** | **$125**     | Play Store + builds              |
| **If 50 builds/month** | **$125**     | Play Store + priority plan ($99) |

---

## 🔗 USEFUL LINKS

- EAS Build Dashboard: https://expo.dev/eas
- Google Play Console: https://play.google.com/console
- Expo Docs: https://docs.expo.dev/build/
- Play Store Submission: https://play.google.com/console/about/gettingstarted/
- Troubleshooting: https://docs.expo.dev/build/troubleshooting/

---

## 📞 IF SOMETHING FAILS

**Step 1: Check the exact error**

```powershell
# Capture full output
eas build --platform android --profile production 2>&1 | Tee-Object build-error.log

# Check logs folder
eas build --list
# Click build ID link for detailed logs
```

**Step 2: Search error message**

- https://docs.expo.dev/build/troubleshooting/
- https://github.com/expo/eas-cli/issues

**Step 3: Common fixes**

- Clear cache: `eas build --clear-cache --platform android`
- Reinstall deps: `rm -r node_modules && npm install`
- Logout/login: `eas logout && eas login`

---

## ⏱️ TIMELINE ESTIMATE

| Task                   | Duration       | Notes                         |
| ---------------------- | -------------- | ----------------------------- |
| Setup tools & accounts | 15-20 min      | One-time                      |
| First test build       | 15-20 min      | App testing on device         |
| Production build       | 15-20 min      | AAB for store                 |
| Play Store setup       | 10-15 min      | Service account + app listing |
| Submit & review        | 2-4 hours      | Google's review process       |
| **Total to Live**      | **~3-4 hours** | **+ Google review time**      |

**Compare:**

- Local Android SDK setup: 2-5+ hours (plus debugging)
- EAS Build setup: 1.5 hours to Play Store

---

## ✨ YOU'RE READY!

**Next steps:**

1. Update `app.json` with your Expo username
2. Run: `eas build --platform android --profile preview`
3. Test on device
4. Run: `eas build --platform android --profile production`
5. Run: `eas submit --platform android --latest`
6. Approve in Play Console
7. **🎉 Live on Play Store!**

Refer to the EAS CLI documentation at https://docs.expo.dev/eas/ for detailed instructions.

---

**Last Updated:** April 16, 2026  
**For GigShield v1.0.0 + React Native 0.73.6 + Expo 54.0.33**
