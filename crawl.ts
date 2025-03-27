import { Dataset, log, PlaywrightCrawler } from 'crawlee';
import { config } from 'dotenv';


export interface RepoItem {
  repo: string;
  desc: string;
  tags: string;
  star: string;
  lang: string;
  update: string;
}

config();

const BASE_URL = process.env.CRAWL_BASE_URL
const FROM = process.env.CRAWL_FROM
const TO = process.env.CRAWL_TO;
const KEYWORD = process.env.CRAWL_KEY_WORD
const TOKEN = process.env.GH_TOKEN
const URL = `${BASE_URL}/search?q=${KEYWORD}+pushed%3A${FROM}..${TO}&type=repositories`;

const crawler = new PlaywrightCrawler({
  navigationTimeoutSecs: 120,
  requestHandlerTimeoutSecs: 120,
  maxRequestRetries: 20,
  maxRequestsPerMinute: 80,
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
      'Authorization': `Bearer ${TOKEN}`
    });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    if (request.label === 'BASE') {
      log.info(`Processing: ${request.url}`);
      await page.waitForSelector("div[data-testid='results-list']", {
        timeout: 30000,
        state: 'attached'
      });
      const containers = await page.locator("//div[@data-testid='results-list']/div").all();
      const nextButton = await page.locator("//a[@rel='next']");
      if (await nextButton.count() > 0) {
        const nextPageHref = await nextButton.getAttribute('href');
        log.info(`Found ${containers.length} repositories`);
        if (nextPageHref) {
          await enqueueLinks({ urls: [nextPageHref], label: "BASE" });
          log.info(`Enqueued next page: ${nextPageHref}`);
        }
      } else log.info(`Data has only 1 page`);
      const repoData = await Promise.all(containers.map(async (container) => {
        try {
          const [repoHref, description, meta, tags] = await Promise.all([
            container.locator("xpath=//div[contains(@class,'search-title')]/a").getAttribute("href"),
            container.locator("xpath=//span[contains(@class,'search-match')]").allTextContents(),
            container.locator("xpath=//li//span").all(),
            container.locator("xpath=//ul/preceding-sibling::div//a").allTextContents()
          ]);

          const item: RepoItem = {
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

crawler.run([{ url: URL, label: "BASE" }]);