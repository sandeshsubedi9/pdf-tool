import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://pdfmaya.com'

  // Define main application routes (PDF tools and key pages)
  const routes = [
    '',
    '/blog',
    '/compare-pdf',
    '/compress-pdf',
    '/crop-pdf',
    '/edit-pdf',
    '/excel-to-pdf',
    '/extract-images',
    '/html-to-pdf',
    '/jpg-to-pdf',
    '/merge-pdf',
    '/ocr-pdf',
    '/organise-pdf',
    '/page-number-pdf',
    '/pdf-to-epub',
    '/pdf-to-excel',
    '/pdf-to-jpg',
    '/pdf-to-pdfa',
    '/pdf-to-png',
    '/pdf-to-pptx',
    '/pdf-to-txt',
    '/pdf-to-word',
    '/png-to-pdf',
    '/pptx-to-pdf',
    '/protect-pdf',
    '/redact-pdf',
    '/remove-pages',
    '/repair-pdf',
    '/rotate-pdf',
    '/search-pdf',
    '/sign-pdf',
    '/split-pdf',
    '/translate-pdf',
    '/unlock-pdf',
    '/watermark-pdf',
    '/word-to-pdf',
  ]

  // Define legal and informational pages (lower priority)
  const infoRoutes = [
    '/acceptable-use',
    '/accessibility',
    '/cookies',
    '/disclaimer',
    '/dmca',
    '/privacy',
    '/terms',
  ]

  const sitemapRoutes: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))

  const infoSitemapRoutes: MetadataRoute.Sitemap = infoRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  return [...sitemapRoutes, ...infoSitemapRoutes]
}
