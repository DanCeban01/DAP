import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base

from models import Product, Base

from flask import Flask, request, jsonify
from prometheus_client import make_wsgi_app
from werkzeug.middleware.dispatcher import DispatcherMiddleware

# Connect to the PostgreSQL database
DATABASE_URL = f"postgresql+psycopg2://postgres:toor@postgres:5432/postgres"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = Flask(__name__)

# Add prometheus wsgi middleware to route /metrics requests
app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {
    '/metrics': make_wsgi_app()
})

# In-memory storage for orders
orders = []

# Define the base URL of the Order Management service
order_management_service_url = 'http://localhost:4040'

# Nodes for consistent hashing (change this based on your needs)
nodes = ['cache_node_1', 'cache_node_2', 'cache_node_3']

# Health check status endpoint
@app.route('/status', methods=['GET'])
def health():
    return jsonify({'message': 'Connection Ok'}), 200

# New endpoint: Prepare changes
@app.route('/prepare_changes', methods=['POST'])
def prepare_changes():
    try:
        data = request.json
        name = data.get('name')
        price = data.get('price')

        # Get a session
        db: Session = next(get_db())

        # Create a new product
        new_product = Product(name=name, price=price)  # replace with your actual model class and fields

        # Add the new product to the session
        db.add(new_product)

        # Commit the transaction
        db.commit()

        return jsonify({'status': 'prepared'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Explicit endpoint: Retrieve all products
@app.route('/get_products', methods=['GET'])
def get_products():
    try:
        # Get a session
        db: Session = next(get_db())

        # Query all products
        products = db.query(Product).all()  # replace with your actual model class

        # Convert the products to a list of dictionaries for easy JSON conversion
        products = [product.to_dict() for product in products]

        return jsonify({'products': products}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Explicit endpoint: Add a product to the SQLite database
@app.route('/add_product', methods=['POST'])
def add_product():
    try:
        data = request.json
        name = data.get('name')
        price = data.get('price')

        # Get a session
        db: Session = next(get_db())

        # Create a new catalog item
        new_catalog_item = Product(name=name, price=price)  # replace with your actual model class and fields

        # Add the new catalog item to the session
        db.add(new_catalog_item)

        # Commit the transaction
        db.commit()

        return jsonify({'message': 'Product added'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=os.environ.get('CATALOG_PORT', 80))
