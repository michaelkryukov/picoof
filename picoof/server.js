const http = require("http");
const process = require("process");
const { getBrowser } = require("./browser");
const { log, isObject } = require("./utils");
const {
  getRequestContext,
  createNewPage,
  preparePage,
  produceResponse,
} = require("./app");

class ProcessingCompleted extends Error {
  constructor(message) {
    super(message);
    this.name = "ProcessingCompleted";
  }
}

const requestHandler = async (req, reply) => {
  const closeables = [];

  try {
    const browser = await getBrowser();
    const context = await getRequestContext(req, reply);
    let page = await createNewPage(browser, context);
    closeables.push(page);
    page = await preparePage(page, context);
    const response = await produceResponse(page, context);
    await reply(200, response);
  } finally {
    for (const closeable of closeables) {
      await closeable.close();
    }
  }
};

const requestHandlerWrapper = async (req, res) => {
  const startedAt = Date.now();

  const reply = async (status, content) => {
    if (isObject(content)) {
      res.setHeader("content-type", "application/json");
      res.writeHead(status);
      res.end(JSON.stringify(content));
    } else {
      res.writeHead(status);
      res.end(content);
    }

    const elapsedMs = Date.now() - startedAt;
    log(`${req.method} '${req.url}' ${status} (${elapsedMs}ms)`);

    throw new ProcessingCompleted("Request processing was completed");
  };

  try {
    await requestHandler(req, reply);
  } catch (error) {
    if (error.name === "ProcessingCompleted") {
      return;
    }

    res.writeHead(500);
    res.end("");

    const timestamp = new Date().toLocaleString().replace(",", "");
    error.message += ` (at ${timestamp})`;

    throw error;
  }
};

const startServer = () => {
  const server = http.createServer(requestHandlerWrapper);

  const handleExit = async (_) => {
    server.close(async () => {
      const browser = await getBrowser();
      await browser.close();
    });
  };

  process.on("SIGINT", handleExit);
  process.on("SIGTERM", handleExit);

  server.listen(8080);
};

startServer();
