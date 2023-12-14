// const Consul = require('consul');

// const consul = new Consul();

// // Function to discover a service by name
// const discoverService = (serviceName, callback) => {
//   consul.agent.service.list((err, services) => {
//     if (err) {
//       return callback(err);
//     }

//     const service = services[serviceName];
//     if (!service) {
//       return callback(new Error('Service not found'));
//     }

//     const { ServicePort } = service;

//     const serviceUrl = `http://localhost:${ServicePort}`;
//     callback(null, serviceUrl);
//   });
// };

// // Define an endpoint for service discovery
// const express = require('express');
// const app = express();
// const serviceDiscoveryPort = 4000; // Port for the service discovery module

// app.get('/health', (req, res) => {
//   return res.json({ status: "OK" });
// })

// app.get('/discover/:service', (req, res) => {
//   const serviceName = req.params.service;

//   discoverService(serviceName, (err, serviceUrl) => {
//     if (err) {
//       return res.status(500).json({ error: 'Service discovery failed' });
//     }

//     return res.json({ serviceUrl });
//   });
// });

// app.listen(serviceDiscoveryPort, () => {
//   console.log(`Service Discovery is running on port ${serviceDiscoveryPort}`);
// });

const express = require('express');
const bodyParser = require('body-parser');
// import bodyParser from 'body-parser'

const app = express()
const port = 8040

const userServiceReplicas = []
const tweetServiceReplicas = []

app.use(bodyParser.json())

app.get('/status', (req, res) => {
  res.status(200).json({ status: 'OK' })
})

app.post('/services', (req, res) => {
  const { serviceType, serviceHost, servicePort } = req.body

  if (!serviceType || !serviceHost || !servicePort) {
    console.log(`Failed attempt to add service { host: ${serviceHost}, port: ${servicePort}, type: ${serviceType} }`)
    return res.status(400).send({ message: 'Missing required fields: serviceType, serviceHost, servicePort' })
  }

  const newService = { host: serviceHost, port: servicePort }

  if (serviceType === 'user') {
    if (!userServiceReplicas.some(el => el.host === newService.host && el.port === newService.port)) {
      userServiceReplicas.push(newService)
      console.log(`Service added successfully { host: ${serviceHost}, port: ${servicePort}, type: ${serviceType} }`)
    }
  } else if (serviceType === 'tweet') {
    if (!tweetServiceReplicas.some(el => el.host === newService.host && el.port === newService.port)) {
      tweetServiceReplicas.push(newService)
      console.log(`Service added successfully { host: ${serviceHost}, port: ${servicePort}, type: ${serviceType} }`)
    }
  } else {
    console.log(`Failed attempt to add service { host: ${serviceHost}, port: ${servicePort}, type: ${serviceType} }`)
    return res.status(400).send({ message: 'Invalid serviceType. Expected "user" or "tweet".' })
  }

  res.status(200).send({ message: 'Service added successfully' })
})

app.get('/services', (req, res) => {
  res.status(200).json({
    userServices: userServiceReplicas,
    tweetServices: tweetServiceReplicas
  })
})

// Start the service discovery server
app.listen(port, () => console.log(`Service Discovery running on port ${port}`))