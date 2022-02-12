const fs = require("fs");
const path = require("path");
const { toBoolean, readString, handleSearchParams } = require("./utils");
const { RESOURCES_DIR, DISABLE_NETWORK } = require("./config");

const getResourcesFromDisk = () => {
  if (!RESOURCES_DIR) {
    return {};
  }

  const walkSync = (dir) => {
    const result = {};

    const filenames = fs.readdirSync(dir);

    for (const file of filenames) {
      const filePath = path.join(dir, file);
      const fileStat = fs.statSync(filePath);

      if (fileStat.isDirectory()) {
        Object.assign(result, walkSync(filePath));
      } else {
        const relativePath = path.relative(RESOURCES_DIR, filePath);

        result[`local/${relativePath}`] = () => {
          return new Promise((resolve, reject) => {
            fs.readFile(filePath, function (err, data) {
              if (err) {
                reject(err);
              }
              resolve(data);
            });
          });
        };
      }
    }

    return result;
  };

  return walkSync(RESOURCES_DIR);
};

const RESOURCES_FROM_DISK = getResourcesFromDisk();

module.exports.getRequestContext = async (req, reply) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Create context with some basic data and methods
  const context = {
    $method: req.method,
    $path: url.pathname,
    $reply: reply,
    $resources: { ...RESOURCES_FROM_DISK },
  };

  // Validate request url
  if (context.$path === "/png") {
    context.$responseKind = "png";
  } else if (context.$path === "/pdf") {
    context.$responseKind = "pdf";
  } else {
    await context.$reply(404, {
      reason: `Unknown endpoint: '${context.$path}'`,
    });
  }

  // Update context with query parameters
  const handledSearchParams = handleSearchParams(url.searchParams);
  for (const [key, value] of Object.entries(handledSearchParams)) {
    context[key] = value;
  }

  // Update context with data from body if method is 'POST'
  if (req.method == "POST") {
    const rawBody = await readString(req);
    let body;

    switch (req.headers["content-type"]) {
      case "application/x-www-form-urlencoded":
        body = handleSearchParams(new URLSearchParams(rawBody));
        break;
      case "application/json":
        body = JSON.parse(rawBody);
        break;
      default:
        body = null;
    }

    Object.assign(context, body);
  }

  // Handle resources
  if (context["resources[]"]) {
    for (const resource of context["resources[]"]) {
      const parsedResource = JSON.parse(resource);

      if (!parsedResource.path || !parsedResource.content) {
        continue;
      }

      // Path should be in form of `{host}{pathname}{search}{hash}`
      context.$resources[parsedResource.path] = parsedResource.content;
    }
  }

  return context;
};

const loadResourceFromSource = async (source) => {
  if (typeof source === "function") {
    return await source();
  }

  return source;
};

const guessContentType = (resourceKey) => {
  if (resourceKey.endsWith(".html")) {
    return "text/html";
  }
  if (resourceKey.endsWith(".js")) {
    return "text/javascript";
  }
  if (resourceKey.endsWith(".css")) {
    return "text/css";
  }
  if (resourceKey.endsWith(".html")) {
    return "text/html";
  }
  if (resourceKey.endsWith(".png")) {
    return "image/png";
  }
  if (resourceKey.endsWith(".jpg") || resourceKey.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  return null;
};

module.exports.createNewPage = async (browser, context) => {
  const page = await browser.newPage();

  await page.setRequestInterception(true);

  page.on("pageerror", function (err) {
    log(`Pageerror while rendering page: ${err}`);
  });

  page.on("error", function (err) {
    log(`Error while rendering page: ${err}`);
  });

  page.on("request", async (req) => {
    if (req.isInterceptResolutionHandled()) {
      return;
    }

    const url = new URL(req.url());
    const resourceKey = `${url.host}${url.pathname}${url.search}${url.hash}`;
    const resourceSource = context.$resources[resourceKey];
    const resource = await loadResourceFromSource(resourceSource);

    if (req.isInterceptResolutionHandled()) {
      return;
    }

    if (!resource) {
      if (context.disableNetwork || DISABLE_NETWORK) {
        await req.abort();
      } else {
        await req.continue();
      }

      return;
    }

    const contentType = guessContentType(resourceKey);

    await req.respond({
      body: resource,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
    });
  });

  return page;
};

module.exports.preparePage = async (page, context) => {
  await page.setViewport({
    width: new Number(context.width || 800),
    height: new Number(context.height || 600),
  });

  if (context.url) {
    if (
      !context.url.startsWith("http://") &&
      !context.url.startsWith("https://")
    ) {
      await context.$reply(400, {
        reason: "Provided url should start with 'http://' or 'https://'",
      });
    }

    await page.goto(context.url, {
      waitUntil: context.waitUntil || "networkidle0",
    });

    return page;
  }

  if (context.content) {
    await page.setContent(context.content, {
      waitUntil: context.waitUntil || "networkidle0",
    });

    return page;
  }
};

module.exports.produceResponse = async (page, context) => {
  if (context.$responseKind === "png") {
    return await page.screenshot({ fullPage: context.fullPage || true });
  }

  if (context.$responseKind === "pdf") {
    await page.emulateMediaType("screen");

    return await page.pdf({
      format: context.format || "A4",
      landscape: toBoolean(context.landscape),
      printBackground: true,
    });
  }
};
