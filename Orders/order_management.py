from flask import Flask, request, jsonify
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
import sqlite3
import requests
import time

# Create a SQLite database and table for orders
conn = sqlite3.connect('order_management.db')
cursor = conn.cursor()
cursor.execute('CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, user_id INTEGER, status TEXT, cars TEXT)')
conn.commit()
conn.close()

app = Flask(__name__)

# URL of the Product Catalog microservice (Service B)
product_catalog_url = 'http://localhost:3030'


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


# Create a Circuit Breaker for the HTTP request to Product Catalog service
product_catalog_circuit_breaker = CircuitBreaker(fail_threshold=3, reset_timeout=60)

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

# Explicit endpoint: Create a new order
@app.route('/create_order', methods=['POST'])
def create_order():
    try:
        # Extract order details from the request
        order_data = request.json

        # Phase 1: Prepare
        prepare_response = requests.post(f'{product_catalog_url}/prepare_order', json=order_data)

        if prepare_response.status_code == 200 and prepare_response.json().get('status') == 'prepared':
            # Phase 2: Commit
            commit_response = requests.post(f'{product_catalog_url}/commit_order', json=order_data)

            if commit_response.status_code == 200 and commit_response.json().get('status') == 'committed':
                # Order successfully created
                return jsonify({'status': 'order_created'}), 200
            else:
                # Rollback if Service B fails to commit
                requests.post(f'{product_catalog_url}/rollback_order', json=order_data)
                return jsonify({'status': 'rollback_order_failed'}), 500
        else:
            return jsonify({'status': 'prepare_order_failed'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    # Use a session with retries and timeout to make a request to the Product Catalog service
    session = session_with_retries(retries, backoff_factor, status_forcelist)
    response = session.get(f'{product_catalog_service_url}/products', timeout=5)

    try:
        response = session.get(f'{product_catalog_service_url}/products', timeout=5)
        response.raise_for_status()
        return response.text, response.status_code
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error accessing Product Catalog service: {e}")
        return jsonify({'message': 'Failed to create an order'}), 503

# Explicit endpoint: Create a new order and store it in the SQLite database
@app.route('/add_order', methods=['POST'])
def add_order():
    data = request.json
    user_id = data.get('user_id')
    status = data.get('status')
    cars = data.get('cars')

    conn = sqlite3.connect('order_management.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO orders (user_id, status, cars) VALUES (?, ?, ?)', (user_id, status, cars))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Order added'}), 201


if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=4040)
