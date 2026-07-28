from models import db, Product, Order, OrderItem, CartItem, Review
from sqlalchemy.sql import func

def get_all_products(page=1, limit=1000):
    """
    Returns active (non-archived) products in the dictionary format expected by the frontend.
    """
    query = db.session.query(
        Product.name,
        Product.price,
        Product.quantity,
        Product.category,
        Product.image_url,
        func.coalesce(func.avg(Review.rating), 0).label('avg_rating'),
        func.count(Review.id).label('review_count')
    ).outerjoin(Review, Product.id == Review.product_id) \
     .filter(Product.archived == 0) \
     .group_by(Product.id) \
     .paginate(page=page, per_page=limit, error_out=False)

    products = {}
    for row in query.items:
        products[row.name] = [
            row.price, 
            row.quantity, 
            row.category, 
            row.image_url, 
            round(row.avg_rating, 1), 
            row.review_count
        ]
    return products

def get_archived_products():
    """
    Returns archived products as a list of dicts for the admin archive panel.
    """
    products = Product.query.filter_by(archived=1).all()
    archived = []
    for p in products:
        archived.append({
            'name': p.name,
            'price': p.price,
            'quantity': p.quantity,
            'category': p.category
        })
    return archived

def get_all_orders(page=1, limit=1000):
    """
    Returns orders in the hierarchical list format expected by the frontend.
    """
    orders_query = Order.query.order_by(Order.timestamp.desc()).paginate(page=page, per_page=limit, error_out=False)
    orders = []
    for o in orders_query.items:
        items = [{"item": item.product.name, "price": item.product.price, "qty": item.quantity} for item in o.items]
        orders.append({
            "id": o.id,
            "timestamp": o.timestamp,
            "items": items,
            "total": o.total
        })
    return orders

def get_cart():
    """
    Returns the cart in the dictionary format expected by the frontend.
    """
    cart_items = CartItem.query.all()
    cart = {}
    for c in cart_items:
        cart[c.product.name] = [c.product.price, c.quantity]
    return cart