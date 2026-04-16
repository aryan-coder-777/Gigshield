# GigShield Play Store Deployment - Troubleshooting Guide

## Problem: Build Fails with Metro/Bundling Errors

### Error Messages You Might See
```
"Metro bundling failed"
"Failed to run build"
"Transforming /app/index.ts..."
"Metro error: [ModuleNotFound]"
```

### Cause
- Dependency version conflicts
- TypeScript configuration issues
- Node modules cache corruption
- Missing peer dependencies

### Solution (Try in Order)

**1. Clear everything and reinstall:**
```powershell
cd d:\AI Integration\gigshield\frontend

# Remove caches
rm -r node_modules
rm package-lock.json
npm cache clean --force

# Reinstall with legacy peer deps
npm install --legacy-peer-deps
```

**2. Clear EAS cache and rebuild:**
```powershell
eas build --platform android --profile production --clear-cache
```

**3. If still failing, check TypeScript:**
```powershell
# Check for TypeScript errors locally first
npx tsc --noEmit
```

**4. Nuclear option (only if nothing else works):**
```powershell
# Remove all build artifacts
rm -r .expo
rm eas.json
rm -r node_modules

# Start fresh
npm install --legacy-peer-deps
eas init
eas build --platform android --profile preview
```

---

## Problem: Authentication Failed with EAS/Play Store

### Error Messages
```
"Not authenticated"
"Invalid credentials"
"Unauthorized (401)"
```

### Solution

**For EAS Login:**
```powershell
eas logout
eas login
# Follow browser login

# Verify
eas whoami
```

**For Play Console Service Account:**

1. Go to https://play.google.com/console
2. Settings → Developer account → API access
3. Find your service account
4. Check roles: Should be **Editor** (not just member)
5. If wrong role:
   - Click service account
   - Grant **Editor** rights
6. Delete existing key:
   - Click service account
   - Keys → Delete old keys
7. Create new key:
   - Click service account → Keys → Create new key → JSON
8. Download and save as `frontend/gigshield-play-account.json`

**Verify access:**
```powershell
# In Google Cloud Console (linked from Play Console)
# Ensure:
# - Google Play Developer API is ENABLED
# - Service account has Editor role
# - Project linked correctly
```

---

## Problem: Build Stuck or Times Out

### Symptoms
- Build shows 95% for 15+ minutes
- Build dies with network timeout
- "Build timeout" error

### Solution

**Check build status:**
```powershell
eas build --list
```

**See detailed logs:**
```
Try visiting the build URL shown in EAS dashboard
at https://expo.dev/eas
```

**If genuinely stuck:**
```powershell
# Cancel (Ctrl+C in terminal, might not work)
# Just wait up to 30 minutes for EAS to timeout

# Check if it eventually succeeded
eas build --list

# If failed, rebuild (EAS caches your code)
eas build --platform android --profile production
# Second attempt usually succeeds or fails quickly
```

**Common causes:**
- Large node_modules being uploaded (unlikely with .easignore)
- Network latency
- First-time build (EAS builds gradle dep cache - takes longer)
- Free tier queue delay

---

## Problem: App Won't Install on Phone

### Error Messages on Phone
```
"App not installed"
"Parse error"
"File corrupted"
"Cannot read file"
```

### Solution

**First: Enable unknown app installation**
```
On your Android phone:
1. Go to Settings
2. Apps
3. Special app access
4. Install unknown apps
5. Find your browser / file manager
6. Toggle ON
```

**Then try installation again:**
- Via email link: Check email, tap link, tap Install
- Via QR code: Scan → Install
- Via USB file: Connect phone, copy APK, tap on phone

**If still fails:**

**Check device Android version:**
```
Settings → About phone → Android version
Must be Android 6.0 or newer (API level 23)
```

**If older device:**
```
Contact user: "Your device needs Android 6.0+"
Or lower minSdkVersion in app.json:
"android": {
  "minSdkVersion": 21  // Changed from 23
}
```

**Try different APK:**
```
# Delete app from phone completely
Settings → Apps → GigShield → Uninstall

# Rebuild test APK
eas build --platform android --profile preview --clear-cache

# Try new APK
```

---

## Problem: App Crashes on Launch

### Error on Phone
```
"Unfortunately, GigShield has stopped"
Crash immediately on startup
```

### Cause & Solution

**Step 1: Check logcat while app runs**
```powershell
# If you have Android SDK installed (bonus troubleshooting):
adb logcat | grep -i gigshield

# Look for actual error, e.g., "NullPointerException"
```

**Step 2: Test locally first**
```powershell
cd frontend
npm run start

# Choose "a" for Android (or preview on device)
# If it works here, then build issue
```

**Step 3: Check app permissions**
```
On phone:
Settings → Apps → GigShield → Permissions
Make sure:
- Location access: ALLOW
- Other requested: ALLOW
```

**Step 4: Check for runtime errors**
```powershell
# Look for common issues:
grep -r "require.main" frontend/src/
grep -r "import.*android" frontend/src/
grep -r "NativeModules" frontend/src/

# These might break builds
```

**Step 5: Rebuild with debugging**
```powershell
# Rebuild APK
eas build --platform android --profile preview --clear-cache

# Reinstall cleanly
# Delete app: Settings → Apps → GigShield → Uninstall
# Install new APK
```

**Step 6: Check backend connectivity**
```
If app starts but crashes when calling API:
- Check backend is running
- Check API_URL is correct
- Check network request code in src/lib/api.ts
```

---

## Problem: Metro TypeScript Issues (Local Development)

### Error When Running `npm run start`
```
"Unable to resolve module"
"Module not found"
"Failed to normalize"
"Transforming file.tsx / index.ts failed"
```

### Cause
- TypeScript configuration mismatch
- React Native Metro not finding modules
- Native module incompatibilities (your specific issue!)

### Solution (These Work Around Your Problem)

**Quick fix for local dev:**
```powershell
cd frontend

# Clear Metro cache
npm run start -- -c

# Or more aggressive
rm -rf $TMPDIR/metro-cache
npm run start -- -c --reset-cache
```

**If Metro keeps breaking:**
```powershell
# Metro might not be your issue if using EAS
# But for local testing:

npm install --legacy-peer-deps

# Add metro config file (frontend/metro.config.js):
```

Create `frontend/metro.config.js`:
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix native module resolution
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (target, name) => {
      if (target.hasOwnProperty(name)) {
        return target[name];
      }
      return require.resolve(name);
    },
  }
);

module.exports = config;
```

**Then restart:**
```powershell
npm run start -c
```

**Why EAS doesn't have this problem:**
- EAS uses tested Metro versions
- Your local Metro 0.83 ≠ React Native 0.73 compatible
- Cloud build handles versioning correctly

---

## Problem: Service Account Permission Error

### Error During Submit
```
"Forbidden (403)"
"The caller does not have permission to access this resource"
"Error: Permission denied"
```

### Cause
- Service account doesn't have Editor role
- Service account not fully authorized
- Google Play API not enabled

### Solution

**Step 1: Check API is enabled**
1. Go to https://console.cloud.google.com/
2. Search: "Google Play Developer API"
3. Should show "ENABLED"
4. If not: Click "Enable"

**Step 2: Check service account role**
1. Play Console → Settings → API access
2. Find your service account in "Service accounts"
3. Click service account name
4. Scroll to "Roles and permissions"
5. Should show "Editor" role (not "Member" or custom role)

**Step 3: Fix roles if needed**
1. In Play Console (not Google Cloud):
   - Settings → API access
   - Find service account
   - Click checkbox next to it
   - Grant new permissions
   - Choose "Admin" role
   - Save

**Step 4: Regenerate key**
1. Google Cloud Console → Service Accounts
2. Find your service account: `gigshield-eas`
3. Keys tab
4. Delete all old JSON keys
5. Create new key → JSON
6. Download new JSON file
7. Save to `frontend/gigshield-play-account.json`

**Step 5: Try submit again**
```powershell
cd frontend
eas submit --platform android --latest
# Path to service account: ./gigshield-play-account.json
```

---

## Problem: Build Completed But Can't Find Download Link

### Symptoms
- Build finished successfully
- Output scrolled away
- Can't find APK/AAB download

### Solution

**View build list:**
```powershell
eas build --list

# Should show:
# ┌─────────┬────────────────────────────┐
# │ ID      │ Status    │ Platform │ Ver  │
# ├─────────┼────────────────────────────┤
# │ abc1234 │ FINISHED  │ android  │ 1.0  │
# └─────────┴────────────────────────────┘
```

**Open in browser:**
```
Visit https://expo.dev/eas/build/[BUILD_ID]
Where BUILD_ID is the ID from above list
Available for download there
```

**Or forward to device:**
```
In that browser page, you can:
- Email download link
- Generate QR code
- Scan with phone to download
```

---

## Problem: "Invalid Package Name"

### Error Messages
```
"com.gigshield.app is not a valid package name"
"Package name does not match pattern"
```

### Cause
- Package name violates Android naming rules
- Special characters or uppercase letters

### Solution

**Valid Android package name format:**
```
com.companyname.appname

Rules:
- Must start with lowercase letter
- Can only use: a-z, 0-9, dots (.)
- Minimum 2 components: com.example
- No uppercase letters
- No hyphens or underscores
```

**Update app.json:**
```json
"android": {
  "package": "com.gigshield.app",
  ...
}
```

**Examples:**
```
✅ Valid:
com.gigshield.app
com.gigshield
com.yourcompany.gigshield
io.gigshield.app

❌ Invalid:
com.GigShield.app          (uppercase)
com-gigshield-app          (hyphens)
com.gigshield app          (spaces)
gigshield.app              (missing company prefix)
```

---

## Problem: "Version Code Already Exists"

### Error When Submitting
```
"Version code X has already been uploaded"
"Cannot re-upload same version"
```

### Cause
- You submitted twice with same `versionCode`
- EAS automatically generates versionCode
- Google Play keeps all versions permanently

### Solution

**Increment version:**

Edit `frontend/app.json`:
```json
{
  "expo": {
    "version": "1.0.1",    // Changed from 1.0.0
    "android": {
      "versionCode": 2      // Changed from 1
    }
  }
}
```

**Then rebuild:**
```powershell
eas build --platform android --profile production
eas submit --platform android --latest
```

**Version strategy:**
```
versionCode increments for every build:
v1.0.0 → versionCode: 1
v1.0.1 → versionCode: 2
v1.1.0 → versionCode: 3
v2.0.0 → versionCode: 4

"version" is user-facing (1.0.0, 1.0.1, etc.)
"versionCode" is internal integer (1, 2, 3, etc.)

Always increment both for Play Store submissions
```

---

## Problem: App Review Taking Too Long

### Concerns
- Submitted 6+ hours ago, still in review
- Got "In review" yesterday, not changing
- Worried it was rejected silently

### Solution

**Check review status:**
1. Play Console → GigShield app
2. Testing → Internal testing (or Production) → Releases
3. Look at release status

**Expected timelines:**
```
First-time app:       2-24 hours (usually 2-4 hours)
Subsequent updates:   1-4 hours (usually 1-2 hours)
Major issues:         Rejected same day with feedback
Weekends/holidays:    Can take longer
```

**If stuck >24 hours:**
1. Check email for rejection/issues
2. Try resubmitting:
   ```powershell
   # No need to rebuild, just resubmit
   eas submit --platform android --latest
   ```
3. Contact Google Play Support (in Play Console)

**If rejected:**
- Read rejection email carefully
- Fix the issue
- Increment versionCode
- Rebuild and resubmit

---

## Problem: Need to Downgrade to an Old Version

### Scenario
- Just released v1.0.1 but has critical bug
- Need to rollback to v1.0.0

### Solution

**Make it available again:**
```
You can't delete versions from Play Store,
but you can release older versions.
```

1. Play Console → GigShield → Production
2. Create new release
3. Select your v1.0.0 build from past builds
4. Submit as new release for review
5. v1.0.0 becomes latest for new users

**Or if emergency:**
```
Immediately unpublish the bad version:
1. Play Console → Production → Release management
2. Manage → Deactivate release
3. App removed from store temporarily

Then release older version
```

---

## Problem: Want to Test Internal Build Before Public

### Build Pipeline
```
Development (local) 
         ↓
Preview Build (test APK)          ← You are here
         ↓
Production Build (AAB)
         ↓
Internal Testing (EAS Submit)     ← First release gate
         ↓
Staged Rollout (1% → 10% → 100%)  ← Gradual release (optional)
         ↓
Production Release                 ← Full public launch
```

### How to Gradually Release

**Step 1: Submit to Internal Testing**
```powershell
eas submit --platform android --latest
```

**Step 2: In Play Console, create staged rollout**
1. Play Console → GigShield → Production → Release management
2. Create release (from internal testing build)
3. "Staged rollout" tab
4. Start with 1% of users
5. Monitor crash rates 24 hours
6. Increase to 10%
7. Monitor 1-2 days
8. Increase to 50%
9. Monitor
10. Increase to 100%

**This way:**
- Only 1% affected by bugs initially
- If problem found, unpublish quickly
- Other 99% haven't gotten bad version yet

---

## Problem: Running Out of Free Build Quota

### Situation
```
"Monthly free builds exhausted"
"Next build costs $X"
"Upgrade to premium?"
```

### Explanation
```
Free tier: 1 build/month
After that: $0.50-$2 per build (pay-as-you-go)
OR: $99/month for priority queue (unlimited builds)
```

### Options

**1. Wait Until Next Month**
   - Builds reset: 1st of each month
   - If non-urgent, wait

**2. Pay Per Build**
   - Each build: ~$1-2
   - No commitment
   - Good for occasional builds
   - Link payment method in Expo Dashboard

**3. Go Premium**
   - $99/month for unlimited builds
   - Priority queue
   - Good if building daily

**4. Optimize Builds**
   - Make fewer changes before building
   - Test locally more with `npm run start`
   - Batch multiple features into one build

---

## Problem: Can't Remember Expo Username

### Need It For
- `"owner"` field in app.json
- Service account setup
- EAS configuration

### Solution

**Check locally:**
```powershell
eas whoami
# Shows your Expo username
```

**Or online:**
```
Visit https://expo.dev/dashboard
Log in → Your profile shows username in URL:
https://expo.dev/@username
```

**Or use email:**
```
You don't necessarily need username,
you can authenticate with email + password
eas login --email youremail@example.com
```

---

## Quick Diagnostic Command

**When something breaks, run this:**
```powershell
# Check everything at once
Write-Host "Node version:"
node --version

Write-Host "`nEAS login status:"
eas whoami

Write-Host "`nEAS CLI version:"
eas --version

Write-Host "`nBuild history:"
eas build --list --limit 5

Write-Host "`nDependencies:"
npm ls --depth=0
```

**If all this works, your setup is solid!**

---

## Getting Live Chat Support

**When to contact Expo Support:**
- Build fails with cryptic error
- Account restricted / suspended
- Payment / billing issues
- EAS service is down

**Where to get help:**
1. **Expo Community Forum:** https://community.expo.dev/
2. **GitHub Issues:** https://github.com/expo/eas-cli/issues
3. **Email Support:** support@expo.dev (premium account)
4. **Stack Overflow:** Tag `[expo]` `[eas-build]`

---

**Last Updated:** April 16, 2026
