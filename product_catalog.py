from flask import Flask, request, jsonify
import requests
import urllib3
from urllib3.util import Retry

app = Flask(__name__)

# Define the base URL of the Order Management service
order_management_service_url = 'http://localhost:4000'

# Retry mechanism with exponential backoff
def session_with_retries(retries, backoff_factor, status_forcelist):
    session = requests.Session()
    retry = Retry(total=retries, read=retries, connect=retries, backoff_factor=backoff_factor, status_forcelist=status_forcelist)
    adapter = requests.adapters.HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    return session

# Explicit endpoint: Retrieve all products
@app.route('/products', methods=['GET'])
def get_all_products():
    retries = 3  # Number of retries
    backoff_factor = 0.1  # Backoff factor for exponential backoff
    status_forcelist = [500]  # Retry on 500 Internal Server Error

    # Use a session with retries and timeout
    session = session_with_retries(retries, backoff_factor, status_forcelist)
    response = session.get(f'{order_management_service_url}/orders', timeout=5)

    if response.status_code == 200:
        # You can process the response data here
        return response.text, response.status_code

    return jsonify({'message': 'Failed to retrieve products'}), 503

if __name__ == '__main__':
    app.run(debug=True, port=3000)
