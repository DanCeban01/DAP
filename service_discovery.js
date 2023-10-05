const consul = require('consul')();

// Register a service with Consul
consul.agent.service.register({
  id: 'my-service',
  name: 'my-service',
  address: 'localhost',
  port: 3000,
  check: {
    http: 'http://localhost:3000/health',
    interval: '10s',
  },
});

// Discover a service by name
consul.agent.service.list((err, services) => {
  if (err) throw err;

  // Retrieve the address and port of a service
  const targetService = services['my-service'];
  const targetAddress = targetService.Address;
  const targetPort = targetService.Port;

  // Use this address and port to communicate with the service
  console.log(`Service found at ${targetAddress}:${targetPort}`);
});
