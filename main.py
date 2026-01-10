import customer.py
import admin.py
print("Welcome to Stock Smart!")
print("1. Admin)
print("2. Customer")
ch = int("Enter your choice")
if ch == 1:
	admin.admin_menu()
elif ch == 2:
	customer.customer_menu() 
