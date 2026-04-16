# GigShield Play Store Deployment Checklist

## Pre-Deployment Setup (Complete Once)

### Account & Tools Setup
- [ ] Create/have Expo account at https://expo.dev
- [ ] Create/have Google Play Store Developer account (pay $25 one-time)
- [ ] Install Node.js 18+ (verify: `node --version` should show v18+)
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Install Expo CLI: `npm install -g expo-cli`
- [ ] Run `eas login` to authenticate

### Configuration Files
- [ ] Review `frontend/app.json` and update `"owner": "YOUR_EXPO_USERNAME"` with your actual Expo username
- [ ] Verify `frontend/eas.json` exists (created automatically)
- [ ] Verify `frontend/.easignore` exists (created automatically)
- [ ] Config files created:
  - [x] `frontend/eas.json` ✅
  - [x] `frontend/.easignore` ✅
  - [x] `frontend/.env.production` ✅
  - [x] `frontend/app.json` ✅ (updated with package name & bundle ID)

---

## Phase 1: Test Build (Testing on Device)

### Objective
Build APK and install on Android device for QA testing before production release.

### Steps

#### Step 1: Navigate to Project
```powershell
cd d:\AI Integration\gigshield\frontend
```

#### Step 2: Install Dependencies
```powershell
npm install
```
**Expected:** Takes 2-3 minutes, installs all packages

#### Step 3: Create Test Build (APK)
```powershell
eas build --platform android --profile preview
```

**Expected:**
- Output shows build ID
- Uploads code to EAS servers (~1 min)
- Build on cloud servers (~10-15 min)
- Outputs download link or QR code

#### Step 4: Install on Phone
Choose ONE method:

**Method A: Email Link (Easiest)**
- EAS emails you → click link on your phone
- Browser opens → tap "Install"

**Method B: QR Code**
- Scan QR code with phone camera
- Tap link → install

**Method C: Manual Download**
- Download APK from browser
- Save to phone
- Tap APK file → install
- **NOTE:** Settings → Apps → Special app access → Install unknown apps → Enable

#### Step 5: Test App
- [ ] App launches without crashing
- [ ] Can log in (if auth required)
- [ ] Location services work
- [ ] API calls to backend succeed
- [ ] All main features functional
- [ ] No crashes or errors

#### Step 6: Document Issues (if any)
```
Issues found:
1. ...
2. ...
```

#### Step 7: Fix Issues (if needed)
```powershell
# Fix code
npm run start  # Test locally with expo

# Rebuild when ready
eas build --platform android --profile preview
```

**Status:** `[ ] COMPLETE` once app works on device

---

## Phase 2: Production Build (Play Store Ready)

### Objective
Build Android App Bundle (AAB) for Google Play Store submission.

### Steps

#### Step 1: Prepare Production Build
```powershell
eas build --platform android --profile production
```

**Expected:**
- Similar process to preview, but creates AAB instead of APK
- Build ID displayed
- ~10-15 minutes

#### Step 2: Verify Build Success
```powershell
eas build --list
```

### Expected Output
```
┌───────────────────────────────────────────────────────────────────┐
│ Build ID  │ Status    │ Platform  │ Build Time      │ Artifact    │
├───────────┼───────────┼───────────┼─────────────────┼─────────────┤
│ abc123    │ FINISHED  │ android   │ 2024-04-16      │ AAB Ready   │
└───────────────────────────────────────────────────────────────────┘
```

**Status:** `[ ] COMPLETE` when latest build shows `FINISHED`

---

## Phase 3: Play Store Setup & Account

### Objective
Get credentials and create app listing in Google Play Console.

### Prerequisites
- Paid Google Play Developer Account ($25 one-time)
- Gmail account associated with developer account

### Steps

#### Step 1: Create App in Play Console
1. Go to https://play.google.com/console
2. Apps → Create app
3. **App name:** GigShield
4. **Default language:** English
5. **App type:** Application
6. **Category:** Business / Lifestyle
7. Click **Create**

#### Step 2: Generate Service Account
1. In Play Console: **Settings** (left sidebar) → **API access**
2. Click **CREATE SERVICE ACCOUNT** link
3. Google Cloud Console opens
   - Click **CREATE SERVICE ACCOUNT**
   - **Service account name:** gigshield-eas
   - Click **CREATE AND CONTINUE**
   - **Grant roles:** Editor
   - Click **CONTINUE**
   - Click **CREATE KEY** → **JSON**
   - JSON file downloads automatically

#### Step 3: Save Service Account JSON
```
Move downloaded JSON file to:
  d:\AI Integration\gigshield\frontend\gigshield-play-account.json
```

**Verify:**
```powershell
Test-Path "d:\AI Integration\gigshield\frontend\gigshield-play-account.json"
# Should output: True
```

#### Step 4: Grant Service Account Access in Play Console
1. Back to **Play Console** → **Settings** → **API access**
2. Refresh page
3. Your service account appears in **Service accounts** section
4. Click the account → Grant **Admin** role
5. Click **Grant access**

**Status:** `[ ] COMPLETE` when service account shows Admin role in Play Console

---

## Phase 4: Submit to Play Store

### Objective
Upload build to Play Store internal testing track (first step to public release).

### Steps

#### Step 1: Submit Build
```powershell
# From frontend directory
cd d:\AI Integration\gigshield\frontend

# Submit production build
eas submit --platform android --latest
```

**Prompts:**
- "Choose build:" → Pick your latest production build (AAB)
- "Service account?" → Enter path: `./gigshield-play-account.json`
- "Track?" → Select: `internal` (for testing first)

**Expected:**
- Submission takes ~2 minutes
- Output: "✅ Successfully submitted app to Google Play"

#### Step 2: Verify in Play Console
1. Go to https://play.google.com/console → GigShield
2. **Testing** → **Internal testing** → **Releases**
3. Should show your build listed

**Status:** `[ ] COMPLETE` when build appears in Internal Testing

---

## Phase 5: Release to Production (After Internal Testing)

### Objective
Move app from internal testing to public Play Store.

### Prerequisites
- ✅ Tested internally for at least 24 hours
- ✅ No critical bugs found
- ✅ All features working

### Steps

#### Step 1: Add App Details in Play Console

**Navigate to:**
1. Play Console → GigShield → **Manage** → **App content**

**Fill in (required):**
- [ ] Privacy policy URL (use placeholder or your actual URL)
- [ ] Content rating
- [ ] Target audience
- [ ] Content guidelines confirmation

#### Step 2: Set Up Pricing & Distribution
1. **Pricing & distribution** → **Countries/regions**
   - [ ] Select target countries (default: all)

#### Step 3: Create Release
1. **Manage** → **Release** → **Production**
2. Click **Create new release**
3. **Select build** → Choose your AAB from internal testing
4. **Release notes:** 
   ```
   Version 1.0.0 - Initial Release
   - User authentication
   - Delivery zone verification
   - Live policy monitoring
   - Coverage map display
   ```
5. Click **Review**

#### Step 4: Google Review
1. Click **Submit release**
2. App enters **Review** status
3. **Typical timeline:**
   - First release: 2-4 hours (sometimes up to 24 hours)
   - Subsequent: 1-2 hours
4. Monitor: **Testing** → **Signed APK** for review status

#### Step 5: Approval & Launch
- [ ] Once approved, status shows "Approved"
- [ ] Click **Release** to make public
- [ ] App goes **Live** on Google Play Store
- [ ] Available for public download within hours

**Status:** `[ ] COMPLETE` when app shows in Play Store search

---

## Post-Launch Monitoring

### Daily Checks (First Week)
- [ ] Check Google Vitals - Crashes tab
- [ ] Monitor Play Console reviews section
- [ ] Check for 1-star ratings with feedback
- [ ] Monitor error logs from backend

### Weekly Checks
- [ ] Review ANR (Application Not Responding) rates
- [ ] Check battery/memory metrics
- [ ] Verify crash-free user percentage
- [ ] Read new reviews for feature requests

### Issue Hotfix Process
```powershell
# If critical bug found:
1. Fix in code
2. Increment versionCode and version in app.json
3. eas build --platform android --profile production
4. eas submit --platform android --latest
5. Create new release in Play Console
6. Approve & release to production
# Typical: 45 minutes from fix to live
```

---

## Troubleshooting

### Build Fails: "Metro bundling failed"
```powershell
# Solution 1: Install with legacy peer deps
cd frontend
npm install --legacy-peer-deps
eas build --platform android --profile production --clear-cache
```

### Build Stuck at 95%
- This is normal for first few builds (7-15 min)
- Check status: `eas build --list`
- If truly stuck >15 min: Check internet connection and retry

### Service Account Auth Error
```
Error: Forbidden ( 403)
The caller does not have permission
```
**Solution:**
1. Go back to Google Cloud Console
2. Find project in Play Console integration
3. Verify service account has **Editor** role (not just member)
4. Re-download JSON key
5. Try again

### APK Won't Install on Phone
```
"App not installed" or "Cannot parse file"
```

**Solutions:**
- [ ] Check Android version (device must be Android 6.0+)
- [ ] Enable installation from unknown sources:
      Settings → Apps → Special app access → Install unknown apps
- [ ] Delete previous version before installing new one
- [ ] Try different install method (email vs QR vs USB)

### App Crashes on Launch
```
Crashes on startup for all users
```

**Quick fix:**
```powershell
# Check logs from device:
adb logcat | grep "E/AndroidRuntime"

# Fix code
npm run start  # Test locally first

# Rebuild and submit hotfix
eas build --platform android --profile production --clear-cache
eas submit --platform android --latest

# Release new version
```

---

## Quick Command Reference

```powershell
# Setup (first time only)
npm install -g eas-cli expo-cli
eas login
eas init

# Development & Testing
npm install
npm run start

# Building
eas build --platform android --profile preview          # Test APK
eas build --platform android --profile production       # Store AAB

# Submission
eas submit --platform android --latest                  # Submit to store

# Monitoring
eas build --list                                        # Check build status
eas device --list                                       # Linked devices
```

---

## Optional: GitHub Actions CI/CD

For automated builds on every commit:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Play Store

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install -g eas-cli
      - run: npm install -g expo-cli
      - run: |
          cd frontend
          npm install
          eas build --platform android --profile production
          eas submit --platform android --latest
        env:
          EAS_TOKEN: ${{ secrets.EAS_TOKEN }}
```

---

## Support & Resources

- **EAS Build Docs:** https://docs.expo.dev/build/
- **Play Store Submission:** https://play.google.com/console
- **Expo Community:** https://community.expo.dev/
- **React Native Docs:** https://reactnative.dev/

---

## Summary Timeline

| Phase | Time | Status |
|-------|------|--------|
| Setup Tools | 5-10 min | `[ ]` |
| Test Build | 20 min | `[ ]` |
| Device Testing | 10-30 min | `[ ]` |
| Production Build | 15-20 min | `[ ]` |
| Play Store Setup | 10-15 min | `[ ]` |
| Submit & Review | 2-4 hours | `[ ]` |
| **LIVE** | **~3-4 hours total** | `[ ]` |

---

**Last Updated:** April 16, 2026
**GigShield Version:** 1.0.0
**EAS Build Version:** 5.9.0+
