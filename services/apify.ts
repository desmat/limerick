import { ApifyClient } from 'apify-client';

export async function crawl({ url }: { url?: string }): Promise<any> {
  console.log(">> services.apify.crawl", { url });

  if (process.env.OPENAI_API_KEY == "DEBUG") {
    return "DEBUG context"
  }
  
  const client = new ApifyClient({
    token: process.env.APIFY_TOKEN
  });

  const { defaultDatasetId } = await client.actor('apify/website-content-crawler').call({
    startUrls: [{ url: url }],
    maxCrawlingDepth: 1,
    maxPagesPerCrawl: 1,
  });

  const { items } = await client.dataset(defaultDatasetId).listItems();
  console.log(">> services.apify.crawl", { items });

  return items[0]?.text;
}
