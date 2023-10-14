from flask import Flask, request, jsonify
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry


app = Flask(__name__)

# Define the base URL of the Product Catalog service
product_catalog_service_url = 'http://localhost:3000'

# Retry mechanism with exponential backoff
def session_with_retries(retries, backoff_factor, status_forcelist):
    session = requests.Session()
    retry = Retry(total=retries, read=retries, connect=retries, backoff_factor=backoff_factor, status_forcelist=status_forcelist)
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    return session

# Explicit endpoint: Create a new order
@app.route('/orders', methods=['POST'])
def create_order():
    retries = 3  # Number of retries
    backoff_factor = 0.1  # Backoff factor for exponential backoff
    status_forcelist = [500]  # Retry on 500 Internal Server Error

    data = request.json
    user_id = data.get('user_id')
    cars = data.get('cars')

    # Use a session with retries and timeout to make a request to the Product Catalog service
    session = session_with_retries(retries, backoff_factor, status_forcelist)
    response = session.get(f'{product_catalog_service_url}/products', timeout=5)

    if response.status_code == 200:
        # You can process the response data here
        return response.text, response.status_code

    return jsonify({'message': 'Failed to create an order'}), 503

if __name__ == '__main__':
    app.run(debug=True, port=4000)
