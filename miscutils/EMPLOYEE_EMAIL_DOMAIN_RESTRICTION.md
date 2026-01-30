# Employee Email Domain Restriction

## Overview
This feature restricts employee account creation to specific email domains. Only emails ending with the configured domains can be created as employee accounts in the admin panel.

## Use Case
If your company uses a specific email domain (e.g., `@vibgyor.co.in`), you can ensure that only employees with that domain can be added to the system. This prevents accidentally adding external users as employees.

## Configuration

### Environment Variable
Add the following to your `.env` file:

```env
ALLOWED_EMPLOYEE_DOMAINS="@vibgyor.co.in,@company.com"
```

**Format:**
- Comma-separated list of email domains
- Each domain should start with `@`
- Case-insensitive matching
- Whitespace is automatically trimmed

**Examples:**

**Single Domain:**
```env
ALLOWED_EMPLOYEE_DOMAINS="@vibgyor.co.in"
```

**Multiple Domains:**
```env
ALLOWED_EMPLOYEE_DOMAINS="@vibgyor.co.in,@vibgyor.com,@company.com"
```

**Allow All (Backward Compatibility):**
```env
# Leave empty or don't set to allow any email domain
ALLOWED_EMPLOYEE_DOMAINS=""
```

## How It Works

### 1. Email Validation
When creating an employee account via `/admin/create-employee`, the system checks if the email ends with one of the allowed domains.

**Example:**
```
Allowed domains: @vibgyor.co.in, @company.com

✅ ALLOWED:
- admin@vibgyor.co.in
- john.doe@vibgyor.co.in
- manager@company.com

❌ REJECTED:
- user@gmail.com
- employee@otherdomain.com
- admin@vibgyor.com (if not in allowed list)
```

### 2. Error Response
If an email with a disallowed domain is used, the API returns:

```json
{
  "detail": "Email domain not allowed for employees. Allowed domains: @vibgyor.co.in, @company.com"
}
```

**Status Code:** `403 Forbidden`

## API Endpoints

### Get Allowed Domains
Retrieve the list of allowed email domains (requires admin authentication).

**Endpoint:** `GET /admin/allowed-domains`

**Query Parameters:**
- `admin_username_hash` (required): SHA256 hash of admin username
- `admin_password_hash` (required): SHA256 hash of admin password

**Response:**
```json
{
  "success": true,
  "allowed_domains": [
    "@vibgyor.co.in",
    "@company.com"
  ],
  "note": "Only emails ending with these domains can be created as employees"
}
```

**Usage:**
```javascript
// Frontend can fetch allowed domains to show validation hints
const response = await fetch(
  `/admin/allowed-domains?admin_username_hash=${usernameHash}&admin_password_hash=${passwordHash}`
);
const { allowed_domains } = await response.json();

// Show hint to user
console.log(`Allowed domains: ${allowed_domains.join(', ')}`);
```

### Create Employee (Updated)
The existing `/admin/create-employee` endpoint now validates email domains.

**Endpoint:** `POST /admin/create-employee`

**Request Body:**
```json
{
  "email": "employee@vibgyor.co.in",
  "name": "John Doe",
  "username": "johndoe",
  "employ_id": "EMP001",
  "admin_username_hash": "...",
  "admin_password_hash": "..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "employee_id": "...",
  "email": "employee@vibgyor.co.in",
  "message": "Employee John Doe created successfully"
}
```

**Error Response (403):**
```json
{
  "detail": "Email domain not allowed for employees. Allowed domains: @vibgyor.co.in"
}
```

## Frontend Implementation

### 1. Fetch Allowed Domains on Load
```javascript
async function fetchAllowedDomains() {
  try {
    const response = await fetch(
      `/admin/allowed-domains?admin_username_hash=${adminHash}&admin_password_hash=${passHash}`
    );
    const data = await response.json();
    return data.allowed_domains;
  } catch (error) {
    console.error('Failed to fetch allowed domains:', error);
    return [];
  }
}
```

### 2. Client-Side Validation
```javascript
function validateEmployeeEmail(email, allowedDomains) {
  if (!allowedDomains || allowedDomains.length === 0) {
    return { valid: true };
  }
  
  const emailLower = email.toLowerCase();
  const isValid = allowedDomains.some(domain => 
    emailLower.endsWith(domain.toLowerCase())
  );
  
  if (!isValid) {
    return {
      valid: false,
      error: `Email must end with one of: ${allowedDomains.join(', ')}`
    };
  }
  
  return { valid: true };
}
```

### 3. Form Validation Example
```javascript
// In your employee creation form
const handleSubmit = async (formData) => {
  const allowedDomains = await fetchAllowedDomains();
  
  // Validate email domain
  const validation = validateEmployeeEmail(formData.email, allowedDomains);
  if (!validation.valid) {
    showError(validation.error);
    return;
  }
  
  // Proceed with employee creation
  const response = await createEmployee(formData);
  // ...
};
```

### 4. Show Hint to User
```javascript
// Display allowed domains in the form
<div className="form-hint">
  <p>Employee email must end with: {allowedDomains.join(', ')}</p>
</div>

// Or in the input placeholder
<input 
  type="email" 
  placeholder={`e.g., employee${allowedDomains[0]}`}
/>
```

## Testing

### Test Cases

#### Test 1: Valid Domain
```bash
# Email: admin@vibgyor.co.in
# Expected: Success (201)
curl -X POST http://localhost:8000/admin/create-employee \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vibgyor.co.in",
    "name": "Admin User",
    "username": "adminuser",
    "employ_id": "EMP001",
    "admin_username_hash": "...",
    "admin_password_hash": "..."
  }'
```

#### Test 2: Invalid Domain
```bash
# Email: user@gmail.com
# Expected: Error (403)
curl -X POST http://localhost:8000/admin/create-employee \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@gmail.com",
    "name": "External User",
    "username": "externaluser",
    "employ_id": "EMP002",
    "admin_username_hash": "...",
    "admin_password_hash": "..."
  }'
```

#### Test 3: Case Insensitive
```bash
# Email: Admin@VIBGYOR.CO.IN (mixed case)
# Expected: Success (201) - case insensitive matching
curl -X POST http://localhost:8000/admin/create-employee \
  -H "Content-Type: application/json" \
  -d '{
    "email": "Admin@VIBGYOR.CO.IN",
    "name": "Admin User",
    "username": "adminuser2",
    "employ_id": "EMP003",
    "admin_username_hash": "...",
    "admin_password_hash": "..."
  }'
```

## Security Considerations

1. **Server-Side Validation**: Always validate on the server, even if client-side validation exists
2. **Case Insensitive**: Domain matching is case-insensitive to prevent bypasses
3. **Whitespace Handling**: Automatic trimming prevents whitespace bypass attempts
4. **Admin Only**: Only admin users can create employees and view allowed domains

## Backward Compatibility

- If `ALLOWED_EMPLOYEE_DOMAINS` is not set or empty, all email domains are allowed
- Existing employees are not affected by this change
- No database migration required

## Configuration Examples

### Example 1: Single Company Domain
```env
ALLOWED_EMPLOYEE_DOMAINS="@vibgyor.co.in"
```

### Example 2: Multiple Company Domains
```env
ALLOWED_EMPLOYEE_DOMAINS="@vibgyor.co.in,@vibgyor.com,@vibgyor.org"
```

### Example 3: Company + Partner Domains
```env
ALLOWED_EMPLOYEE_DOMAINS="@vibgyor.co.in,@partner.com,@contractor.net"
```

### Example 4: Development/Testing (Allow All)
```env
ALLOWED_EMPLOYEE_DOMAINS=""
```

## Troubleshooting

### Issue: All emails are being rejected
**Solution:** Check that `ALLOWED_EMPLOYEE_DOMAINS` is set correctly in `.env` file

### Issue: Domain not matching
**Solution:** Ensure the domain starts with `@` (e.g., `@vibgyor.co.in`, not `vibgyor.co.in`)

### Issue: Changes not taking effect
**Solution:** Restart the backend server after modifying `.env` file

### Issue: Want to allow all domains temporarily
**Solution:** Set `ALLOWED_EMPLOYEE_DOMAINS=""` or remove the variable

## Summary

✅ **What's Added:**
- Email domain restriction for employee accounts
- Configuration via environment variable
- New endpoint to fetch allowed domains
- Client-side and server-side validation support

✅ **Benefits:**
- Prevents accidental addition of external users as employees
- Enforces company email policy
- Easy to configure and maintain
- Backward compatible

✅ **Configuration:**
- Set `ALLOWED_EMPLOYEE_DOMAINS` in `.env` file
- Comma-separated list of domains
- Case-insensitive matching
