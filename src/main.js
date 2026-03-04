import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
await Actor.init();
const input = await Actor.getInput() ?? {};
const { queries = ['marketing'], maxTweets = 50, language = 'en' } = input;
const proxyConfiguration = await Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'] });
const crawler = new PlaywrightCrawler({
  proxyConfiguration, headless: true, navigationTimeoutSecs: 90,
  async requestHandler({ page, request }) {
    await page.waitForTimeout(4000);
    await page.waitForSelector('[data-testid="tweet"]', { timeout: 30000 }).catch(() => {});
    const tweets = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid="tweet"]')).map(el => ({
        text: el.querySelector('[data-testid="tweetText"]')?.innerText?.trim(),
        author: el.querySelector('[data-testid="User-Name"]')?.innerText?.trim(),
        likes: el.querySelector('[data-testid="like"]')?.innerText,
        retweets: el.querySelector('[data-testid="retweet"]')?.innerText,
        replies: el.querySelector('[data-testid="reply"]')?.innerText,
        views: el.querySelector('[aria-label*="views"]')?.innerText,
        timestamp: el.querySelector('time')?.getAttribute('datetime'),
        tweetUrl: 'https://x.com' + (el.querySelector('a[href*="/status/"]')?.getAttribute('href') ?? ''),
        hasMedia: !!el.querySelector('[data-testid="tweetPhoto"]'),
      })).filter(t => t.text);
    });
    console.log('Found ' + tweets.length + ' tweets for: ' + request.userData.query);
    await Actor.pushData(tweets.slice(0, request.userData.maxTweets));
  },
});
const requests = queries.map(query => ({
  url: 'https://x.com/search?q=' + encodeURIComponent(query) + '&src=typed_query&f=live&lang=' + language,
  userData: { query, maxTweets }
}));
await crawler.run(requests);
await Actor.exit();