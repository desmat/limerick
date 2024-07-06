import moment from 'moment';
import { MetadataRoute } from 'next'
import { getDailyHaiku } from '@/services/haikus';
 
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const latestDailyHaiku = await getDailyHaiku();
  const lastModified = moment(latestDailyHaiku?.id).toDate();

  return [
    {
      url: 'https://limericks.ai/',
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
