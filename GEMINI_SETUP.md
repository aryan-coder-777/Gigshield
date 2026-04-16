# 🤖 GigShield AI Chat Integration Guide

## Overview

GigShield now integrates **Google Gemini AI** for an intelligent chat assistant. The chatbot helps workers understand their policies, claims, and coverage with contextual, personalized responses.

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Get Your Gemini API Key

1. Go to **https://ai.google.dev/**
2. Click **"Get API Key"** button (top right)
3. Sign in with your Google account
4. Click **"Create API key in new project"**
5. Copy the generated API key

### Step 2: Configure the Backend

1. Navigate to the `backend/` folder
2. Copy the template file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and paste your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_key_here_without_quotes
   ```
4. Save the file

### Step 3: Verify Configuration

Run the validation script to check everything is set up:

```bash
cd backend
python validate_config.py
```

You should see:

```
✓ Gemini API Key................ OK
✓ Gemini Connection Test........ OK
```

### Step 4: Start the Backend

```bash
# Install dependencies (if not already done)
pip install -r requirements.txt

# Start API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### Step 5: Test in the App

1. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run start
   ```
2. Log in with test credentials: `9876543210` / `ravi1234`
3. Click the **chat icon** (💬)
4. Ask a question like: _"What's my coverage?"_

---

## 🔍 Features

### 1. Basic Chat

Normal conversational mode for quick questions:

- Policy information
- Claims status
- Coverage details
- How parametric insurance works

### 2. Deep Research Mode (NEW!)

Enable comprehensive analysis:

- Type: **`research`** to toggle research mode
- Get detailed insights about your claims
- Receive optimization suggestions
- Analyze coverage patterns

Example:

```
User: research
AI: 🔍 Deep Research Mode Enabled!

User: Analyze my claims
AI: Your claims show a pattern of weather disruptions in Zone 2...
```

---

## 🐛 Troubleshooting

### Issue: "I'm having trouble connecting right now"

**Solution 1: Check API Key**

```bash
# In backend folder:
python -c "from app.core.config import settings; print('Key set:', bool(settings.GEMINI_API_KEY))"
```

**Solution 2: Verify Backend is Running**

```bash
# Test the API endpoint
curl http://localhost:8001/health
```

**Solution 3: Run Validation**

```bash
python backend/validate_config.py
```

---

### Issue: "Connection Error: Cannot reach the backend"

**Cause**: Frontend can't reach backend API

**Solutions**:

1. Ensure backend is running on port 8001
2. Check frontend `.env` has correct API URL:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:8001
   ```
3. On Android emulator, use: `http://10.0.2.2:8001`

---

### Issue: "API Key Error: Backend is misconfigured"

**Cause**: Invalid or expired API Key

**Solution**:

1. Get a fresh key from https://ai.google.dev/
2. Update `.env` in backend folder
3. Restart backend server

**Verify the key works**:

```python
import google.generativeai as genai
genai.configure(api_key="YOUR_KEY_HERE")
model = genai.GenerativeModel('gemini-1.5-flash')
response = model.generate_content("Test")
print(response.text)
```

---

## 📊 Error Messages & Solutions

| Error Message           | Cause                      | Fix                                |
| ----------------------- | -------------------------- | ---------------------------------- |
| 🔑 API Key Error        | Invalid/expired Gemini key | Get new key from ai.google.dev     |
| 🌐 Network Error        | Backend not running        | `uvicorn app.main:app --reload`    |
| ⏱️ Timeout Error        | Request too slow           | Check internet, retry              |
| 🔐 Authentication Error | Session expired            | Log out and log in again           |
| ⚠️ Server Error         | Backend error              | Check `uvicorn` console for errors |

---

## 💡 For Developers

### Backend Architecture

**File**: `backend/app/services/llm.py`

- `get_chat_response(query, context, enable_research)` - Main function
- Calls Google Gemini API with worker context
- Falls back to mock responses if no API key
- Includes comprehensive error handling

**File**: `backend/app/api/chat.py`

- FastAPI endpoint: `POST /api/chat/`
- Requires authentication via JWT token
- Gathers worker context from database
- Request schema:
  ```json
  {
    "message": "string",
    "deep_research": boolean
  }
  ```

### Frontend Architecture

**File**: `frontend/src/components/AIChatModal.tsx`

- React Native modal component
- Real-time message display
- Error logging with details
- Deep research mode toggle

**File**: `frontend/src/lib/api.ts`

- `chatAPI.sendMessage(message, deepResearch)`
- Includes JWT token in headers
- Handles network errors gracefully

---

## 🚀 Advanced: Using a Different LLM

Want to use Claude, GPT-4, or another model?

1. Update `backend/app/services/llm.py`:

   ```python
   def get_chat_response(query, context, enable_research=False):
       # Replace Gemini call with your API
       import anthropic
       client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)
       response = client.messages.create(...)
   ```

2. Add new API key to `.env`:

   ```
   CLAUDE_API_KEY=your_key
   ```

3. Update `backend/app/core/config.py` to load the key

---

## 📞 Support

If you encounter issues:

1. Check `validate_config.py` output
2. Review backend logs in the terminal
3. Check browser console (frontend errors)
4. Verify API key at https://ai.google.dev/

---

## 📝 Example Interactions

### Example 1: Basic Policy Question

```
User: What coverage do I have?
AI: You currently have coverage for Mumbai Zone 1, 2, 3.
Limit remaining: ₹5,000.
```

### Example 2: Claims Question

```
User: Why was my claim rejected?
AI: I see you're asking about claims. Your policies automatically
generate payouts when extreme weather or disruptions hit your zones.
Would you like to view your recent claims history?
```

### Example 3: Deep Research

```
User: research
AI: 🔍 Research mode enabled!

User: Analyze my earning patterns
AI: Based on your 25 claims history, you experience disruptions
most on monsoon weekends in Zone 2. Consider upgrading to Premium
coverage for higher limits.
```

---

## ✅ Checklist Before Going Live

- [ ] Gemini API key obtained and verified
- [ ] `.env` file created and API key added
- [ ] `validate_config.py` passes all checks
- [ ] Backend runs without errors on port 8001
- [ ] Frontend connects to backend API
- [ ] Chat modal opens and responds to messages
- [ ] Deep research mode toggles correctly
- [ ] Error messages display helpful diagnostics

---

**Last Updated**: April 2026  
**GigShield Version**: 2.0.0
