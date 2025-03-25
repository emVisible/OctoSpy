import { PlaywrightCrawler, Dataset, log } from 'crawlee';
import { config } from 'dotenv';
config();

interface MCPItem {
  repo: string;
  desc: string;
  tags: string;
  star: string;
  lang: string;
  update: string;
}

const from = process.env.MCP_CRAWL_FROM;
const to = process.env.MCP_CRAWL_TO;
const url = `${process.env.MCP_CRAWL_BASE_URL}/search?q=mcp+pushed%3A${from}..${to}&type=repositories`;

const crawler = new PlaywrightCrawler({
  navigationTimeoutSecs: 120,
  requestHandlerTimeoutSecs: 120,
  maxRequestRetries: 7,
  retryOnBlocked: true,
  headless: true,
  useSessionPool: true,
  launchContext: {
    launchOptions: {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36...',
        '--disable-images'],
    },
  },
  preNavigationHooks: [async ({ page }) => {
    await page.route('**/*', (route) => {
      const request = route.request();
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }],
  requestHandler: async ({ page, request, enqueueLinks }) => {
    const startTime = Date.now();
    await page.setExtraHTTPHeaders({
      'Authorization': `Bearer ${process.env.MCP_GH_TOKEN}`
    });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    if (request.label === 'BASE') {
      log.info(`Processing: ${request.url}`);
      await page.waitForSelector("div[data-testid='results-list']", {
        timeout: 30000,
        state: 'attached'
      });

      const containers = await page.locator("//div[@data-testid='results-list']/div").all();
      const nextButton = page.locator("//a[@rel='next']");
      const nextPageHref = await nextButton.getAttribute('href');
      log.info(`Found ${containers.length} repositories`);
      if (nextPageHref) {
        await enqueueLinks({ urls: [nextPageHref], label: "BASE" });
        log.info(`Enqueued next page: ${nextPageHref}`);
      }

      const repoData = await Promise.all(containers.map(async (container) => {
        try {
          const [repoHref, description, meta, tags] = await Promise.all([
            container.locator("xpath=//div[contains(@class,'search-title')]/a").getAttribute("href"),
            container.locator("xpath=//span[contains(@class,'search-match')]").allTextContents(),
            container.locator("xpath=//li//span").all(),
            container.locator("xpath=//ul/preceding-sibling::div//a").allTextContents()
          ]);

          const item: MCPItem = {
            repo: repoHref ? repoHref.slice(1) : "null",
            desc: description.length === 2 ? description[1] : "null",
            tags: tags.length != 0 ? tags.join(',') : "null",
            star: "null",
            lang: "null",
            update: "null",
          };

          if (meta.length === 4) {
            item.lang = await meta[0].textContent() ?? "null";
            item.star = await meta[1].textContent() ?? "null";
            item.update = await meta[3].textContent() ?? "null";
          } else if (meta.length === 3) {
            item.star = await meta[0].textContent() ?? "null";
            item.update = await meta[2].textContent() ?? "null";
          }

          return item;
        }
        catch (error: any) {
          log.error(`Processing Error: ${request.url}: ${error.message}`);
          process.exit(1);
        }
        finally {
          log.info(`Finished: ${request.url} duration: ${(Date.now() - startTime) / 1000}s`);
        }
      }));

      await Dataset.pushData(repoData.filter(Boolean));
      log.info(`Pushed ${repoData.length} repositories`);
    }
  },
  failedRequestHandler: async ({ request }) => {
    request.retryCount += 1;
    const delaySec = Math.pow(2, request.retryCount);
    await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
  },
});

crawler.run([{ url, label: "BASE" }]);