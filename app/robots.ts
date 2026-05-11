import { MetadataRoute } from 'next'
import { BASE_URL } from '@/lib/schema'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/settings/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
