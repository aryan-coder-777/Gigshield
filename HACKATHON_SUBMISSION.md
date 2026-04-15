# 🚀 COMPLETE DEPLOYMENT GUIDE FOR HACKATHON SUBMISSION

## Your Live URLs (For Judges)

After following all steps below, you'll have:

```
Frontend:  https://gigshield-hoef.vercel.app
Backend:   https://gigshield-backend-xxxx.onrender.com  (will be provided)
GitHub:    https://github.com/aryan-coder-777/Gigshield
```

---

## STEP 1: Deploy Backend to Render (FREE) ✅

### 1a. Go to Render.com

1. Visit https://render.com
2. Sign up with GitHub (click "Sign up with GitHub")
3. Authorize Render to access your GitHub repos

### 1b. Create Backend Service

1. Click **"New +"** → **"Web Service"**
2. Select **"Build and deploy from a Git repository"**
3. Search for and select **`Gigshield`** repo
4. Fill in:
   - **Name:** `gigshield-backend`
   - **Environment:** `Python 3.11` (select from dropdown)
   - **Build Command:** `pip install -r requirements.txt` (auto-detected)
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - **Plan:** FREE

5. Click **"Create Web Service"**
6. Wait 3-5 minutes for deployment

### 1c. Get Your Backend URL

Once deployed, you'll see a URL like:

```
https://gigshield-backend-xxxx.onrender.com
```

**Copy this URL** - you'll need it next!

---

## STEP 2: Update Frontend with Backend URL ⚡

### 2a. In VS Code, go to Vercel Project Settings

1. Visit: https://vercel.com/dashboard
2. Select **`gigshield-hoef`** project
3. Click **Settings** tab
4. Go to **Environment Variables**
5. Add new variable:
   ```
   Name:  EXPO_PUBLIC_API_URL
   Value: https://gigshield-backend-xxxx.onrender.com  (your Render URL from Step 1c)
   ```
6. Click **Save**

### 2b. Trigger Redeploy on Vercel

1. Go back to **Deployments** tab
2. Find latest deployment
3. Click **"Redeploy"** button
4. Wait 2-3 minutes

---

## STEP 3: TEST EVERYTHING ✅

1. **Open Vercel URL:** https://gigshield-hoef.vercel.app
2. **Login with demo credentials:**
   - Phone: `9876543210`
   - Password: `ravi1234`
3. **Check if it works:**
   - Dashboard loads ✅
   - Claims display ✅
   - No "Cannot connect to server" error ✅

---

## STEP 4: SUBMIT TO HACKATHON 🎯

Send judges these 3 links:

```
📱 Live Web App:
https://gigshield-hoef.vercel.app

💻 GitHub Repository:
https://github.com/aryan-coder-777/Gigshield

📋 Test Credentials:
Phone: 9876543210
Password: ravi1234
```

---

## ✨ FEATURES AVAILABLE FOR JUDGES

✅ Anti-Fraud Detection System
✅ Parametric Insurance Claims
✅ Real-time Fraud Score Calculation (TRUSTED/REVIEW/BLOCKED)
✅ Dashboard with Claims History
✅ Policy Management
✅ Chat Interface
✅ GPS Validation & Zone Coverage
✅ Weather-based Triggers

---

## 🆘 TROUBLESHOOTING

**Problem:** "Cannot connect to server" error

- Wait 5 minutes (Render takes time to start)
- Check that Render deployment is "Live"
- Verify EXPO_PUBLIC_API_URL is set correctly in Vercel

**Problem:** Render deployment failed

- Check build logs in Render dashboard
- Make sure `backend/requirements.txt` is in GitHub
- Ensure `backend/app/main.py` exists

---

## 📅 Timeline

- **Now:** Deploy backend to Render
- **5 min:** Backend live
- **5 min:** Set env var in Vercel
- **3 min:** Vercel redeploy
- **15 min TOTAL:** Everything live ✅
