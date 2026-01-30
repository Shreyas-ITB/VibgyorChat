#!/usr/bin/env python3
"""
Test script for admin bypass login endpoint
"""

import requests
import base64
import hashlib
import json

# Configuration
API_BASE_URL = "http://localhost:8000"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

def create_sha256_hash(text: str) -> str:
    """Create SHA256 hash of the given text"""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def test_bypass_login(email: str):
    """Test the admin bypass login endpoint"""
    
    print(f"\n🧪 Testing bypass login for: {email}")
    print("=" * 50)
    
    # Step 1: Encode email to base64
    email_base64 = base64.b64encode(email.encode('utf-8')).decode('utf-8')
    print(f"📧 Email (base64): {email_base64}")
    
    # Step 2: Create admin credential hashes
    username_hash = create_sha256_hash(ADMIN_USERNAME)
    password_hash = create_sha256_hash(ADMIN_PASSWORD)
    print(f"🔑 Admin username hash: {username_hash[:20]}...")
    print(f"🔑 Admin password hash: {password_hash[:20]}...")
    
    # Step 3: Prepare request payload
    payload = {
        "email_base64": email_base64,
        "admin_username_hash": username_hash,
        "admin_password_hash": password_hash
    }
    
    # Step 4: Make the request
    try:
        print(f"\n🚀 Making request to: {API_BASE_URL}/admin/bypass-login")
        response = requests.post(
            f"{API_BASE_URL}/admin/bypass-login",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📊 Status Code: {response.status_code}")
        
        # Parse response
        try:
            data = response.json()
            print(f"📄 Response: {json.dumps(data, indent=2)}")
            
            if response.status_code == 200 and data.get("success"):
                print("\n✅ SUCCESS: Bypass login worked!")
                print(f"👤 User: {data['user']['name']} ({data['user']['email']})")
                print(f"🎫 Access Token: {data['tokens']['access_token'][:50]}...")
                print(f"🔄 Refresh Token: {data['tokens']['refresh_token'][:50]}...")
                return True
            else:
                print(f"\n❌ FAILED: {data.get('detail', 'Unknown error')}")
                return False
                
        except json.JSONDecodeError:
            print(f"❌ Invalid JSON response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def test_invalid_scenarios():
    """Test various invalid scenarios"""
    
    print("\n🧪 Testing Invalid Scenarios")
    print("=" * 50)
    
    username_hash = create_sha256_hash(ADMIN_USERNAME)
    password_hash = create_sha256_hash(ADMIN_PASSWORD)
    
    # Test 1: Invalid base64
    print("\n1️⃣ Testing invalid base64...")
    payload = {
        "email_base64": "invalid-base64!",
        "admin_username_hash": username_hash,
        "admin_password_hash": password_hash
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/admin/bypass-login", json=payload)
        data = response.json()
        print(f"Status: {response.status_code}, Response: {data.get('detail', data)}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Invalid admin credentials
    print("\n2️⃣ Testing invalid admin credentials...")
    email_base64 = base64.b64encode("test@example.com".encode('utf-8')).decode('utf-8')
    payload = {
        "email_base64": email_base64,
        "admin_username_hash": "invalid_hash",
        "admin_password_hash": "invalid_hash"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/admin/bypass-login", json=payload)
        data = response.json()
        print(f"Status: {response.status_code}, Response: {data.get('detail', data)}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Non-existent user
    print("\n3️⃣ Testing non-existent user...")
    email_base64 = base64.b64encode("nonexistent@example.com".encode('utf-8')).decode('utf-8')
    payload = {
        "email_base64": email_base64,
        "admin_username_hash": username_hash,
        "admin_password_hash": password_hash
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/admin/bypass-login", json=payload)
        data = response.json()
        print(f"Status: {response.status_code}, Response: {data.get('detail', data)}")
    except Exception as e:
        print(f"Error: {e}")

def main():
    """Main test function"""
    
    print("🔧 Admin Bypass Login Endpoint Test")
    print("=" * 50)
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Admin Username: {ADMIN_USERNAME}")
    print(f"Admin Password: {'*' * len(ADMIN_PASSWORD)}")
    
    # Test with some common email addresses that might exist
    test_emails = [
        "shreyasbrillint@gmail.com",  # From the context, this seems to be a test user
        "test@vibgyor.co.in",
        "admin@vibgyor.co.in"
    ]
    
    success_count = 0
    
    for email in test_emails:
        if test_bypass_login(email):
            success_count += 1
    
    # Test invalid scenarios
    test_invalid_scenarios()
    
    print(f"\n📊 Summary: {success_count}/{len(test_emails)} successful bypass logins")
    
    if success_count > 0:
        print("✅ Admin bypass login endpoint is working!")
    else:
        print("⚠️  No successful logins - check if users exist in database")

if __name__ == "__main__":
    main()