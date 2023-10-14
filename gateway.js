const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const NodeCache = require('node-cache');

const app = express();
const port = 3000; // Port for the gateway

// Create a cache instance with a default TTL of 60 seconds
const cache = new NodeCache({ stdTTL: 60 });

// Define proxy middleware for Microservice 1 (Product Catalog Service)
const productCatalogProxy = createProxyMiddleware({
  target: 'http://localhost:3000', // Port of the Product Catalog Service
  changeOrigin: true,
  pathRewrite: {
    '^/product-catalog': '',
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add response caching
    const key = req.url;
    const body = Buffer.concat(res._chunks).toString('utf8');
    cache.set(key, body);
  },
  onProxyReq: (proxyReq, req, res) => {
    // Check if the response is cached
    const key = req.url;
    const cachedBody = cache.get(key);
    if (cachedBody) {
      res.end(cachedBody);
    }
  },
});

// Define proxy middleware for Microservice 2 (Order Management Service)
const orderManagementProxy = createProxyMiddleware({
  target: 'http://localhost:4000', // Port of the Order Management Service
  changeOrigin: true,
  pathRewrite: {
    '^/order-management': '',
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add response caching
    const key = req.url;
    const body = Buffer.concat(res._chunks).toString('utf8');
    cache.set(key, body);
  },
  onProxyReq: (proxyReq, req, res) => {
    // Check if the response is cached
    const key = req.url;
    const cachedBody = cache.get(key);
    if (cachedBody) {
      res.end(cachedBody);
    }
  },
});

// Use proxy middleware for routing requests
app.use('/product-catalog', productCatalogProxy);
app.use('/order-management', orderManagementProxy);

app.listen(port, () => {
  console.log(`Gateway is running on port ${port}`);
});
