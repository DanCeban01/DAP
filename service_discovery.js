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

    const { ServiceAddress, ServicePort } = service;

    const serviceUrl = `http://${ServiceAddress}:${ServicePort}`;
    callback(null, serviceUrl);
  });
};

module.exports = { discoverService };
