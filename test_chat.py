import urllib.request
import json

try:
    req = urllib.request.Request(
        'http://127.0.0.1:8001/api/chat/',
        data=json.dumps({"message": "hello"}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as f:
        print("Status Code:", f.getcode())
        print("Response:", f.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Response:", e.read().decode('utf-8'))
except Exception as e:
    print("General Error:", str(e))
