const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const NodeCache = require('node-cache');
const Consul = require('consul');

const app = express();
const port = 3000; // Port for the gateway

// Create a cache instance with a default TTL of 60 seconds
const cache = new NodeCache({ stdTTL: 60 });

// Create a Consul instance for service discovery
const consul = Consul();

// Define proxy middleware for Microservices
const createServiceProxy = (serviceName, servicePort) => {
  return createProxyMiddleware({
    target: `http://localhost:${servicePort}`, // Initialize with a default target, but it will be updated based on service discovery
    changeOrigin: true,
    pathRewrite: {
      [`^/${serviceName}`]: '',
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
};

// Define a route for service discovery
app.get('/discover/:service', (req, res) => {
  const serviceName = req.params.service;

  // Use Consul to discover a service by name
  consul.agent.service.list((err, services) => {
    if (err) {
      return res.status(500).json({ error: 'Service discovery failed' });
    }

    // Get the port of the service
    const service = services[serviceName];
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const { ServicePort } = service;

    // Update the target of the proxy middleware based on service discovery
    const proxyMiddleware = createServiceProxy(serviceName, ServicePort);

    // Use the proxy middleware for routing requests
    app.use(`/${serviceName}`, proxyMiddleware);

    res.json({ message: 'Service discovered and proxy updated' });
  });
});

app.listen(port, () => {
  console.log(`Gateway is running on port ${port}`);
});
