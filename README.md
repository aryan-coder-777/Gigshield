# GigShield

Parametric income insurance for gig workers in India. Automatically detects income disruptions due to weather, platform outages, or local events, and processes instant payouts directly to worker UPI accounts.

## Features

**Worker App**

- Onboarding wizard to set work zones, platform, and risk profile
- Real-time dashboard showing active policies and earnings protection status
- Policy management with Basic and Premium coverage options
- Instant claim status and payout history tracking
- Live weather alerts and disruption detection

**Backend Platform**

- Automated parametric trigger detection using background scheduler
- AI-powered fraud detection using historical weather data and worker behavioral signals
- Real-time payout processing via UPI
- Admin dashboard for risk monitoring and insights
- Structured logging for observability and compliance

## Tech Stack

Frontend: React Native, Expo, React Navigation, Zustand, TanStack Query

Backend: FastAPI, SQLAlchemy, APScheduler, Scikit-Learn

Database: SQLite (development), PostgreSQL (production)

## Getting Started

### Quick Start (Windows)

Double-click `START_GIGSHIELD.bat` to automatically set up and launch both backend and frontend.

### Manual Setup

**Backend**

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Demo credentials:

- Worker: `9876543210` / `ravi1234`
- Admin: `0000000000` / `admin123`

**Frontend**

```bash
cd frontend
npm install
npm run start
```

Scan the QR code with Expo Go app on your device or use an emulator.

## Project Structure

```
gigshield/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Configuration and database setup
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Request/response validation
│   │   └── services/     # Business logic
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── screens/      # UI screens
    │   ├── components/   # Reusable components
    │   ├── navigation/   # React Navigation setup
    │   └── store/        # State management
    └── package.json
```

## How It Works

1. Worker signs up and activates a policy for their work zone
2. System monitors weather APIs and platform status endpoints
3. When a disruption is detected, a parametric trigger is activated
4. Eligible workers receive automatic payouts to their UPI account
5. Workers can track payout history in their dashboard

## Architecture

The system uses parametric insurance - meaning payouts are triggered by external events (weather, platform status) rather than manual claims. No claim validation process needed, resulting in instant payouts.

**Trigger Types**

- Heavy rainfall alerts
- Temperature extremes
- Platform outages
- Local traffic restrictions

## Development

```bash
# Run backend tests
cd backend
pytest

# Run backend with hot reload
uvicorn app.main:app --reload

# Run frontend on specific platform
cd frontend
expo start --android
expo start --ios
```

## Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Go to https://vercel.com/dashboard and import the repository
3. Set environment variable:
   - `EXPO_PUBLIC_API_URL=https://your-render-backend-url.onrender.com`
4. Deploy

### Backend (Render)

1. Push code to GitHub
2. Go to https://dashboard.render.com and create a new Web Service
3. Connect your GitHub repository
4. Set environment variables in Render dashboard:
   - `DATABASE_URL=postgresql://user:password@host/gigshield`
   - `DEBUG=False`
   - `SECRET_KEY=your-production-secret-key`
   - Update `ALLOWED_ORIGINS` in backend config to include Vercel URL
5. Deploy

### Environment Variables

**Local Development**

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
# Edit .env with your Gemini API key, database URL, etc.
```

**Production**

Set environment variables directly in your cloud provider dashboard:

- **Vercel**: Set `EXPO_PUBLIC_API_URL` to your Render backend URL
- **Render**: Set `DATABASE_URL`, `SECRET_KEY`, `DEBUG=False`, and other vars from `.env.example`

Never commit `.env` files to git - keep API keys private.

## Troubleshooting

**Issue: "Login Failed: Cannot connect to the server"**

This happens when the frontend cannot reach the backend API. Check:

1. Backend is running on correct port (8001 local, or check Render URL)
2. Frontend has correct backend URL in environment variables:
   - Local: Check `frontend/src/lib/api.ts` default URLs
   - Production: Set `EXPO_PUBLIC_API_URL` in Vercel environment variables
3. CORS is configured correctly in backend (`backend/app/core/config.py`)
4. Network/firewall allows the connection

**Prevention Checklist Before Deploying:**

- [ ] Backend successfully starts and logs are clean
- [ ] Frontend environment variables point to correct backend URL
- [ ] Test login locally with demo credentials before pushing to production
- [ ] Verify Render backend URL is accessible (curl or browser test)
- [ ] Vercel build completes without errors
- [ ] Database migrations run successfully on Render

## License

MIT
