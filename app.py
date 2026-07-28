from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import admin
import customer
import database
from models import db, User
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///grocery.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'grocery-super-secret-key-123'
db.init_app(app)
jwt = JWTManager(app)

with app.app_context():
    db.create_all()
    # Seed default admin user
    if not User.query.filter_by(username='admin').first():
        import hashlib
        default_hash = hashlib.sha256("admin123".encode('utf-8')).hexdigest()
        default_admin = User(username='admin', password_hash=default_hash, is_admin=True)
        db.session.add(default_admin)
        db.session.commit()

connected_admins = set()

@socketio.on('connect')
def handle_connect():
    connected_admins.add(request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    connected_admins.discard(request.sid)

def emit_stock_alert(product_name, remaining_qty):
    if remaining_qty == 0:
        socketio.emit('stock:out', {'product_name': product_name})
    else:
        socketio.emit('stock:low', {'product_name': product_name, 'remaining_qty': remaining_qty})

# REMOVED custom authenticate_admin middleware. We will use @jwt_required() instead for admin routes.
@app.route('/')
def index():
    return jsonify({"status": "API is running"})

# --- Admin API ---

@app.route('/api/products', methods=['GET'])
def get_products():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 1000, type=int)
    try:
        return jsonify(database.get_all_products(page=page, limit=limit))
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {e}"}), 500

# Track failed login attempts globally
failed_attempts = 0

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    global failed_attempts
    
    if failed_attempts >= 3:
        return jsonify({"success": False, "message": "Access Denied. Account locked due to too many failed attempts."}), 403
        
    data = request.get_json() or {}
    username = data.get("username", "admin") # default to admin for backward compatibility
    password = data.get("password", "")
    
    if admin.verify_admin_login(username, password):
        failed_attempts = 0 # Reset on success
        access_token = create_access_token(identity=username)
        return jsonify({"success": True, "message": "Access Granted. Welcome Admin.", "token": access_token})
    else:
        failed_attempts += 1
        remaining = 3 - failed_attempts
        if failed_attempts >= 3:
            return jsonify({"success": False, "message": "Access Denied. Account locked."}), 403
        return jsonify({"success": False, "message": f"Invalid credentials. {remaining} attempts remaining."}), 401

@app.route('/api/products', methods=['POST'])
@jwt_required()
def add_product():
    data = request.json
    category = data.get('category', 'Other')
    image_url = data.get('image_url', '')
    try:
        price = float(data['price'])
        quantity = int(data['qty'])  # Kept 'qty' for incoming frontend key compatibility
        if price < 0 or quantity < 0:
            return jsonify({"success": False, "message": "Price and quantity cannot be negative"}), 400
    except (ValueError, TypeError, KeyError):
        return jsonify({"success": False, "message": "Invalid input: Price must be a number and Quantity must be an integer"}), 400
    success, message = admin.add_product(data['item'], price, quantity, category, image_url)
    return jsonify({"success": success, "message": message})

@app.route('/api/products/<item>/price', methods=['PUT'])
@jwt_required()
def update_price(item):
    data = request.json
    try:
        price = float(data['price'])
        if price < 0:
            return jsonify({"success": False, "message": "Price cannot be negative"}), 400
    except (ValueError, TypeError, KeyError):
        return jsonify({"success": False, "message": "Invalid input: Price must be a valid number"}), 400
    success, message = admin.update_price(item, price)
    return jsonify({"success": success, "message": message})

@app.route('/api/admin/alerts', methods=['GET'])
def get_low_stock_alerts():
    threshold = request.args.get('threshold', default=5, type=int)
    alerts = admin.get_low_stock_alerts(threshold)
    return jsonify(alerts)

@app.route('/api/admin/analytics', methods=['GET'])
def get_sales_analytics():
    analytics = admin.get_sales_analytics()
    return jsonify(analytics)


@app.route('/api/products/<item>/qty', methods=['PUT'])
@jwt_required()
def update_qty(item):
    data = request.json
    try:
        quantity = int(data['qty'])
        if quantity < 0:
            return jsonify({"success": False, "message": "Quantity cannot be negative"}), 400
    except (ValueError, TypeError, KeyError):
        return jsonify({"success": False, "message": "Invalid input: Quantity must be a valid integer"}), 400
    success, message = admin.update_quantity(item, quantity)
    return jsonify({"success": success, "message": message})

@app.route('/api/products/<item>', methods=['DELETE'])
@jwt_required()
def archive_product(item):
    """Archives a product (soft-delete) — replaces permanent delete for safety."""
    success, message = admin.archive_product(item)
    return jsonify({"success": success, "message": message})

@app.route('/api/products/archived', methods=['GET'])
@jwt_required()
def get_archived_products():
    """Returns all archived products for the admin archive panel."""
    try:
        return jsonify(database.get_archived_products())
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {e}"}), 500

@app.route('/api/products/<item>/restore', methods=['POST'])
@jwt_required()
def restore_product(item):
    """Restores an archived product back to active inventory."""
    success, message = admin.restore_product(item)
    return jsonify({"success": success, "message": message})

@app.route('/api/products/<item>/permanent', methods=['DELETE'])
@jwt_required()
def permanently_delete_product(item):
    """Permanently deletes an archived product. Irreversible."""
    success, message = admin.permanently_delete_product(item)
    return jsonify({"success": success, "message": message})

# --- Customer API ---

@app.route('/api/cart', methods=['GET'])
def get_cart():
    cart = customer.get_cart()
    total_price = customer.view_total_price()  
    return jsonify({"cart": cart, "total_price": total_price})

@app.route('/api/cart', methods=['POST'])
def add_to_cart():
    data = request.json
    try:
        quantity = int(data['qty'])
        if quantity <= 0:
            return jsonify({"success": False, "message": "Quantity must be greater than zero"}), 400
    except (ValueError, TypeError, KeyError):
        return jsonify({"success": False, "message": "Invalid input: Quantity must be a valid integer"}), 400
    success, message = customer.add_item(data['item'], quantity)
    return jsonify({"success": success, "message": message})

@app.route('/api/cart/<item>', methods=['PUT'])
def update_cart_qty(item):
    data = request.json
    try:
        quantity = int(data['qty'])
    except (ValueError, TypeError, KeyError):
        return jsonify({"success": False, "message": "Invalid input: Quantity must be a valid integer"}), 400
    success, message = customer.update_item_qty(item, quantity)
    return jsonify({"success": success, "message": message})

@app.route('/api/cart/<item>', methods=['DELETE'])
def remove_from_cart(item):
    success, message = customer.delete_item(item)
    return jsonify({"success": success, "message": message})

@app.route('/api/checkout', methods=['POST'])
def checkout():
    res = customer.checkout()
    if isinstance(res, tuple) and len(res) == 3:
        success, message, checked_out_items = res
    else:
        success, message = res
        checked_out_items = []
        
    if success:
        for item in checked_out_items:
            name = item.get("product_name")
            qty = item.get("remaining_qty")
            if qty == 0:
                emit_stock_alert(name, 0)
            elif qty <= 5:
                emit_stock_alert(name, qty)
                
    return jsonify({"success": success, "message": message})

@app.route('/api/orders', methods=['GET'])
def get_orders():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 100, type=int)
    try:
        return jsonify(database.get_all_orders(page=page, limit=limit))
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {e}"}), 500

@app.route('/api/orders/export', methods=['GET'])
def export_orders_csv():
    import io
    import csv
    from flask import Response
    
    data = database.load_data()
    orders = data.get("orders", [])
    
    si = io.StringIO()
    cw = csv.writer(si)
    
    cw.writerow(['Order ID', 'Timestamp', 'Items', 'Total ($)'])
    for order in orders:
        items_str = ", ".join([f"{item.get('qty')}x {item.get('item')}" for item in order.get("items", [])])
        cw.writerow([
            order.get('id', ''),
            order.get('timestamp', ''),
            items_str,
            f"{order.get('total', 0.0):.2f}"
        ])
    
    response = Response(si.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = 'attachment; filename=orders-export.csv'
    return response

# --- Reviews API ---
@app.route('/api/products/<item>/reviews', methods=['POST'])
def add_review(item):
    data = request.json
    try:
        rating = int(data.get('rating', 0))
        if rating < 1 or rating > 5:
            return jsonify({"success": False, "message": "Rating must be between 1 and 5"}), 400
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Invalid rating format"}), 400
    
    review_text = data.get('review_text', '')
    customer_name = data.get('customer_name', 'Anonymous')
    
    success, message = customer.add_review(item, rating, review_text, customer_name)
    return jsonify({"success": success, "message": message})

@app.route('/api/products/<item>/reviews', methods=['GET'])
def get_reviews(item):
    reviews = customer.get_reviews(item)
    return jsonify(reviews)

# --- Search & Filter API ---
@app.route('/api/products/filter', methods=['GET'])
def search_products():
    
    query_name = request.args.get('name', default=None, type=str)
    category = request.args.get('category', default=None, type=str)
    min_price = request.args.get('min_price', default=None, type=float)
    max_price = request.args.get('max_price', default=None, type=float)
    
    results = customer.search_and_filter_products(
        query_name=query_name, 
        min_price=min_price, 
        max_price=max_price, 
        category=category
    )
    return jsonify(results)
if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)