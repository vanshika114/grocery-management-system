import pytest
from app import app
from models import db, User

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            # create admin user
            import hashlib
            default_hash = hashlib.sha256("admin123".encode('utf-8')).hexdigest()
            admin = User(username='admin', password_hash=default_hash, is_admin=True)
            db.session.add(admin)
            db.session.commit()
            
        yield client
        
        with app.app_context():
            db.drop_all()

def test_api_is_running(client):
    response = client.get('/')
    assert response.status_code == 200
    assert response.json['status'] == 'API is running'

def test_get_products_empty(client):
    response = client.get('/api/products')
    assert response.status_code == 200
    assert response.json == {}

def test_admin_login(client):
    response = client.post('/api/admin/login', json={'username': 'admin', 'password': 'admin123'})
    assert response.status_code == 200
    assert response.json['success'] is True
    assert 'token' in response.json

def test_add_product_requires_auth(client):
    response = client.post('/api/products', json={
        'item': 'apple', 'price': 1.5, 'qty': 10, 'category': 'Fruits'
    })
    assert response.status_code == 401

def test_add_product_with_auth(client):
    login = client.post('/api/admin/login', json={'username': 'admin', 'password': 'admin123'})
    token = login.json['token']
    
    response = client.post('/api/products', json={
        'item': 'apple', 'price': 1.5, 'qty': 10, 'category': 'Fruits'
    }, headers={'Authorization': f'Bearer {token}'})
    
    assert response.status_code == 200
    assert response.json['success'] is True
    
    products = client.get('/api/products')
    assert 'apple' in products.json
    assert products.json['apple'][0] == 1.5
    assert products.json['apple'][1] == 10
