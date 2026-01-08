# --- add items in cart ----
def add_items():
    print("inventory",prod)
    cart = {}
    while True:
        item = input("Enter item to be added in cart: ")
        qty = int(input("Enter quantity of item: "))
        if qty > prod[item][1]:
            cart[item] = [prod[item][0],prod[item][1]] 
        else: 
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


# ---- update item quantity ---- 
def update_item_qty():
    print("cart ---> ", cart)
    item = input("Enter product name: ")
    qty = int(input("Enter updated quantity: "))
    if qty == 0:
        del cart[item]
    else:
        cart[item][1] = qty 
    print("Updated Cart ----> ", cart)

# ---- view total price ---- 
def view_tp():
    print("cart ---->", cart)
    l = []
    for item in cart:
        val = (cart[item][0] * cart[item][1])
        l.append(val)
    tp = sum(l)
    print("Total Price = ", tp)
