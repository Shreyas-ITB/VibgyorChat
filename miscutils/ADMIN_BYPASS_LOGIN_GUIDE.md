# Admin Bypass Login - Implementation Guide

## Overview
This endpoint allows administrators to bypass the OTP login process for existing users and directly generate authentication tokens.

## Endpoint
```
POST /admin/bypass-login
```

## Use Case
- Admin panel needs to log in as existing users without OTP
- Testing and debugging user accounts
- Customer support scenarios
- Automated user authentication for admin tools

## Request Format

### Request Body
```json
{
  "email_base64": "dXNlckBleGFtcGxlLmNvbQ==",
  "admin_username_hash": "SHA256_HASH_OF_ADMIN_USERNAME",
  "admin_password_hash": "SHA256_HASH_OF_ADMIN_PASSWORD"
}
```

### Parameters
- **`email_base64`** (required): Base64 encoded email address of the user
- **`admin_username_hash`** (required): SHA256 hash of admin username
- **`admin_password_hash`** (required): SHA256 hash of admin password

## How to Use

### 1. Encode Email to Base64

**JavaScript:**
```javascript
const email = "user@example.com";
const emailBase64 = btoa(email);
console.log(emailBase64); // "dXNlckBleGFtcGxlLmNvbQ=="
```

**Python:**
```python
import base64

email = "user@example.com"
email_base64 = base64.b64encode(email.encode('utf-8')).decode('utf-8')
print(email_base64)  # "dXNlckBleGFtcGxlLmNvbQ=="
```

**Command Line:**
```bash
echo -n "user@example.com" | base64
# Output: dXNlckBleGFtcGxlLmNvbQ==
```

### 2. Get Admin Credential Hashes

**Using the generate-hash endpoint:**
```bash
curl -X POST "https://chatapi.vibgyor.co.in/admin/generate-hash" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_admin_username",
    "password": "your_admin_password"
  }'
```

**Manual SHA256 generation:**
```python
import hashlib

username = "admin"
password = "admin123"

username_hash = hashlib.sha256(username.encode('utf-8')).hexdigest()
password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()

print(f"Username hash: {username_hash}")
print(f"Password hash: {password_hash}")
```

### 3. Make the Request

**JavaScript/Fetch:**
```javascript
async function adminBypassLogin(email) {
  // Encode email to base64
  const emailBase64 = btoa(email);
  
  // Admin credentials (get these from your secure storage)
  const adminUsernameHash = "your_admin_username_hash";
  const adminPasswordHash = "your_admin_password_hash";
  
  const response = await fetch('https://chatapi.vibgyor.co.in/admin/bypass-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email_base64: emailBase64,
      admin_username_hash: adminUsernameHash,
      admin_password_hash: adminPasswordHash
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store tokens
    localStorage.setItem('access_token', data.tokens.access_token);
    localStorage.setItem('refresh_token', data.tokens.refresh_token);
    
    console.log('Login successful:', data.user);
    return data;
  } else {
    throw new Error(data.detail || 'Login failed');
  }
}

// Usage
adminBypassLogin('user@vibgyor.co.in')
  .then(result => console.log('Logged in as:', result.user.name))
  .catch(error => console.error('Login failed:', error));
```

**Python/Requests:**
```python
import requests
import base64
import hashlib

def admin_bypass_login(email, admin_username, admin_password):
    # Encode email
    email_base64 = base64.b64encode(email.encode('utf-8')).decode('utf-8')
    
    # Create admin hashes
    username_hash = hashlib.sha256(admin_username.encode('utf-8')).hexdigest()
    password_hash = hashlib.sha256(admin_password.encode('utf-8')).hexdigest()
    
    # Make request
    response = requests.post(
        'https://chatapi.vibgyor.co.in/admin/bypass-login',
        json={
            'email_base64': email_base64,
            'admin_username_hash': username_hash,
            'admin_password_hash': password_hash
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"Login successful: {data['user']['name']}")
        return data
    else:
        print(f"Login failed: {response.json()}")
        return None

# Usage
result = admin_bypass_login('user@vibgyor.co.in', 'admin', 'admin123')
if result:
    access_token = result['tokens']['access_token']
    print(f"Access token: {access_token}")
```

**cURL:**
```bash
# First, encode the email
EMAIL_BASE64=$(echo -n "user@vibgyor.co.in" | base64)

# Make the request
curl -X POST "https://chatapi.vibgyor.co.in/admin/bypass-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email_base64\": \"$EMAIL_BASE64\",
    \"admin_username_hash\": \"YOUR_ADMIN_USERNAME_HASH\",
    \"admin_password_hash\": \"YOUR_ADMIN_PASSWORD_HASH\"
  }"
```

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "Login bypass successful",
  "user": {
    "email": "user@vibgyor.co.in",
    "name": "John Doe",
    "username": "john.doe",
    "employ_id": "VIB2-001",
    "profile_picture": "https://api.dicebear.com/7.x/initials/svg?seed=john.doe",
    "is_verified": true
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  },
  "bypass_info": {
    "bypassed_by": "admin",
    "bypass_time": "2024-01-26T10:30:00Z",
    "original_email": "user@vibgyor.co.in"
  }
}
```

### Error Responses

**Invalid Admin Credentials (401):**
```json
{
  "detail": "Invalid admin credentials"
}
```

**Invalid Base64 Email (400):**
```json
{
  "detail": "Invalid base64 email format: Invalid base64-encoded string"
}
```

**User Not Found (404):**
```json
{
  "detail": "User not found in the platform"
}
```

**Invalid Email Format (400):**
```json
{
  "detail": "Invalid email format after decoding"
}
```

## Frontend Integration

### React Hook Example
```javascript
import { useState } from 'react';

function useAdminBypassLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const bypassLogin = async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      const emailBase64 = btoa(email);
      
      const response = await fetch('/admin/bypass-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_base64: emailBase64,
          admin_username_hash: process.env.REACT_APP_ADMIN_USERNAME_HASH,
          admin_password_hash: process.env.REACT_APP_ADMIN_PASSWORD_HASH
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store tokens
        localStorage.setItem('access_token', data.tokens.access_token);
        localStorage.setItem('refresh_token', data.tokens.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        return data;
      } else {
        throw new Error(data.detail);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { bypassLogin, loading, error };
}

// Usage in component
function AdminPanel() {
  const { bypassLogin, loading, error } = useAdminBypassLogin();
  const [email, setEmail] = useState('');
  
  const handleBypassLogin = async () => {
    try {
      const result = await bypassLogin(email);
      console.log('Logged in as:', result.user.name);
      // Redirect to dashboard or update UI
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  return (
    <div>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter user email"
      />
      <button onClick={handleBypassLogin} disabled={loading}>
        {loading ? 'Logging in...' : 'Bypass Login'}
      </button>
      {error && <p style={{color: 'red'}}>{error}</p>}
    </div>
  );
}
```

### Admin Panel Integration
```javascript
// Admin user management component
function UserManagement() {
  const [users, setUsers] = useState([]);
  
  const handleLoginAsUser = async (userEmail) => {
    try {
      const emailBase64 = btoa(userEmail);
      
      const response = await fetch('/admin/bypass-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_base64: emailBase64,
          admin_username_hash: getAdminUsernameHash(),
          admin_password_hash: getAdminPasswordHash()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Open new tab/window with user session
        const newWindow = window.open('/dashboard', '_blank');
        
        // Pass tokens to new window (you'll need to implement this)
        newWindow.localStorage.setItem('access_token', data.tokens.access_token);
        newWindow.localStorage.setItem('refresh_token', data.tokens.refresh_token);
        
        alert(`Logged in as ${data.user.name}`);
      }
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    }
  };
  
  return (
    <div>
      {users.map(user => (
        <div key={user.email}>
          <span>{user.name} ({user.email})</span>
          <button onClick={() => handleLoginAsUser(user.email)}>
            Login as User
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Security Considerations

### 1. Admin Credential Protection
- Store admin hashes securely (environment variables)
- Never expose admin credentials in client-side code
- Use HTTPS for all requests
- Consider IP whitelisting for admin endpoints

### 2. Base64 Encoding
- Base64 is encoding, not encryption
- Email is still readable if intercepted
- Use HTTPS to protect data in transit

### 3. Audit Logging
Consider adding audit logs for bypass logins:
```python
# Add to your logging system
audit_log = {
    "action": "admin_bypass_login",
    "admin_user": "admin_username",
    "target_user": email,
    "timestamp": datetime.utcnow(),
    "ip_address": request.client.host
}
```

### 4. Rate Limiting
Consider implementing rate limiting for this endpoint to prevent abuse.

## Testing

### Test with Valid User
```bash
# Test with existing user
EMAIL="user@vibgyor.co.in"
EMAIL_BASE64=$(echo -n "$EMAIL" | base64)

curl -X POST "http://localhost:8000/admin/bypass-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email_base64\": \"$EMAIL_BASE64\",
    \"admin_username_hash\": \"ADMIN_HASH\",
    \"admin_password_hash\": \"PASSWORD_HASH\"
  }"
```

### Test with Non-existent User
```bash
# Test with non-existent user
EMAIL="nonexistent@example.com"
EMAIL_BASE64=$(echo -n "$EMAIL" | base64)

curl -X POST "http://localhost:8000/admin/bypass-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email_base64\": \"$EMAIL_BASE64\",
    \"admin_username_hash\": \"ADMIN_HASH\",
    \"admin_password_hash\": \"PASSWORD_HASH\"
  }"
```

### Test with Invalid Base64
```bash
curl -X POST "http://localhost:8000/admin/bypass-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email_base64\": \"invalid-base64!\",
    \"admin_username_hash\": \"ADMIN_HASH\",
    \"admin_password_hash\": \"PASSWORD_HASH\"
  }"
```

## Summary

✅ **What's Added:**
- Admin bypass login endpoint
- Base64 email encoding requirement
- Admin credential verification
- Token generation for existing users
- Comprehensive error handling

✅ **Security Features:**
- Admin authentication required
- User existence verification
- Base64 encoding (obfuscation)
- Detailed audit information in response

✅ **Use Cases:**
- Admin panel user impersonation
- Testing and debugging
- Customer support
- Automated admin tools

The endpoint is ready to use and provides a secure way for admins to bypass OTP login for existing users!