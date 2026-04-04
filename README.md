# GigShield

**AI-Powered Parametric Income Insurance for India's Gig Economy**

GigShield is an innovative, full-stack application designed to provide micro-insurance to gig workers (delivery partners, drivers, etc.) facing daily income disruptions due to severe weather, platform outages, or localized riots. The system detects disruptions automatically via external API triggers (weather, platform status) and instantly initiates payouts directly to the worker's UPI account, effectively eliminating the hassle of manual claims.

---

## 🌟 Key Features

### Worker App (Frontend)
Built with **React Native (Expo)** to provide a premium, modern, and trustworthy user experience.
- **Dynamic Onboarding:** Beautiful onboarding wizard ("Choose Your Gig") capturing work zones, platform details, and risk profiles.
- **Premium UX Design:** Clean "insurance-tier" aesthetic featuring glassmorphism, dynamic typography (Inter/Outfit), and tailored dark modes.
- **Live Dashboard:** Real-time disruption monitoring, earnings protection status, and active weather alerts.
- **Policy Management:** Seamless ways to view, activate, and upgrade insurance plans (Basic vs. Premium Coverages).
- **Instant Claims & Payouts Tracking:** View real-time claim status and payout receipts powered by a dedicated robust UI.
- **Custom Branded Components:** Includes specialized elements like `ConfirmModal`, `Toast` notifications, and beautiful chart/statistics components.

### Core Platform (Backend)
Robust backend API built using **FastAPI (Python)**.
- **Automated Parametric Triggers:** Continuously polls triggers via background schedulers (`APScheduler`) to detect anomalous events (heavy rain, heatwaves, platform outages).
- **AI Fraud Detection:** Incorporates an advanced AI service to rate incoming claims against historical weather data, GPS integrity, and worker behavioral signals.
- **Instant Payout Integrations:** Architecture to process real-time payouts via UPI and services like Razorpay/Stripe securely.
- **Structured Logging:** Advanced hierarchical HTTP and action tracking logs for deep observability and compliance.
- **Admin Insights & Monitoring:** REST endpoints exposing platform insights and overall risk exposure for underwriters.

---

## 🏗️ Technology Stack

**Frontend Frameworks & Libraries**
- React Native & Expo
- React Navigation (Bottom Tabs & Native Stack)
- Zustand (State Management)
- Tanstack React Query (Data Fetching / Caching)
- Expo Vector Icons, Safe Area Context, Haptics, and Linear Gradient for rich aesthetics

**Backend Frameworks & Libraries**
- FastAPI & Uvicorn
- SQLAlchemy (Async Postgres & SQLite Support)
- APScheduler (Background trigger monitoring)
- Scikit-Learn/AI Models (`models_pkl/`) for fraud detection

---

## 🚀 Getting Started

### Option A: 1-Click Launch (Windows Only)
Simply double click the `START_GIGSHIELD.bat` file in the root directory. It will automatically launch two terminal windows, install backend/frontend dependencies, and start both the API and the Mobile App simultaneously!

### Option B: Manual Setup

#### 1. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```
*Note: The backend runs an automatic database initialization script that creates the tables and populates demo data (Ravi/Admin profiles) using `app/main.py:seed_demo_data()`.*

**Demo Credentials (automatically seeded):**
- Worker: `phone: 9876543210`, `pass: ravi1234`
- Admin: `phone: 0000000000`, `pass: admin123`

#### 2. Frontend Setup

```bash
cd frontend
npm install
npm run start
```
Use the Expo Go app on your physical device, or run it on an Android/iOS emulator.

---

## 📂 Project Structure

```text
gigshield/
│
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI route handlers (auth, claims, policies, triggers)
│   │   ├── core/              # Config, database setup, and structured loggers
│   │   ├── models/            # SQLAlchemy Database Models
│   │   ├── schemas/           # Pydantic schemas for request/response validation
│   │   └── services/          # Business logic, trigger monitor, AI fraud logic
│   ├── models_pkl/            # Cached AI/ML models 
│   ├── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── navigation/        # React Navigation setups (WorkerTabNavigator, etc.)
    │   ├── screens/           # Separate UI screens (Auth, Dashboard, Policy, Claims)
    │   ├── components/        # Reusable custom UI components (ConfirmModal, Toast)
    │   ├── store/             # Zustand state stores (authStore, etc.)
    │   └── lib/               # API clients (Axios)
    ├── App.tsx                # Entry point
    └── package.json           # React Native/Expo dependencies
```

---

## 🤝 Roadmap / Enhancements Made
This project has recently undergone significant tech audits focusing on:
- 📈 **Performance & Logging:** Full implementation of structured logging.
- 🎨 **GigGuard Design System:** Migration to a modern, dynamic, and animated design system for all consumer-facing screens.
- 🛡️ **Policy Engine Polish:** Complete end-to-end functionality for the Ravi persona to buy coverage, see active triggers, and experience fully automated parametric payouts. 

---
*Built to bring financial resilience to the backbone of the gig economy.*
