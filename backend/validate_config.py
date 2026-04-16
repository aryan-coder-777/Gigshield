#!/usr/bin/env python3
"""
GigShield Configuration Validator
Checks backend setup, API keys, and database connections.
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")

def print_status(label: str, status: str, details: str = ""):
    status_char = "[+]" if "OK" in status else "[-]" if "FAIL" in status else "[!]"
    print(f"  {status_char} {label:.<40} {status}")
    if details:
        print(f"    -> {details}")

def check_environment():
    """Check Python environment and dependencies."""
    print_header("PYTHON ENVIRONMENT")
    
    # Python version
    version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    print_status("Python Version", f"OK: {version}", f"Using: {sys.executable}")
    
    # Required packages
    required = [
        ("fastapi", "FastAPI Web Framework"),
        ("sqlalchemy", "Database ORM"),
        ("google.generativeai", "Google Gemini API"),
        ("apscheduler", "Task Scheduler"),
    ]
    
    missing = []
    for pkg_name, pkg_label in required:
        try:
            __import__(pkg_name)
            print_status(pkg_label, "OK")
        except ImportError:
            print_status(pkg_label, "FAIL: Not installed", f"Run: pip install {pkg_name}")
            missing.append(pkg_name)
    
    return len(missing) == 0

def check_api_keys():
    """Check API key configuration."""
    print_header("API KEY CONFIGURATION")
    
    try:
        from app.core.config import settings
        
        # Gemini API
        if settings.GEMINI_API_KEY:
            key_preview = settings.GEMINI_API_KEY[:10] + "..." if len(settings.GEMINI_API_KEY) > 10 else "***"
            print_status("Gemini API Key", f"OK (Set)", f"Key: {key_preview}")
        else:
            print_status("Gemini API Key", "⚠ NOT SET", "Chat will use mock responses. Get key from https://ai.google.dev/")
        
        # Optional APIs
        if settings.OWM_API_KEY:
            print_status("OpenWeatherMap API", "OK (Set)")
        else:
            print_status("OpenWeatherMap API", "⚠ Optional - Mock weather data will be used")
        
        if settings.WAQI_TOKEN:
            print_status("WAQI Air Quality API", "OK (Set)")
        else:
            print_status("WAQI Air Quality API", "⚠ Optional - Mock AQI data will be used")
        
        # Payment gateways (optional)
        if settings.RAZORPAY_KEY_ID:
            print_status("Razorpay Gateway", "OK (Set)")
        else:
            print_status("Razorpay Gateway", "⚠ Optional - Mock payouts will be simulated")
        
        return True
    except Exception as e:
        print_status("Config Loading", "FAIL", str(e))
        return False

def check_database():
    """Check database connectivity."""
    print_header("DATABASE CONFIGURATION")
    
    try:
        from app.core.config import settings
        
        if "postgresql" in settings.DATABASE_URL.lower():
            db_type = "PostgreSQL"
        elif "sqlite" in settings.DATABASE_URL.lower():
            db_type = "SQLite"
        else:
            db_type = "Unknown"
        
        db_url = settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else settings.DATABASE_URL[-30:]
        print_status(f"Database Type", f"OK: {db_type}", f"URL: ...{db_url}")
        
        if "sqlite" in settings.DATABASE_URL.lower():
            # For SQLite, check if file exists or can be created
            db_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "")
            path_obj = Path(db_path)
            if path_obj.exists():
                print_status("SQLite File", "OK: Exists", f"Path: {path_obj}")
            else:
                print_status("SQLite File", "ℹ New - will be created on first run", f"Path: {path_obj}")
        
        return True
    except Exception as e:
        print_status("Database Config", "FAIL", str(e))
        return False

def check_imports():
    """Verify backend can be imported."""
    print_header("BACKEND IMPORTS")
    
    try:
        from app.core.config import settings
        print_status("Config Module", "OK")
        
        from app.services.llm import get_chat_response
        print_status("LLM Service", "OK")
        
        from app.api.chat import router
        print_status("Chat Router", "OK")
        
        from app.main import app
        print_status("Main App", "OK")
        
        return True
    except Exception as e:
        print_status(f"Import Failed", "FAIL", str(e))
        return False

def test_gemini_connection():
    """Test actual Gemini API connection."""
    print_header("GEMINI API CONNECTION TEST")
    
    try:
        from app.core.config import settings
        
        if not settings.GEMINI_API_KEY:
            print_status("Gemini Key", "⚠ SKIPPED", "No API key set (using mock mode)")
            return True
        
        import google.generativeai as genai
        print_status("Import genai", "OK")
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        print_status("Configure API", "OK", "API key configured")
        
        # Try latest models
        models_to_try = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-pro-latest'
        ]
        
        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content("Say 'GigShield is ready' in 5 words or less.")
                
                if response.text:
                    print_status("API Response", "OK", f"Model: {model_name} | Response: '{response.text[:50]}...'")
                    return True
            except Exception as e:
                if "402" in str(e) or "quota" in str(e).lower():
                    print_status("API Response", "FAIL: Quota Exceeded", "You've exceeded your free tier quota. Upgrade at https://ai.google.dev")
                    return False
                continue
        
        print_status("Gemini Connection", "FAIL: No working models", "None of the supported models are available")
        return False
            
    except Exception as e:
        error_str = str(e).lower()
        if "api_key" in error_str or "unauthorized" in error_str:
            print_status("Gemini Connection", "FAIL: Invalid API Key", "Check GEMINI_API_KEY in .env")
        elif "connection" in error_str or "timeout" in error_str:
            print_status("Gemini Connection", "FAIL: Network Error", "Check internet connection")
        else:
            print_status("Gemini Connection", "FAIL", str(e)[:60])
        return False

def suggest_next_steps(all_ok):
    """Provide guidance based on checks."""
    print_header("NEXT STEPS")
    
    if all_ok:
        print("\n✓ All checks passed! Ready to start GigShield.")
        print("\nRun the backend with:")
        print("  cd backend")
        print("  python -m venv venv")
        print("  # Activate venv (Windows: venv\\Scripts\\activate, Mac/Linux: source venv/bin/activate)")
        print("  pip install -r requirements.txt")
        print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8001\n")
    else:
        print("\n⚠ Some checks failed. Follow the instructions above to resolve issues.")
        print("\nCommon fixes:")
        print("  1. Copy .env.example to .env and fill in your API keys")
        print("  2. Install dependencies: pip install -r requirements.txt")
        print("  3. Ensure your GEMINI_API_KEY is valid from https://ai.google.dev/\n")

def main():
    """Run all configuration checks."""
    print("\n" + "=" * 80)
    print("GigShield Backend Configuration Validator")
    print("=" * 80)
    
    checks = [
        ("Environment", check_environment),
        ("API Keys", check_api_keys),
        ("Database", check_database),
        ("Imports", check_imports),
        ("Gemini Connection", test_gemini_connection),
    ]
    
    results = {}
    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            print(f"\n❌ {name} check failed with exception: {e}")
            results[name] = False
    
    all_ok = all(results.values())
    suggest_next_steps(all_ok)
    
    # Return exit code
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
