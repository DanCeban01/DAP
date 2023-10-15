const Consul = require('consul');

const consul = Consul();

// Function to discover a service by name
const discoverService = (serviceName, callback) => {
  consul.agent.service.list((err, services) => {
    if (err) {
      return callback(err);
    }

    const service = services[serviceName];
    if (!service) {
      return callback(new Error('Service not found'));
    }

    const { ServicePort } = service;

    const serviceUrl = `http://localhost:${ServicePort}`;
    callback(null, serviceUrl);
  });
};

// Define an endpoint for service discovery
const express = require('express');
const app = express();
const serviceDiscoveryPort = 4000; // Port for the service discovery module

app.get('/discover/:service', (req, res) => {
  const serviceName = req.params.service;

  discoverService(serviceName, (err, serviceUrl) => {
    if (err) {
      return res.status(500).json({ error: 'Service discovery failed' });
    }

    res.json({ serviceUrl });
  });
});

app.listen(serviceDiscoveryPort, () => {
  console.log(`Service Discovery is running on port ${serviceDiscoveryPort}`);
});
