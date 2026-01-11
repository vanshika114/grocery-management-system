# shared inventory
prod = {}


def add_prod():
    item = input("Enter product name: ").lower()
    if item in prod:
        print("❌ Item already exists")
        return

    price = int(input("Enter price: "))
    qty = int(input("Enter quantity: "))
    prod[item] = [price, qty]
    print("✅ Product added successfully")


def update_price():
    item = input("Enter product name: ").lower()
    if item not in prod:
        print("❌ Product does not exist")
        return

    price = int(input("Enter new price: "))
    prod[item][0] = price
    print("✅ Price updated")

def update_qty():
    item = input("Enter product name: ").lower()
    if item not in prod:
        print("❌ Product does not exist")
        return

    qty = int(input("Enter new quantity: "))
    prod[item][1] = qty
    print("✅ Quantity updated")


def delete_item():
    item = input("Enter product name: ").lower()
    if item in prod:
        del prod[item]
        print("✅ Product deleted")
    else:
        print("❌ Product does not exist")


def admin_menu():
    while True:
        print("--- Admin Menu ---")
        print("1. Add product")
        print("2. Update price")
        print("3. Update quantity")
        print("4. Delete product")
        print("5. Exit")

        ch = int(input("Enter choice: "))

        if ch == 1:
            add_prod()
        elif ch == 2:
            update_price()
        elif ch == 3:
            update_qty()
        elif ch == 4:
            delete_item()
        elif ch == 5:
            break
        else:
            print("Invalid choice")
