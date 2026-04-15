# ✅ VERCEL DEPLOYMENT QUICK START

## Your GitHub Repository:

```
https://github.com/aryan-coder-777/Gigshield
```

## Deployment Steps (2 minutes):

### 1️⃣ Go to Vercel Dashboard

Visit: **https://vercel.com/dashboard**

### 2️⃣ Import Project

1. Click **"Add New..."** → **"Project"**
2. Click **"Import Git Repository"**
3. Search for **"Gigshield"** and select it
4. Click **"Import"**

### 3️⃣ Configure (if needed)

Vercel should auto-detect:

- **Framework:** Expo
- **Build Command:** `cd frontend && npm install && npm run build:web`
- **Output Directory:** `frontend/dist`

If not, set them manually before deploying.

### 4️⃣ Click **DEPLOY** ✨

- Build takes ~3-5 minutes
- You'll get a URL like: **`https://gigshield-xxx.vercel.app`**

---

## Your Hackathon Submission Links:

```
🌐 Live Web Demo:  https://gigshield-xxx.vercel.app
💻 GitHub Code:    https://github.com/aryan-coder-777/Gigshield
📱 Mobile QR:      (from EAS Build - optional)
```

---

## ⚠️ Important Notes:

**What Works:**
✅ Authentication & Login (demo: 9876543210/ravi1234)
✅ Dashboard with real-time data
✅ Claims history with fraud scores
✅ Policy management
✅ Chat interface
✅ Fraud detection status

**Limitations on Web:**
⚠️ Maps display may be limited
⚠️ Geolocation requests permission
⚠️ Mobile-specific features may be degraded

---

## Backend Connection:

If you need the web app to connect to your backend:

1. Deploy backend to a live server (Heroku, Cloud Run, etc.)
2. Add environment variable in Vercel:
   ```
   REACT_APP_API_URL = https://your-deployed-backend.com
   ```

For now, it will use the configured API URL in the code.

---

**Need Help?** Check `/VERCEL_DEPLOYMENT.md` in the repo for detailed troubleshooting.
