import unittest
import json
from product_catalog import app

class TestProductCatalog(unittest.TestCase):

    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        
    def tearDown(self):
        pass  # You can perform cleanup here if necessary

    def test_get_all_products(self):
        response = self.app.get('/products')
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(isinstance(data, list))

    def test_add_product(self):
        product_data = {'name': 'Test Product', 'price': 50.0}
        response = self.app.post('/add_product', json=product_data)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(data['message'], 'Product added')

if __name__ == '__main__':
    unittest.main()
