const { memoryUsage, send } = require("process");
const config = require("./config");
const os = require("os");

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2) * 1;
}

const requests = {};
let numActive = 0;
let userAuths = [];
let numAuthRequests = 0;
let numFailedAuthRequests = 0;
let totalRev = 0;
let numSold = 0;
let creationFailures = 0;
let numReqs = 0;
let totalReqLatency = 0;

async function requestTracker(req, res, next) {
  try {
    const startTime = process.hrtime();

    res.on("finish", () => {
      if (meth == "PUT" && url == "/api/auth") {
        console.log("STATUSCODE", res.statusCode);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          numAuthRequests++;
        } else {
          numFailedAuthRequests++;
        }
      } else if (meth == "POST" && url == "/api/order") {
        console.log("PIZZA DETECTED");
        pizzaPurchaseHandler(req.body.items, res.statusCode);
      }
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const durationMs = seconds * 1e3 + nanoseconds / 1e6;
      numReqs += 1;
      totalReqLatency += durationMs;
    });

    const meth = req.method;
    console.log(req.method);
    const url = req.url;
    console.log(req.body);

    if ("authorization" in req.headers) {
      const auth = req.headers["authorization"];
      if (!userAuths.includes(auth)) {
        numActive++;
        userAuths.push(auth);
      }
    } else {
      numActive++;
    }

    requests[meth] = (requests[meth] || 0) + 1;
  } catch (error) {
    console.error("Error tracking request:", error);
  }
  next();
}

function pizzaPurchaseHandler(pizzaItems, responseCode) {
  if (responseCode >= 200 && responseCode < 300) {
    const pizzaSold = pizzaItems.length;
    numSold += pizzaSold;
    for (const item of pizzaItems) {
      totalRev += item.price;
    }
    totalRev = parseFloat(totalRev.toFixed(2));
  } else {
    creationFailures++;
  }
}

const timer = setInterval(() => {
  console.log("started");
  Object.keys(requests).forEach((method) => {
    //console.log(method);
    //console.log(requests[method]);
    sendMetricToGrafana("requests", requests[method], { method }, "sum", "1");
  });
  const memUsage = getMemoryUsagePercentage();
  const cpuUsage = getCpuUsagePercentage();
  console.log("active users");
  console.log(numActive);
  console.log("num auth reqs");
  console.log(numAuthRequests);
  sendMetricToGrafana("Memory", memUsage, {}, "gauge", "%", true);
  sendMetricToGrafana("CPU", cpuUsage, {}, "gauge", "%", true);
  sendMetricToGrafana("ActiveUsers", numActive, {}, "sum", "1");
  sendMetricToGrafana("AuthRequests", numAuthRequests, {}, "sum", "1");
  sendMetricToGrafana(
    "Failed AuthRequests",
    numFailedAuthRequests,
    {},
    "sum",
    "1"
  );
  console.log("Num sold: ", numSold, "Rev: ", totalRev);
  console.log("Failed Auth Reqs: ", numFailedAuthRequests);
  sendMetricToGrafana("Pizzas Bought", numSold, {}, "sum", "1");
  sendMetricToGrafana("Revenue", totalRev, {}, "sum", "USD", true);
  sendMetricToGrafana("Purchase Failures", creationFailures, {}, "sum", "1");
  if (numReqs != 0) {
    sendMetricToGrafana(
      "Request Latency",
      totalReqLatency / numReqs,
      {},
      "gauge",
      "ms",
      1,
      true
    );
  }

  console.log("running");
  numActive = 0;
  userAuths = [];
  numReqs = 0;
  totalReqLatency = 0;
}, 10000);

function sendMetricToGrafana(
  metricName,
  metricValue,
  attributes,
  type,
  unit,
  useDouble = false
) {
  attributes = { ...attributes, source: config.metrics.source };
  const metricType = useDouble ? "asDouble" : "asInt";

  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: unit,
                [type]: {
                  dataPoints: [
                    {
                      [metricType]: metricValue,
                      timeUnixNano: Date.now() * 1000000,
                      attributes: [],
                    },
                  ],
                  aggregationTemporality: "AGGREGATION_TEMPORALITY_CUMULATIVE",
                  isMonotonic: true,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  Object.keys(attributes).forEach((key) => {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][
      type
    ].dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  fetch(`${config.metrics.url}`, {
    method: "POST",
    body: JSON.stringify(metric),
    headers: {
      Authorization: `Bearer ${config.metrics.apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Failed to push metrics data to Grafana");
        console.log(response);
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

module.exports = { requestTracker };
