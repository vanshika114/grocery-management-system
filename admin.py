from models import db, Product, Order, OrderItem
from sqlalchemy.sql import func
import hashlib
from datetime import datetime, timedelta

def add_product(item, price, quantity, category="Other", image_url=""):
    item = item.strip().lower()
    if price < 0:
        return False, "Price cannot be negative"
    if quantity < 0:
        return False, "Quantity cannot be negative"
    try:
        existing = Product.query.filter_by(name=item).first()
        if existing:
            return False, "Item already exists"
        
        prod = Product(name=item, price=price, quantity=quantity, category=category, image_url=image_url)
        db.session.add(prod)
        db.session.commit()
        return True, "Item added successfully!"
    except Exception as e:
        db.session.rollback()
        return False, f"Database error: {e}"

def update_price(item, price):
    if price < 0:
        return False, "Price cannot be negative"
    item = item.strip().lower()
    try:
        prod = Product.query.filter_by(name=item).first()
        if not prod:
            return False, "Product does not exist"
        prod.price = price
        db.session.commit()
        return True, "Price updated successfully!"
    except Exception as e:
        db.session.rollback()
        return False, f"Database error: {e}"

def update_quantity(item, quantity):
    if quantity < 0:
        return False, "Quantity cannot be negative"
    item = item.strip().lower()
    try:
        prod = Product.query.filter_by(name=item).first()
        if not prod:
            return False, "Product does not exist"
        prod.quantity = quantity
        db.session.commit()
        return True, "Quantity updated successfully!"
    except Exception as e:
        db.session.rollback()
        return False, f"Database error: {e}"

def archive_product(item):
    item = item.strip().lower()
    try:
        prod = Product.query.filter_by(name=item).first()
        if not prod:
            return False, "Product does not exist"
        if prod.archived == 1:
            return False, "Product is already archived"
        prod.archived = 1
        db.session.commit()
        return True, "Product archived successfully!"
    except Exception as e:
        db.session.rollback()
        return False, f"Database error: {e}"

def restore_product(item):
    item = item.strip().lower()
    try:
        prod = Product.query.filter_by(name=item).first()
        if not prod:
            return False, "Product does not exist"
        if prod.archived == 0:
            return False, "Product is not archived"
        prod.archived = 0
        db.session.commit()
        return True, "Product restored successfully!"
    except Exception as e:
        db.session.rollback()
        return False, f"Database error: {e}"

def permanently_delete_product(item):
    item = item.strip().lower()
    try:
        prod = Product.query.filter_by(name=item).first()
        if not prod:
            return False, "Product does not exist"
        if prod.archived == 0:
            return False, "Product must be archived before it can be permanently deleted"
        db.session.delete(prod)
        db.session.commit()
        return True, "Product permanently deleted!"
    except Exception as e:
        db.session.rollback()
        return False, f"Database error: {e}"

def get_low_stock_alerts(threshold=5):
    try:
        alerts = {}
        products = Product.query.filter(Product.quantity < threshold, Product.archived == 0).all()
        for p in products:
            alerts[p.name] = {
                "price": p.price,
                "quantity": p.quantity,
                "category": p.category,
                "status": "Out of Stock" if p.quantity == 0 else "Low Stock"
            }
        return alerts
    except Exception as e:
        print(f"Database error in get_low_stock_alerts: {e}")
        return {}

def verify_admin_login(username, input_password):
    from models import User
    import hashlib
    user = User.query.filter_by(username=username, is_admin=True).first()
    if not user:
        return False
    input_hash = hashlib.sha256(input_password.strip().encode('utf-8')).hexdigest()
    return input_hash == user.password_hash

def get_sales_analytics():
    try:
        total_revenue = db.session.query(func.sum(Order.total)).scalar() or 0.0
        total_orders = db.session.query(func.count(Order.id)).scalar() or 0

        # Best sellers
        best_sellers_query = db.session.query(Product.name, func.sum(OrderItem.quantity).label('qty_sold')) \
            .join(OrderItem, Product.id == OrderItem.product_id) \
            .group_by(Product.id) \
            .order_by(func.sum(OrderItem.quantity).desc()).all()
        best_sellers = [{"item": name, "quantity_sold": qty} for name, qty in best_sellers_query]

        # Category revenue
        cat_rev_query = db.session.query(Product.category, func.sum(OrderItem.quantity * Product.price)) \
            .join(OrderItem, Product.id == OrderItem.product_id) \
            .group_by(Product.category).all()
        category_revenue = {cat: round(rev, 2) for cat, rev in cat_rev_query}

        # Revenue last 7 days
        today = datetime.utcnow().date()
        start_date = today - timedelta(days=6)
        daily_rows = {}
        
        # Sqlite timestamp format varies, simplest is to process in python for a small dataset
        recent_orders = Order.query.all()
        for o in recent_orders:
            o_date_str = o.timestamp[:10]
            try:
                o_date = datetime.strptime(o_date_str, "%Y-%m-%d").date()
                if o_date >= start_date:
                    daily_rows[o_date_str] = daily_rows.get(o_date_str, 0.0) + o.total
            except ValueError:
                pass # ignore poorly formatted timestamps

        revenue_last_7_days = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_str = day.isoformat()
            label = day.strftime("%b %d")
            revenue_last_7_days.append({
                "date": label,
                "revenue": round(daily_rows.get(day_str, 0.0), 2)
            })

        # Quantity by category
        qty_cat_query = db.session.query(Product.category, func.sum(OrderItem.quantity)) \
            .join(OrderItem, Product.id == OrderItem.product_id) \
            .group_by(Product.category) \
            .order_by(func.sum(OrderItem.quantity).desc()).all()
        quantity_by_category = [{"category": cat, "quantity": qty} for cat, qty in qty_cat_query]

        return {
            "total_revenue": round(total_revenue, 2),
            "total_orders": total_orders,
            "best_selling_products": best_sellers,
            "revenue_by_category": category_revenue,
            "revenue_last_7_days": revenue_last_7_days,
            "quantity_by_category": quantity_by_category
        }
    except Exception as e:
        print(f"Database error in get_sales_analytics: {e}")
        return {
            "total_revenue": 0.0,
            "total_orders": 0,
            "best_selling_products": [],
            "revenue_by_category": {},
            "revenue_last_7_days": [],
            "quantity_by_category": []
        }
