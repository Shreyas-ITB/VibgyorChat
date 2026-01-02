import requests
import sys
import json
from datetime import datetime

class VibgyorChatsAPITester:
    def __init__(self, base_url="https://designchat-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()  # Use session to handle cookies
        self.session_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_demo_login(self):
        """Test demo login functionality"""
        print("\n🔍 Testing Demo Login...")
        success, response = self.run_test(
            "Demo Login",
            "POST",
            "auth/demo",
            200
        )
        
        if success and 'user_id' in response:
            self.user_data = response
            print(f"   Demo user created: {response.get('name', 'Unknown')} ({response.get('email', 'No email')})")
            return True
        return False

    def test_auth_me(self):
        """Test getting current user info"""
        print("\n🔍 Testing Auth Me...")
        # Test with cookies (simulating browser behavior)
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_user_search(self):
        """Test user search functionality"""
        print("\n🔍 Testing User Search...")
        success, response = self.run_test(
            "Search Users (empty query)",
            "GET",
            "users/search?q=",
            200
        )
        
        if success:
            success2, response2 = self.run_test(
                "Search Users (demo query)",
                "GET",
                "users/search?q=demo",
                200
            )
            return success2
        return False

    def test_conversations(self):
        """Test conversation management"""
        print("\n🔍 Testing Conversations...")
        
        # Get conversations
        success, response = self.run_test(
            "Get Conversations",
            "GET",
            "conversations",
            200
        )
        
        if not success:
            return False

        # Create a direct conversation (need another user first)
        # For now, just test the endpoint structure
        success2, response2 = self.run_test(
            "Create Conversation (invalid - no participants)",
            "POST",
            "conversations",
            400,  # Should fail without participants
            data={"type": "direct", "participants": []}
        )
        
        # This should fail, which is expected behavior
        return success

    def test_messages_without_conversation(self):
        """Test message endpoints without valid conversation"""
        print("\n🔍 Testing Messages (without conversation)...")
        
        # Try to get messages for non-existent conversation
        success, response = self.run_test(
            "Get Messages (non-existent conversation)",
            "GET",
            "messages/nonexistent",
            404
        )
        
        return success

    def test_file_upload_auth(self):
        """Test file upload authentication"""
        print("\n🔍 Testing File Upload Auth...")
        
        # Test upload endpoint without file (should fail)
        success, response = self.run_test(
            "File Upload (no file)",
            "POST",
            "upload",
            422  # Unprocessable entity - missing file
        )
        
        return success

    def test_logout(self):
        """Test logout functionality"""
        print("\n🔍 Testing Logout...")
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        
        if success:
            self.session_token = None
        return success

    def test_websocket_endpoint(self):
        """Test WebSocket endpoint availability"""
        print("\n🔍 Testing WebSocket Endpoint...")
        try:
            # Just check if the socket.io endpoint is accessible
            response = requests.get(f"{self.base_url}/socket.io/")
            success = response.status_code in [200, 400]  # 400 is also acceptable for socket.io
            self.log_test("WebSocket Endpoint Available", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("WebSocket Endpoint Available", False, f"Exception: {str(e)}")
            return False

def main():
    print("🚀 Starting Vibgyor Chats API Testing...")
    print("=" * 50)
    
    tester = VibgyorChatsAPITester()
    
    # Test sequence
    tests_passed = 0
    total_tests = 0
    
    # 1. Test demo login
    if tester.test_demo_login():
        tests_passed += 1
    total_tests += 1
    
    # 2. Test auth/me (this might fail due to cookie handling in requests)
    if tester.test_auth_me():
        tests_passed += 1
    total_tests += 1
    
    # 3. Test user search
    if tester.test_user_search():
        tests_passed += 1
    total_tests += 1
    
    # 4. Test conversations
    if tester.test_conversations():
        tests_passed += 1
    total_tests += 1
    
    # 5. Test messages
    if tester.test_messages_without_conversation():
        tests_passed += 1
    total_tests += 1
    
    # 6. Test file upload
    if tester.test_file_upload_auth():
        tests_passed += 1
    total_tests += 1
    
    # 7. Test WebSocket
    if tester.test_websocket_endpoint():
        tests_passed += 1
    total_tests += 1
    
    # 8. Test logout
    if tester.test_logout():
        tests_passed += 1
    total_tests += 1
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 API Test Summary:")
    print(f"   Total Tests: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": tester.tests_run,
                "passed": tester.tests_passed,
                "failed": tester.tests_run - tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100
            },
            "test_results": tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())