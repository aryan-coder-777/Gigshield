# 🚀 Vercel Deployment Guide for GigShield

## Step 1: Push Project to GitHub

### 1a. Initialize Git (if not already done)

```powershell
cd "d:\AI Integration\gigshield"
git init
git add .
git commit -m "Initial commit: GigShield - AI Parametric Insurance App"
```

### 1b. Create a GitHub Repository

1. Go to https://github.com/new
2. Create repo named: `gigshield`
3. Choose Public (for hackathon submission)
4. Click "Create Repository"

### 1c. Push to GitHub

```powershell
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/gigshield.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy on Vercel

### 2a. Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub (recommended)
3. Authorize Vercel to access your GitHub repos

### 2b. Import Project

1. Click "Add New..." → "Project"
2. Select "Import Git Repository"
3. Find and select `gigshield` repository
4. Click "Import"

### 2c. Configure Build Settings

**Vercel should auto-detect:**

- **Framework: Expo**
- **Build Command:** `cd frontend && npm install && npm run build:web`
- **Output Directory:** `frontend/dist`
- **Install Command:** `npm install`

If not auto-detected, set manually:

**Environment Variables** (add if backend needs them):

```
REACT_APP_API_URL = https://your-backend-api.com
```

### 2d. Deploy

1. Click "Deploy"
2. Wait for build to complete (~3-5 minutes)
3. Once complete, you'll get a URL like: `https://gigshield-xxx.vercel.app`

---

## Step 3: Share with Hackathon

### Your Hackathon Links:

```
🌐 Live Web App:    https://gigshield-xxx.vercel.app
📱 Mobile (QR Code): [From EAS Build]
💻 GitHub Repo:     https://github.com/YOUR_USERNAME/gigshield
```

---

## Important Notes:

⚠️ **Web Version Limitations:**

- Maps display may have limited functionality (mobile-optimized)
- Some Expo modules may not work in browser
- Geolocation works but may ask for permission
- Secure storage features disabled on web

✅ **What Works Great:**

- Authentication & Login
- Dashboard & UI
- Claims viewing
- Policy management
- Chat interface
- Fraud status indicators

---

## Troubleshooting:

**Build fails with "expo not found":**

- Add `npm install -g expo-cli` to build command
- Or ensure `expo` is in frontend dependencies

**Port/API issues:**

- Update `REACT_APP_API_URL` environment variable
- Point to live backend API (not localhost:8001)

**Map component errors:**

- This is expected on web - maps work better on mobile
- App will still function without full map features

---

## Next Steps:

1. ✅ GitHub push complete
2. ✅ Vercel deployment live
3. Submit both links to hackathon:
   - Web: `https://gigshield-xxx.vercel.app`
   - GitHub: `https://github.com/YOUR_USERNAME/gigshield`
