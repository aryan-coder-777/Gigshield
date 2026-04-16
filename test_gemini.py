import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv('backend/.env')

gemini_key = os.getenv('GEMINI_API_KEY')
print("Key length:", len(gemini_key) if gemini_key else 0)

try:
    genai.configure(api_key=gemini_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    print("Testing gemini generate_content...")
    response = model.generate_content("hello")
    print("Success. Response:")
    if response.text:
        print(response.text.strip())
except Exception as e:
    print(f"Exception happened: {type(e).__name__} - {str(e)}")
