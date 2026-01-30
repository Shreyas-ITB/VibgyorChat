# Employee Batch Import Guide

## Overview
This script reads employee data from a CSV file and creates employee accounts via the admin API with a configurable delay between requests.

## Files
- `batch_import_employees.py` - Main import script
- `backend/Employees.csv` - Employee data file
- `requirements_import.txt` - Python dependencies

## CSV Format
The CSV file should have 4 columns (no header):
```
employ_id,first_name,last_name,email
```

**Example:**
```csv
VIB2-000,Sunil,N Sharma,sunil@vibgyor.co.in
VIB2-001,Chinmayee,Mone,chinmayee@vibgyor.co.in
VIB2-002,Siddhartha,A M,sid@vibgyor.co.in
```

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements_import.txt
```

### 2. Set Admin Credentials

**Option A: Environment Variables (Recommended)**
```bash
export ADMIN_USERNAME="your_admin_username"
export ADMIN_PASSWORD="your_admin_password"
```

**Option B: Modify Script**
Edit `batch_import_employees.py` and change:
```python
ADMIN_USERNAME = "your_admin_username"
ADMIN_PASSWORD = "your_admin_password"
```

### 3. Configure API URL
Edit the script if your API URL is different:
```python
API_URL = "https://chatapi.vibgyor.co.in"  # Change if needed
```

### 4. Verify CSV File
Ensure `backend/Employees.csv` exists and has the correct format.

## Usage

### Run the Import Script
```bash
python batch_import_employees.py
```

### Expected Output
```
======================================================================
🚀 Employee Batch Import Script
======================================================================

📖 Reading employees from backend/Employees.csv...
📊 Found 48 employees to import
⏱️  Delay between requests: 5 seconds

Continue with import? (y/N): y

🔄 Starting import...
--------------------------------------------------
[1/48] Processing: VIB2-000 - Sunil N Sharma
✅ Created: VIB2-000 - Sunil N Sharma (sunil@vibgyor.co.in)
⏳ Waiting 5 seconds...

[2/48] Processing: VIB2-001 - Chinmayee Mone
✅ Created: VIB2-001 - Chinmayee Mone (chinmayee@vibgyor.co.in)
⏳ Waiting 5 seconds...

[3/48] Processing: VIB2-002 - Siddhartha A M
✅ Created: VIB2-002 - Siddhartha A M (sid@vibgyor.co.in)
⏳ Waiting 5 seconds...

...

======================================================================
📊 Import Summary
======================================================================
Total employees processed: 48
✅ Successfully created: 35
⚠️  Skipped (already exist/no email): 10
❌ Failed: 3

❌ Errors encountered:
   - VIB2-009: Email domain not allowed for employees. Allowed domains: @vibgyor.co.in
   - VIB1-106: Email domain not allowed for employees. Allowed domains: @vibgyor.co.in
   - VIB1-107: Email domain not allowed for employees. Allowed domains: @vibgyor.co.in

📈 Success rate: 72.9%
```

## Features

### 1. Automatic Username Generation
- Format: `firstname.lastname` (e.g., `sunil.sharma`)
- If no last name: `firstname_employid` (e.g., `suma_104`)
- Removes special characters and limits to 30 characters

### 2. Smart Skipping
- Skips rows with missing employ_id or first_name
- Skips rows with no email address
- Skips employees that already exist (409 status)

### 3. Error Handling
- Network timeouts
- Invalid credentials
- Email domain restrictions
- Duplicate usernames/emails
- API errors

### 4. Progress Tracking
- Shows current progress (e.g., [15/48])
- Real-time status updates
- Detailed summary at the end

### 5. Rate Limiting
- Configurable delay between requests (default: 5 seconds)
- Prevents overwhelming the server

## Configuration Options

### Change Delay Between Requests
```python
DELAY_SECONDS = 3  # 3 seconds instead of 5
```

### Change CSV File Path
```python
CSV_FILE = "path/to/your/employees.csv"
```

### Change API URL
```python
API_URL = "http://localhost:8000"  # For local testing
```

## Troubleshooting

### Issue: "Invalid admin credentials"
**Solution:** Check your admin username and password hashes are correct.

### Issue: "Email domain not allowed"
**Solution:** Update `ALLOWED_EMPLOYEE_DOMAINS` in your backend `.env` file:
```env
ALLOWED_EMPLOYEE_DOMAINS="@vibgyor.co.in,@gmail.com"
```

### Issue: "User already exists"
**Solution:** This is normal - the script will skip existing users automatically.

### Issue: "Username already taken"
**Solution:** The script generates unique usernames, but if there are conflicts, you may need to manually adjust the CSV.

### Issue: CSV parsing errors
**Solution:** Ensure CSV format is correct:
- 4 columns: employ_id,first_name,last_name,email
- No header row
- Proper encoding (UTF-8)

## Testing

### Test with a Small Subset
Create a test CSV with just a few employees:
```csv
TEST-001,Test,User,test@vibgyor.co.in
TEST-002,Another,Test,test2@vibgyor.co.in
```

### Test Against Local API
```python
API_URL = "http://localhost:8000"
```

### Dry Run Mode
You can modify the script to add a dry-run mode by commenting out the actual API call:
```python
# response = self.session.post(...)  # Comment this out
print(f"DRY RUN: Would create {employee['name']}")  # Add this
return True  # Add this
```

## Security Notes

### 1. Protect Admin Credentials
- Use environment variables
- Don't commit credentials to version control
- Use strong passwords

### 2. Network Security
- Use HTTPS for production API
- Consider VPN for sensitive operations

### 3. Rate Limiting
- Don't set delay too low (minimum 1 second recommended)
- Monitor server load during import

## Advanced Usage

### Resume Failed Imports
If the script fails partway through, you can:
1. Check the output to see which employees were created
2. Remove successful employees from CSV
3. Re-run the script with remaining employees

### Batch Processing
For very large CSV files, consider splitting into smaller batches:
```bash
# Split CSV into batches of 50
split -l 50 employees.csv batch_
```

### Custom Field Mapping
Modify the `read_csv()` method to handle different CSV formats:
```python
# If your CSV has different columns
employ_id = row[0]
email = row[1]  # Email in second column
first_name = row[2]
last_name = row[3]
```

## API Endpoint Details

The script calls:
```
POST https://chatapi.vibgyor.co.in/admin/create-employee
```

**Request Body:**
```json
{
  "email": "employee@vibgyor.co.in",
  "name": "Employee Name",
  "username": "employee.name",
  "employ_id": "VIB2-001",
  "admin_username_hash": "sha256_hash_of_username",
  "admin_password_hash": "sha256_hash_of_password"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "employee_id": "...",
  "email": "employee@vibgyor.co.in",
  "name": "Employee Name",
  "username": "employee.name",
  "employ_id": "VIB2-001",
  "message": "Employee created successfully"
}
```

## Summary

✅ **Features:**
- Batch import from CSV
- Automatic username generation
- Error handling and retry logic
- Progress tracking
- Rate limiting
- Detailed reporting

✅ **Safety:**
- Confirmation before import
- Skips existing employees
- Detailed error reporting
- Configurable delays

✅ **Flexibility:**
- Environment variable configuration
- Customizable CSV format
- Multiple authentication methods
- Dry-run capability (with modification)

Run the script and monitor the output for any issues. The script is designed to be safe and will skip existing employees automatically.