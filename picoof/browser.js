const puppeteer = require("puppeteer");

const makeBrowserGetter = () => {
  let browserInstance = null;

  return async () => {
    if (browserInstance === null) {
      browserInstance = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });
    }

    return browserInstance;
  };
};

module.exports.getBrowser = makeBrowserGetter();
