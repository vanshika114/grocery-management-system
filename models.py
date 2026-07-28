from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    archived = db.Column(db.Integer, default=0, nullable=False)
    image_url = db.Column(db.String(255), default='')
    
    # relationships
    reviews = db.relationship('Review', backref='product', lazy=True, cascade="all, delete-orphan")
    cart_items = db.relationship('CartItem', backref='product', lazy=True, cascade="all, delete-orphan")

class Review(db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    review_text = db.Column(db.Text)
    customer_name = db.Column(db.String(100))
    timestamp = db.Column(db.String(50), nullable=False)

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.String(50), primary_key=True)
    timestamp = db.Column(db.String(50), nullable=False)
    total = db.Column(db.Float, nullable=False)
    
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    order_id = db.Column(db.String(50), db.ForeignKey('orders.id', ondelete='CASCADE'), primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), primary_key=True)
    quantity = db.Column(db.Integer, nullable=False)
    
    product = db.relationship('Product')

class CartItem(db.Model):
    __tablename__ = 'cart'
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), primary_key=True)
    quantity = db.Column(db.Integer, nullable=False)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
