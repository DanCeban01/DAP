const express = require('express');
const httpProxy = require('http-proxy');

const app = express();
const port = process.env.PORT || 8080;

// Create a proxy server to route requests to the microservices
const proxy = httpProxy.createProxyServer();

// Define the base URLs of the microservices
const productCatalogServiceUrl = 'http://localhost:3000';  // Update with the actual URL
const orderManagementServiceUrl = 'http://localhost:4000'; // Update with the actual URL

// Middleware to handle routing
app.use((req, res, next) => {
  // Determine which microservice to route the request to based on the path
  if (req.path.startsWith('/products')) {
    // Route to the Product Catalog microservice
    proxy.web(req, res, { target: productCatalogServiceUrl });
  } else if (req.path.startsWith('/orders')) {
    // Route to the Order Management microservice
    proxy.web(req, res, { target: orderManagementServiceUrl });
  } else {
    // Handle other routes or return an error
    res.status(404).json({ message: 'Route not found' });
  }
});

// Error handling for the proxy
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`API Gateway is running on port ${port}`);
});
