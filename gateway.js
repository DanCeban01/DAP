const express = require('express');
const http = require('http');
const NodeCache = require('node-cache');
const Consul = require('consul');

const app = express();
const port = 3000; // Port for the gateway

// Create a cache instance with a default TTL of 60 seconds
const cache = new NodeCache({ stdTTL: 60 });

// Create a Consul instance for service discovery
const consul = new Consul();

// Create an object to track the service endpoints and their current indices
const serviceEndpoints = {};

// Define proxy middleware for Microservices with Round Robin load balancing
const createServiceProxy = (serviceName, servicePort) => {
  // Initialize the service endpoint if it doesn't exist
  if (!serviceEndpoints[serviceName]) {
    serviceEndpoints[serviceName] = {
      ports: [servicePort],
      currentIdx: 0, // Start with the first replica
    };
  }

  // Get the current endpoint index
  const currentIdx = serviceEndpoints[serviceName].currentIdx;

  // Update the target of the proxy middleware based on Round Robin
  const targetPort = serviceEndpoints[serviceName].ports[currentIdx];
  const proxyMiddleware = createProxyMiddleware({
    target: `http://localhost:${targetPort}`,
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

  // Update the index for the next request
  serviceEndpoints[serviceName].currentIdx = (currentIdx + 1) % serviceEndpoints[serviceName].ports.length;

  return proxyMiddleware;
};

// Define a route for service discovery
app.get('/discover/:service', (req, res) => {
  const serviceName = req.params.service;

  // Use Consul to discover the service and get all available ports
  consul.agent.service.list((err, services) => {
    if (err) {
      return res.status(500).json({ error: 'Service discovery failed' });
    }

    const service = services[serviceName];
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const ports = services[serviceName].map((s) => s.ServicePort);

    // Update the available ports for the service
    serviceEndpoints[serviceName].ports = ports;

    // Use the proxy middleware for routing requests with Round Robin load balancing
    app.use(`/${serviceName}`, createServiceProxy(serviceName, ports[0]));

    res.json({ message: 'Service discovered and proxy updated with Round Robin load balancing' });
  });
});

// Define an endpoint for the gateway itself
app.get('/', (req, res) => {
  res.json({ message: 'This is the API Gateway' });
});

app.listen(port, () => {
  console.log(`Gateway is running on port ${port}`);
});
