from models import db, Product, CartItem, Order, OrderItem, Review
import time
import uuid
import os

def get_cart():
    try:
        from database import get_cart as db_get_cart
        return db_get_cart()
    except Exception as e:
        print(f"Database error in get_cart: {e}")
        return {}

def add_item(item, quantity):
    if quantity <= 0:
        return False, "Quantity must be greater than zero"
    item = item.strip().lower()
    try:
        prod = Product.query.filter_by(name=item, archived=0).first()
        if not prod:
            return False, "Product does not exist in inventory"

        available_stock = prod.quantity

        cart_row = CartItem.query.filter_by(product_id=prod.id).first()
        current_cart_qty = cart_row.quantity if cart_row else 0

        if current_cart_qty + quantity > available_stock:
            return False, f"Cannot add quantity. Only {available_stock} items available in stock, and you have {current_cart_qty} in your cart."

        if cart_row:
            cart_row.quantity += quantity
        else:
            new_cart_item = CartItem(product_id=prod.id, quantity=quantity)
            db.session.add(new_cart_item)

        db.session.commit()
        return True, "Added to cart"
    except Exception as e:
        db.session.rollback()
        return False, f"Database error in add_item: {e}"

def delete_item(item):
    item = item.strip().lower()
    try:
        prod = Product.query.filter_by(name=item).first()
        if not prod:
            return False, "Product not in cart"
        
        cart_row = CartItem.query.filter_by(product_id=prod.id).first()
        if not cart_row:
            return False, "Product not in cart"

        db.session.delete(cart_row)
        db.session.commit()
        return True, "Deleted from cart"
    except Exception as e:
        db.session.rollback()
        return False, f"Database error in delete_item: {e}"

def update_item_qty(item, quantity):
    item = item.strip().lower()
    try:
        prod = Product.query.filter_by(name=item).first()
        if not prod:
            return False, "Item not in cart"
        
        available_stock = prod.quantity
        cart_row = CartItem.query.filter_by(product_id=prod.id).first()
        if not cart_row:
            return False, "Item not in cart"

        if quantity <= 0:
            db.session.delete(cart_row)
            db.session.commit()
            return True, f"Removed '{item}' from cart."

        if quantity > available_stock:
            return False, f"Cannot update quantity. Only {available_stock} items available in stock."

        cart_row.quantity = quantity
        db.session.commit()
        return True, f"Updated '{item}' quantity to {quantity}."
    except Exception as e:
        db.session.rollback()
        return False, f"Database error in update_item_qty: {e}"

def view_total_price():
    try:
        cart_items = CartItem.query.all()
        total = sum(c.quantity * c.product.price for c in cart_items)
        return total
    except Exception as e:
        print(f"Database error in view_total_price: {e}")
        return 0.0

def checkout():
    try:
        cart_items = CartItem.query.all()
        if not cart_items:
            return False, "Cart is empty"

        unavailable_items = []
        for c in cart_items:
            if c.product.quantity < c.quantity:
                unavailable_items.append(c.product.name)

        if unavailable_items:
            return False, f"Checkout failed. The following items went out of stock or have insufficient inventory: {', '.join(unavailable_items)}. Please adjust your cart."

        total = 0.0
        items_list = []
        order_id = str(uuid.uuid4())[:8].upper()
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        
        new_order = Order(id=order_id, timestamp=timestamp, total=0.0) # will update total
        db.session.add(new_order)

        checked_out_items = []

        for c in cart_items:
            item_total = c.product.price * c.quantity
            total += item_total
            
            c.product.quantity -= c.quantity
            
            items_list.append({"item": c.product.name, "price": c.product.price, "qty": c.quantity})
            checked_out_items.append({"product_name": c.product.name, "remaining_qty": c.product.quantity})
            
            order_item = OrderItem(order_id=order_id, product_id=c.product_id, quantity=c.quantity)
            db.session.add(order_item)
            
            db.session.delete(c)

        new_order.total = total
        db.session.commit()

        order = {
            "id": order_id,
            "timestamp": timestamp,
            "items": items_list,
            "total": total
        }
        receipt_path = generate_receipt_file(order)
        return True, f"Checkout successful! Invoice generated at {receipt_path}. Total: Rs.{order['total']}", checked_out_items

    except Exception as e:
        db.session.rollback()
        return False, f"Database error during checkout: {e}"

def search_and_filter_products(query_name=None, min_price=None, max_price=None, category=None):
    try:
        query = Product.query.filter_by(archived=0)
        
        if query_name:
            query = query.filter(Product.name.ilike(f"%{query_name.lower()}%"))
        if min_price is not None:
            query = query.filter(Product.price >= min_price)
        if max_price is not None:
            query = query.filter(Product.price <= max_price)
        if category:
            query = query.filter(Product.category == category)

        rows = query.all()
        results = {}
        for row in rows:
            results[row.name] = [row.price, row.quantity, row.category, row.image_url]
        return results
    except Exception as e:
        print(f"Database error in search_and_filter_products: {e}")
        return {}

def generate_receipt_file(order):
    os.makedirs("receipts", exist_ok=True)
    filename = f"receipts/receipt_{order['id']}.txt"

    with open(filename, "w", encoding="utf-8") as f:
        f.write("=========================================\n")
        f.write("          GROCERY MANAGEMENT SYSTEM      \n")
        f.write("=========================================\n")
        f.write(f"Order ID   : {order['id']}\n")
        f.write(f"Date/Time  : {order['timestamp']}\n")
        f.write("-----------------------------------------\n")
        f.write(f"{'Item':<18} {'Qty':<5} {'Price':<8} {'Total':<8}\n")
        f.write("-----------------------------------------\n")

        for item in order["items"]:
            name = item["item"].strip().capitalize()
            if len(name) > 16:
                name = name[:13] + "..."
            qty = item["qty"]
            price = item["price"]
            item_total = price * qty
            f.write(f"{name:<18} {qty:<5} Rs.{price:<5.2f} Rs.{item_total:<6.2f}\n")

        f.write("-----------------------------------------\n")
        f.write(f"{'Grand Total':<30} Rs.{order['total']:.2f}\n")
        f.write("=========================================\n")
        f.write("        Thank you for shopping with us!   \n")
        f.write("=========================================\n")
    return filename

def add_review(item, rating, review_text, customer_name="Anonymous"):
    item = item.strip().lower()
    try:
        prod = Product.query.filter_by(name=item, archived=0).first()
        if not prod:
            return False, "Product does not exist"
        
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        new_review = Review(product_id=prod.id, rating=rating, review_text=review_text, customer_name=customer_name, timestamp=timestamp)
        db.session.add(new_review)
        db.session.commit()
        return True, "Review added successfully"
    except Exception as e:
        db.session.rollback()
        return False, f"Database error in add_review: {e}"

def get_reviews(item):
    item = item.strip().lower()
    try:
        prod = Product.query.filter_by(name=item, archived=0).first()
        if not prod:
            return []
        
        reviews = Review.query.filter_by(product_id=prod.id).order_by(Review.timestamp.desc()).all()
        return [{
            "rating": r.rating,
            "review_text": r.review_text,
            "customer_name": r.customer_name,
            "timestamp": r.timestamp
        } for r in reviews]
    except Exception as e:
        print(f"Database error in get_reviews: {e}")
        return []
