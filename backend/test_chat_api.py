#!/usr/bin/env python3
"""Test the fixed chat API"""
import requests
import json

BASE_URL = 'http://localhost:8001'

# Login
print('Logging in...')
login_data = {'phone': '9876543210', 'password': 'ravi1234'}
login_resp = requests.post(f'{BASE_URL}/api/v1/auth/login', json=login_data)
token = login_resp.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

print('\n=== Testing Chat API After Fix ===\n')

# Test 1: Normal chat
print('1. Normal Chat (hello)...')
chat_resp = requests.post(f'{BASE_URL}/api/chat/', 
    json={'message': 'hello', 'deep_research': False}, 
    headers=headers)
print(f'   Status: {chat_resp.status_code}')
if chat_resp.status_code == 200:
    reply = chat_resp.json().get('reply')
    print(f'   Response: {reply[:100]}...')
    print('   ✓ SUCCESS')
else:
    print(f'   ERROR: {chat_resp.text}')

# Test 2: Deep research chat
print('\n2. Deep Research Chat (analyze my claims)...')
chat_resp = requests.post(f'{BASE_URL}/api/chat/', 
    json={'message': 'analyze my claims', 'deep_research': True}, 
    headers=headers)
print(f'   Status: {chat_resp.status_code}')
if chat_resp.status_code == 200:
    reply = chat_resp.json().get('reply')
    print(f'   Response: {reply[:100]}...')
    print('   ✓ SUCCESS')
else:
    print(f'   ERROR: {chat_resp.text}')

print('\n=== All tests completed! ===')
