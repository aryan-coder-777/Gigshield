import urllib.request
import json

def login():
    req = urllib.request.Request(
        'http://127.0.0.1:8001/api/v1/auth/login',
        data=json.dumps({"phone": "9876543210", "password": "ravi1234"}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as f:
        data = json.loads(f.read().decode('utf-8'))
        return data['access_token']

def chat(token):
    req = urllib.request.Request(
        'http://127.0.0.1:8001/api/chat/',
        data=json.dumps({"message": "hello"}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    try:
        with urllib.request.urlopen(req) as f:
            print("Chat Response:", f.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print("Chat HTTP Error:", e.code)
        print("Chat Error Body:", e.read().decode('utf-8'))
    except Exception as e:
        print("Chat General Error:", str(e))

if __name__ == "__main__":
    try:
        t = login()
        print("Logged in. Token:", t[:10], "...")
        chat(t)
    except Exception as e:
        print("Exception:", e)
