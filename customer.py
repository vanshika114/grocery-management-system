import admin
cart = {}
prod = admin.prod 
def add_items():
    print("inventory",admin.prod)
    while True:
        item = input("Enter item to be added in cart: ")
        qty = int(input("Enter quantity of item: "))
        cart[item] = [prod[item][0],qty]
        ch = input("Continue? Y/N ")
        if ch.lower() == 'n':
            break
    print("cart -----> ", cart)
    


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
    print("Updated Cart ---> ", cart)



def update_item_qty():
    print("cart ---> ", cart)
    item = input("Enter product name: ")
    qty = int(input("Enter updated quantity: "))
    if qty == 0:
        del cart[item]
    else:
        cart[item][1] = qty 
    print("Updated Cart ----> ", cart)


def view_tp():
    print("cart ----> ", cart)
    l = []
    for item in cart:
        val = (cart[item][0] * cart[item][1])
        l.append(val)
    tp = sum(l)
    print("Total Price = ", tp)

def customer_menu():
    while True:
        print("1. Add item in cart")
        print("2. Delete item from cart")
        print("3. Update item quantity in cart")
        print("4. View total price in cart")
        print("5. Exit")
        ch = int(input("Enter your choice: "))
        if ch == 1:
            add_items()
        elif ch == 2:
            delete_item()
        elif ch == 3:
            update_item_qty()
        elif ch == 4:
            view_tp()
        elif ch == 5:
            break
        else: 
            print("Invalid choice")
