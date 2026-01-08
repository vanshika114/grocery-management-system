# --- add items in cart ----
def add_items():
    print("inventory",prod)
    cart = {}
    while True:
        item = input("Enter item to be added in cart: ")
        qty = int(input("Enter quantity of item: "))
        cart[item] = [prod[item][0],qty]
        ch = input("Continue? Y/N ")
        if ch.lower() == 'n':
            break
    print("cart", cart)

# ---- delete item from cart ---- 
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
