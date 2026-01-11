import admin

cart = {}

# add products in cart 
def add_items():
    if not admin.prod:
        print("No products available")
        return

    print("Inventory:", admin.prod)

    while True:
        item = input("Enter item to add: ").lower()

        if item not in admin.prod:
            print("Item not found")
            continue

        qty = int(input("Enter quantity: "))
        cart[item] = [admin.prod[item][0], qty]

        ch = input("Continue? (Y/N): ").lower()
        if ch == 'n':
            break

# delete product from cart 
def delete_item():
    print("cart ---> ", cart)
    while True:
        item = input("Enter item to be deleted: ").lower()
        if item in cart:
            del cart[item]
            print(item,"deleted successfully!")
        else:
            print(item,"doesnot exist")
        ch = input("Continue? Y/N ")
        if ch.lower() == 'n':
            break
    print("Updated Cart --->", cart)

# update product quantity 
def update_item_qty():
    print("cart ---> ", cart)
    item = input("Enter product name: ")
    qty = int(input("Enter updated quantity: "))
    if qty == 0:
        del cart[item]
    else:
        cart[item][1] = qty 
    print("Updated Cart ----> ", cart)


# view total price of cart 
def view_cart():
    if not cart:
        print("Cart is empty")
        return

    total = 0
    for item, (price, qty) in cart.items():
        total += price * qty

    print("Cart---->", cart)
    print("Total price:", total)


def customer_menu():
    while True:
        print("--- Customer Menu ---")
        print("1. Add items")
        print("2. View cart")
        print("3. Delete item")
        print("4. Update quantity")
        print("5. Exit")

        ch = int(input("Enter choice: "))

        if ch == 1:
            add_items()
        elif ch == 2:
            view_cart()
        elif ch == 3:
            delete_item()
        elif ch == 4:
            update_item_qty()
        elif ch == 5:
            break 
        else:
            print("Invalid choice")
