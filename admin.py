#------ add a product into grocery store -----

def add_prod():
    item = input("Enter product name: ")
    if item not in prod:
        pr = int(input("Enter price: "))
        qty = int(input("Enter quantity: "))
        l = [pr,qty]
        prod[item] = l 
        print("Item added successfully!","updated products", prod)
    else:
        print("Item exists")
        

#----- update price of an existing product ----

def update_price():
    item = input("Enter product name: ").lower()
    if item in prod:
        pr = int(input("Enter updated price of product: "))
        prod[item][0] = pr
        print("updated successfully!","updated products",prod)
    else:
        print("product does not exist")


#---- update quantity of an existing product ----

def update_qty():
    item = input("Enter product name: ").lower()
    if item in prod:
        qty = int(input("Enter updated quantity of product: "))
        prod[item][1] = qty
        print("updated successfully!","updated products",prod)
    else:
        print("product does not exist")

#---- delete an existing product ----- 

def delete_item():
    item = input("Enter product name: ").lower()
    if item in prod:
        del prod[item]
        print("deleted successfully!","updated products",prod)
    else:
        print("product does not exist")
