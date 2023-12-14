const axios = require("axios");
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const NodeCache = require("node-cache");
const Consul = require("consul");

const app = express();
const port = 8888; // Port for the gateway

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
      [`^/${serviceName}`]: "",
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add response caching
      const key = req.url;
      const body = Buffer.concat(res._chunks).toString("utf8");
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
  serviceEndpoints[serviceName].currentIdx =
    (currentIdx + 1) % serviceEndpoints[serviceName].ports.length;

  return proxyMiddleware;
};

let orderServiceCounter = 0;
let productServiceCounter = 0;
const MAX_REROUTES = 2;
const TASK_TIMEOUT_MS =
  (process.env.TASK_TIMEOUT ? parseInt(process.env.TASK_TIMEOUT) : 10) * 1000;

const serviceDiscoveryResponse = {
  catalog: [
    {
      host: "catalog1",
      port: "3030",
    },
    {
      host: "catalog2",
      port: "3031",
    },
    {
      host: "catalog3",
      port: "3032",
    },
  ],
  order: [
    {
      host: "localhost",
      port: "4040",
    },
  ],
};

async function callService(serviceType, requestMethod, requestUrl, reqBody) {
  const orderServices = serviceDiscoveryResponse.order;
  const productServices = serviceDiscoveryResponse.catalog;

  for (let i = 0; i < MAX_REROUTES; ++i) {
    orderServiceCounter = orderServiceCounter % orderServices.length;
    productServiceCounter = productServiceCounter % productServices.length;

    let nextService;
    if (serviceType === "order") {
      nextService = orderServices[orderServiceCounter];
      orderServiceCounter++;
    } else if (serviceType === "catalog") {
      nextService = productServices[productServiceCounter];
      productServiceCounter++;
    }

    const { host, port } = nextService;
    const nextServiceUrl = `http://${host}:${port}`;

    try {
      console.log(
        `Attempting call to service of type ${serviceType} at ${nextServiceUrl}`
      );
      const serviceResponse = await axios({
        method: requestMethod,
        url: `${nextServiceUrl}/${requestUrl}`,
        data: reqBody,
      });

      return {
        statusCode: 200,
        responseBody: serviceResponse.data,
        serviceUrl: nextServiceUrl,
      };
    } catch (error) {
      // console.log(error);
      if (error.code === "ENOTFOUND") {
        console.log(
          `Failed to call service of type ${serviceType} at ${nextServiceUrl}`
        );
        circuitBreaker(serviceType, nextServiceUrl);
        continue;
      } else {
        return {
          statusCode: error.response.status,
          responseBody: error.response.data,
        };
      }
    }
  }

  return {
    statusCode: 500,
    responseBody: { message: `${serviceType} Service Call Failed` },
  };
}

function circuitBreaker(serviceType, serviceUrl) {
  setTimeout(async () => {
    const start = Date.now();
    let errors = 0;

    while (true) {
      try {
        await axios({
          method: "get",
          url: `${serviceUrl}/status`,
        });
      } catch (error) {
        if (error.code === "ENOTFOUND") {
          errors++;

          if (errors >= 3 && Date.now() - start <= TASK_TIMEOUT_MS * 3.5) {
            console.log(
              `CIRCUIT BREAKER: Service of type ${serviceType} located at ${serviceUrl} is UNHEALTHY!!!`
            );
            return;
          }

          continue;
        }
      }

      break;
    }
  }, 0);
}

app.use(bodyParser.json());

app.get("/health", (req, res) => {
  return res.json({ status: "OK" });
});

// Define a route for service discovery
app.get("/discover/:service", (req, res) => {
  const serviceName = req.params.service;

  // Use Consul to discover the service and get all available ports
  consul.agent.service.list((err, services) => {
    if (err) {
      return res.status(500).json({ error: "Service discovery failed" });
    }

    const service = services[serviceName];
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const ports = services[serviceName].map((s) => s.ServicePort);

    // Update the available ports for the service
    serviceEndpoints[serviceName].ports = ports;

    // Use the proxy middleware for routing requests with Round Robin load balancing
    app.use(`/${serviceName}`, createServiceProxy(serviceName, ports[0]));

    res.json({
      message:
        "Service discovered and proxy updated with Round Robin load balancing",
    });
  });
});

// Define an endpoint for the gateway itself
app.get("/", (req, res) => {
  res.json({ message: "This is the API Gateway" });
});

app.post("/add_product", async (req, res) => {
  const { statusCode, responseBody } = await callService(
    "catalog",
    "post",
    "add_product",
    req.body
  );
  res.status(statusCode).json(responseBody);
});

app.listen(port, () => {
  console.log(`Gateway is running on port ${port}`);
});
