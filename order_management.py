from flask import Flask, request, jsonify
import uuid

app = Flask(__name__)

# Sample data (you can replace this with a database)
orders = []

@app.route('/orders', methods=['POST'])
def create_order():
    data = request.json
    user_id = data.get('user_id')
    cars = data.get('cars')

    # Generate a unique order ID
    order_id = str(uuid.uuid4())

    # Calculate the total price of the order
    total_price = sum(car['quantity'] * get_car_price(car['car_id']) for car in cars)

    # Create the order object
    new_order = {
        'order_id': order_id,
        'user_id': user_id,
        'status': 'pending',
        'total_price': total_price,
        'cars': cars
    }

    # Add the order to the list
    orders.append(new_order)

    return jsonify({'order_id': order_id, 'status': 'pending', 'total_price': total_price}), 201

@app.route('/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    order = next((o for o in orders if o['order_id'] == order_id), None)
    if order is None:
        return jsonify({'message': 'Order not found'}), 404
    return jsonify({'order': order}), 200

@app.route('/users/<user_id>/orders', methods=['GET'])
def get_user_orders(user_id):
    user_orders = [o for o in orders if o['user_id'] == user_id]
    return jsonify({'orders': user_orders}), 200

def get_car_price(car_id):
    # Replace this with logic to fetch car prices from a database
    # For simplicity, using hardcoded prices here
    car_prices = {'1': 25000, '2': 22000}
    return car_prices.get(car_id, 0)

if __name__ == '__main__':
    app.run(debug=True, port=4000)
