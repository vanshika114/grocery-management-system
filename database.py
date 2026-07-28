import sqlite3
import os

DB_FILE = "grocery.db"

def get_db_connection():
    """
    Establishes a connection to the SQLite database.
    Enforces foreign key checks and row factory for named columns.
    """
    conn = sqlite3.connect(DB_FILE)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes the SQLite tables with primary keys, types, and foreign key relationships.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Products table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        category TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        image_url TEXT DEFAULT ''
    );
    """)

    # Migration: add archived column to existing databases that pre-date this feature
    try:
        cursor.execute("ALTER TABLE products ADD COLUMN archived INTEGER NOT NULL DEFAULT 0")
        conn.commit()
    except Exception:
        pass  # Column already exists — safe to ignore

    # Migration: add image_url column to existing databases that pre-date this feature
    try:
        cursor.execute("ALTER TABLE products ADD COLUMN image_url TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass  # Column already exists — safe to ignore
    
    # Orders table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        total REAL NOT NULL
    );
    """)
    
    # Order Items table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_items (
        order_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        PRIMARY KEY (order_id, product_id),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    """)
    
    # Cart table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cart (
        product_id INTEGER PRIMARY KEY,
        quantity INTEGER NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    """)

    # Reviews table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        review_text TEXT,
        customer_name TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    """)
    
    conn.commit()
    conn.close()

# Helper queries to keep app.py and modules clean
def get_all_products():
    """
    Returns active (non-archived) products in the dictionary format expected by the frontend.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.name, p.price, p.quantity, p.category, p.image_url, 
               COALESCE(AVG(r.rating), 0) as avg_rating, 
               COUNT(r.id) as review_count
        FROM products p 
        LEFT JOIN reviews r ON p.id = r.product_id 
        WHERE p.archived = 0
        GROUP BY p.id, p.name, p.price, p.quantity, p.category, p.image_url
    """)
    products = {}
    for row in cursor.fetchall():
        products[row['name']] = [
            row['price'], 
            row['quantity'], 
            row['category'], 
            row['image_url'], 
            round(row['avg_rating'], 1), 
            row['review_count']
        ]
    conn.close()
    return products

def get_archived_products():
    """
    Returns archived products as a list of dicts for the admin archive panel.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, price, quantity, category FROM products WHERE archived = 1")
    archived = []
    for row in cursor.fetchall():
        archived.append({
            'name': row['name'],
            'price': row['price'],
            'quantity': row['quantity'],
            'category': row['category']
        })
    conn.close()
    return archived

def get_all_orders():
    """
    Returns orders in the hierarchical list format expected by the frontend.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, timestamp, total FROM orders ORDER BY timestamp DESC")
    orders = []
    order_rows = cursor.fetchall()
    for o in order_rows:
        cursor.execute("""
            SELECT p.name, p.price, oi.quantity 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        """, (o['id'],))
        items = [{"item": row['name'], "price": row['price'], "qty": row['quantity']} for row in cursor.fetchall()]
        orders.append({
            "id": o['id'],
            "timestamp": o['timestamp'],
            "items": items,
            "total": o['total']
        })
    conn.close()
    return orders

def get_cart():
    """
    Returns the cart in the dictionary format expected by the frontend.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.name, p.price, c.quantity 
        FROM cart c 
        JOIN products p ON c.product_id = p.id
    """)
    cart = {}
    for row in cursor.fetchall():
        cart[row['name']] = [row['price'], row['quantity']]
    conn.close()
    return cart

# Automatically run initialization on load/import
init_db()