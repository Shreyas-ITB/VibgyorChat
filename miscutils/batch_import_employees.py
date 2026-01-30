#!/usr/bin/env python3
"""
Batch Employee Import Script

This script reads employees from a CSV file and creates them via the admin API.
CSV Format: employ_id,first_name,last_name,email

Usage:
    python batch_import_employees.py

Requirements:
    - employees.csv file in the same directory
    - Admin credentials in environment variables or hardcoded
    - requests library: pip install requests
"""

import csv
import requests
import time
import hashlib
import os
from typing import List, Dict, Optional
import sys


class EmployeeImporter:
    def __init__(self, api_url: str, admin_username: str, admin_password: str):
        self.api_url = api_url.rstrip('/')
        self.admin_username_hash = self.create_sha256_hash(admin_username)
        self.admin_password_hash = self.create_sha256_hash(admin_password)
        self.session = requests.Session()
        
        # Statistics
        self.total_employees = 0
        self.successful_imports = 0
        self.failed_imports = 0
        self.skipped_imports = 0
        self.errors = []
    
    @staticmethod
    def create_sha256_hash(text: str) -> str:
        """Create SHA256 hash of the given text"""
        return hashlib.sha256(text.encode('utf-8')).hexdigest()
    
    def generate_username(self, first_name: str, last_name: str, employ_id: str) -> str:
        """
        Generate a username from name and employ_id
        Format: firstname.lastname or firstname_employid if no lastname
        """
        first_name = first_name.strip().lower()
        last_name = last_name.strip().lower()
        
        # Remove special characters and spaces
        first_name = ''.join(c for c in first_name if c.isalnum())
        last_name = ''.join(c for c in last_name if c.isalnum())
        
        if last_name and last_name != '-':
            username = f"{first_name}.{last_name}"
        else:
            # Use employ_id suffix if no last name
            employ_suffix = employ_id.split('-')[-1] if '-' in employ_id else employ_id
            username = f"{first_name}_{employ_suffix}"
        
        return username[:30]  # Limit to 30 characters
    
    def read_csv(self, csv_file: str) -> List[Dict[str, str]]:
        """Read and parse the CSV file"""
        employees = []
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                # CSV format: employ_id,first_name,last_name,email
                reader = csv.reader(file)
                
                for row_num, row in enumerate(reader, 1):
                    if len(row) < 4:
                        print(f"⚠️  Row {row_num}: Insufficient columns, skipping")
                        continue
                    
                    employ_id = row[0].strip()
                    first_name = row[1].strip()
                    last_name = row[2].strip()
                    email = row[3].strip()
                    
                    # Skip if essential fields are missing
                    if not employ_id or not first_name:
                        print(f"⚠️  Row {row_num}: Missing employ_id or first_name, skipping")
                        self.skipped_imports += 1
                        continue
                    
                    # Skip if no email
                    if not email:
                        print(f"⚠️  Row {row_num}: No email for {employ_id} ({first_name} {last_name}), skipping")
                        self.skipped_imports += 1
                        continue
                    
                    # Generate full name and username
                    full_name = f"{first_name} {last_name}".strip()
                    username = self.generate_username(first_name, last_name, employ_id)
                    
                    employee = {
                        'employ_id': employ_id,
                        'name': full_name,
                        'username': username,
                        'email': email,
                        'first_name': first_name,
                        'last_name': last_name
                    }
                    
                    employees.append(employee)
                    
        except FileNotFoundError:
            print(f"❌ Error: CSV file '{csv_file}' not found")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Error reading CSV file: {e}")
            sys.exit(1)
        
        return employees
    
    def create_employee(self, employee: Dict[str, str]) -> bool:
        """Create a single employee via API"""
        payload = {
            "email": employee['email'],
            "name": employee['name'],
            "username": employee['username'],
            "employ_id": employee['employ_id'],
            "admin_username_hash": self.admin_username_hash,
            "admin_password_hash": self.admin_password_hash
        }
        
        try:
            response = self.session.post(
                f"{self.api_url}/admin/create-employee",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Created: {employee['employ_id']} - {employee['name']} ({employee['email']})")
                self.successful_imports += 1
                return True
            
            elif response.status_code == 409:
                # User already exists
                error_detail = response.json().get('detail', 'User already exists')
                print(f"⚠️  Skipped: {employee['employ_id']} - {error_detail}")
                self.skipped_imports += 1
                return False
            
            elif response.status_code == 403:
                # Email domain not allowed
                error_detail = response.json().get('detail', 'Email domain not allowed')
                print(f"❌ Failed: {employee['employ_id']} - {error_detail}")
                self.failed_imports += 1
                self.errors.append(f"{employee['employ_id']}: {error_detail}")
                return False
            
            else:
                error_detail = response.json().get('detail', f'HTTP {response.status_code}')
                print(f"❌ Failed: {employee['employ_id']} - {error_detail}")
                self.failed_imports += 1
                self.errors.append(f"{employee['employ_id']}: {error_detail}")
                return False
                
        except requests.exceptions.Timeout:
            print(f"❌ Timeout: {employee['employ_id']} - Request timed out")
            self.failed_imports += 1
            self.errors.append(f"{employee['employ_id']}: Request timeout")
            return False
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Network Error: {employee['employ_id']} - {e}")
            self.failed_imports += 1
            self.errors.append(f"{employee['employ_id']}: Network error - {e}")
            return False
        
        except Exception as e:
            print(f"❌ Unexpected Error: {employee['employ_id']} - {e}")
            self.failed_imports += 1
            self.errors.append(f"{employee['employ_id']}: Unexpected error - {e}")
            return False
    
    def import_employees(self, csv_file: str, delay_seconds: int = 5):
        """Import all employees from CSV with delay between requests"""
        print("=" * 70)
        print("🚀 Employee Batch Import Script")
        print("=" * 70)
        print()
        
        # Read CSV
        print(f"📖 Reading employees from {csv_file}...")
        employees = self.read_csv(csv_file)
        self.total_employees = len(employees)
        
        if not employees:
            print("❌ No valid employees found in CSV file")
            return
        
        print(f"📊 Found {self.total_employees} employees to import")
        print(f"⏱️  Delay between requests: {delay_seconds} seconds")
        print()
        
        # Confirm before proceeding
        response = input("Continue with import? (y/N): ").strip().lower()
        if response != 'y':
            print("❌ Import cancelled by user")
            return
        
        print()
        print("🔄 Starting import...")
        print("-" * 50)
        
        # Import each employee
        for i, employee in enumerate(employees, 1):
            print(f"[{i}/{self.total_employees}] Processing: {employee['employ_id']} - {employee['name']}")
            
            success = self.create_employee(employee)
            
            # Add delay between requests (except for the last one)
            if i < self.total_employees:
                print(f"⏳ Waiting {delay_seconds} seconds...")
                time.sleep(delay_seconds)
                print()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print import summary"""
        print()
        print("=" * 70)
        print("📊 Import Summary")
        print("=" * 70)
        print(f"Total employees processed: {self.total_employees}")
        print(f"✅ Successfully created: {self.successful_imports}")
        print(f"⚠️  Skipped (already exist/no email): {self.skipped_imports}")
        print(f"❌ Failed: {self.failed_imports}")
        print()
        
        if self.errors:
            print("❌ Errors encountered:")
            for error in self.errors:
                print(f"   - {error}")
            print()
        
        success_rate = (self.successful_imports / self.total_employees * 100) if self.total_employees > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        print()
        
        if self.failed_imports > 0:
            print("💡 Tips for failed imports:")
            print("   - Check if email domains are allowed in ALLOWED_EMPLOYEE_DOMAINS")
            print("   - Verify admin credentials are correct")
            print("   - Check if usernames are unique and valid")
            print()


def main():
    """Main function"""
    # Configuration
    API_URL = "https://chatapi.vibgyor.co.in"  # Change if needed
    CSV_FILE = "backend/Employees.csv"  # Path to CSV file
    DELAY_SECONDS = 5  # Delay between API calls
    
    # Admin credentials - CHANGE THESE!
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")  # Change this
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")  # Change this
    
    # Validate configuration
    if ADMIN_USERNAME == "admin" and ADMIN_PASSWORD == "admin123":
        print("⚠️  WARNING: Using default admin credentials!")
        print("   Please set ADMIN_USERNAME and ADMIN_PASSWORD environment variables")
        print("   or modify the script with your actual credentials.")
        print()
        response = input("Continue anyway? (y/N): ").strip().lower()
        if response != 'y':
            print("❌ Cancelled. Please update admin credentials.")
            return
    
    # Check if CSV file exists
    if not os.path.exists(CSV_FILE):
        print(f"❌ Error: CSV file '{CSV_FILE}' not found")
        print("   Please ensure the CSV file exists in the correct location.")
        return
    
    # Create importer and run
    importer = EmployeeImporter(API_URL, ADMIN_USERNAME, ADMIN_PASSWORD)
    importer.import_employees(CSV_FILE, DELAY_SECONDS)


if __name__ == "__main__":
    main()