const { memoryUsage } = require("process");
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
  return memoryUsage.toFixed(0) * 1;
}

const requests = {};
let numActive = 0;
let userAuths = [];
let numAuthRequests = 0;

async function requestTracker(req, res, next) {
  try {
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
    }

    if (meth == "PUT" && url == "/api/auth") {
      numAuthRequests++;
    }
    requests[meth] = (requests[meth] || 0) + 1;
  } catch (error) {
    console.error("Error tracking request:", error);
  }
  next();
}

const timer = setInterval(() => {
  console.log("started");
  Object.keys(requests).forEach((method) => {
    console.log(method);
    console.log(requests[method]);
    sendMetricToGrafana("requests", requests[method], { method }, "sum", "1");
  });
  const memUsage = getMemoryUsagePercentage();
  const cpuUsage = getCpuUsagePercentage();
  console.log("active users");
  console.log(numActive);
  console.log("num auth reqs");
  console.log(numAuthRequests);
  sendMetricToGrafana("Memory", memUsage, {}, "gauge", "%");
  sendMetricToGrafana("CPU", cpuUsage, {}, "gauge", "%");
  sendMetricToGrafana("ActiveUsers", numActive, {}, "sum", "1");
  sendMetricToGrafana("AuthRequests", numAuthRequests, {}, "sum", "1");

  console.log("running");
  numActive = 0;
  userAuths = [];
}, 10000);

function sendMetricToGrafana(metricName, metricValue, attributes, type, unit) {
  console.log("Metric: ", metricName);
  console.log("attributes: ", attributes);

  attributes = { ...attributes, source: config.metrics.source };

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
                      asInt: metricValue,
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

  console.log(
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].dataPoints[0]
      .attributes
  );

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
