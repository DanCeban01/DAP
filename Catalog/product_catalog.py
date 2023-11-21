from flask import Flask, request, jsonify
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
import sqlite3
import requests
import time

# Create a SQLite database and table for the product catalog
conn = sqlite3.connect('product_catalog.db')
cursor = conn.cursor()
cursor.execute('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, price REAL)')
conn.commit()
conn.close()

app = Flask(__name__)

# Define the base URL of the Order Management service
order_management_service_url = 'http://localhost:4040'

class CircuitBreaker:
    def __init__(self, fail_threshold, reset_timeout):
        self.fail_threshold = fail_threshold
        self.reset_timeout = reset_timeout
        self.consecutive_failures = 0
        self.opened_timestamp = None

    def _is_open(self):
        return (
            self.opened_timestamp is not None
            and time.time() - self.opened_timestamp < self.reset_timeout
        )

    def _reset(self):
        self.consecutive_failures = 0
        self.opened_timestamp = None

    def _open(self):
        self.consecutive_failures += 1
        if self.consecutive_failures >= self.fail_threshold:
            self.opened_timestamp = time.time()

    def guard(self, func):
        def wrapper(*args, **kwargs):
            if self._is_open():
                return None  # Circuit is open, do not execute the function

            try:
                result = func(*args, **kwargs)
                self._reset()  # Reset if the function call is successful
                return result
            except Exception as e:
                self._open()  # Mark a failure
                raise e

        return wrapper

# Create a Circuit Breaker for the HTTP request to Order Management service
order_management_circuit_breaker = CircuitBreaker(fail_threshold=3, reset_timeout=60)

# Retry mechanism with exponential backoff
def session_with_retries(retries, backoff_factor, status_forcelist):
    session = requests.Session()
    retry = Retry(total=retries, read=retries, connect=retries, backoff_factor=backoff_factor, status_forcelist=status_forcelist)
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    return session

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'message': 'Connection Ok'}), 200


# Explicit endpoint: Retrieve all products
@app.route('/products', methods=['GET'])
def get_all_products():
    retries = 3  # Number of retries
    backoff_factor = 0.1  # Backoff factor for exponential backoff
    status_forcelist = [500]  # Retry on 500 Internal Server Error

      # Use a session with retries and timeout
    session = session_with_retries(retries, backoff_factor, status_forcelist)

    try:
        response = session.get(f'{order_management_service_url}/orders', timeout=5)
        response.raise_for_status()
        return response.text, response.status_code
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error accessing Order Management service: {e}")
        return jsonify({'message': 'Failed to retrieve products'}), 503

# Explicit endpoint: Add a product to the SQLite database
@app.route('/add_product', methods=['POST'])
def add_product():
    data = request.json
    name = data.get('name')
    price = data.get('price')
    
    conn = sqlite3.connect('product_catalog.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO products (name, price) VALUES (?, ?)', (name, price))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Product added'}), 201


if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=3030)
