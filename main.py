import admin
import customer

while True:
    print("=== Welcome to Stock Smart ===")
    print("1. Admin")
    print("2. Customer")
    print("3. Exit")

    ch = int(input("Enter your choice: "))

    if ch == 1:
        admin.admin_menu()
    elif ch == 2:
        customer.customer_menu()
    elif ch == 3:
        print("Have a Nice Day!")
        break
    else:
        print("Invalid choice")
