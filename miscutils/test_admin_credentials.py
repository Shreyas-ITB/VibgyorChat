#!/usr/bin/env python3
"""
Test Admin Credentials Script

This script tests if your admin credentials work with the API
before running the full batch import.

Usage:
    python test_admin_credentials.py
"""

import requests
import hashlib
import os


def create_sha256_hash(text: str) -> str:
    """Create SHA256 hash of the given text"""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def test_admin_credentials():
    """Test admin credentials by calling the allowed-domains endpoint"""
    
    # Configuration
    API_URL = "https://chatapi.vibgyor.co.in"
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
    
    print("🔐 Testing Admin Credentials")
    print("=" * 40)
    print(f"API URL: {API_URL}")
    print(f"Username: {ADMIN_USERNAME}")
    print(f"Password: {'*' * len(ADMIN_PASSWORD)}")
    print()
    
    # Create hashes
    username_hash = create_sha256_hash(ADMIN_USERNAME)
    password_hash = create_sha256_hash(ADMIN_PASSWORD)
    
    print(f"Username Hash: {username_hash[:16]}...")
    print(f"Password Hash: {password_hash[:16]}...")
    print()
    
    # Test API call
    try:
        print("🔄 Testing API connection...")
        
        response = requests.get(
            f"{API_URL}/admin/allowed-domains",
            params={
                "admin_username_hash": username_hash,
                "admin_password_hash": password_hash
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS: Admin credentials are valid!")
            print(f"Allowed domains: {data.get('allowed_domains', [])}")
            
        elif response.status_code == 401:
            print("❌ FAILED: Invalid admin credentials")
            print("Please check your ADMIN_USERNAME and ADMIN_PASSWORD")
            
        else:
            print(f"⚠️  Unexpected response: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ FAILED: Cannot connect to API")
        print(f"Please check if {API_URL} is accessible")
        
    except requests.exceptions.Timeout:
        print("❌ FAILED: Request timed out")
        print("The API might be slow or unreachable")
        
    except Exception as e:
        print(f"❌ FAILED: Unexpected error - {e}")
    
    print()


if __name__ == "__main__":
    test_admin_credentials()