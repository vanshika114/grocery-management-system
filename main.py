import customer
import admin
print("Welcome to Stock Smart!")
print("1. Admin")
print("2. Customer")
print("3. Exit")
while True:
	ch = int(input("Enter your choice: "))
	if ch == 1:
		admin.admin_menu()
	elif ch == 2:
		customer.customer_menu()
	elif ch == 3:
		print("Thank You!")
		break
	else: 
		print("invalid choice")
