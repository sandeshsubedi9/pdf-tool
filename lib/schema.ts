export const BASE_URL = 'https://pdfmaya.com';

/**
 * Generates Organization Schema
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'PDF Maya',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      '@id': `${BASE_URL}/#logo`,
      url: `${BASE_URL}/logo.png`,
      contentUrl: `${BASE_URL}/logo.png`,
      width: 512,
      height: 512,
      caption: 'PDF Maya',
    },
    sameAs: [
      'https://twitter.com/pdfmaya',
      'https://facebook.com/pdfmaya',
      'https://linkedin.com/company/pdfmaya',
    ],
  };
}

/**
 * Generates WebSite Schema with Sitelinks Searchbox
 */
export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'PDF Maya',
    description: 'The ultimate PDF tool collection for every document need.',
    publisher: {
      '@id': `${BASE_URL}/#organization`,
    },
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${BASE_URL}/search-pdf?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    ],
  };
}

/**
 * Generates SoftwareApplication/WebApplication Schema for specific tools
 */
export function getSoftwareAppSchema(
  name: string,
  description: string,
  path: string,
  category: string = 'MultimediaApplication'
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${name} - PDF Maya`,
    description: description,
    url: `${BASE_URL}${path}`,
    applicationCategory: category,
    operatingSystem: 'Windows, macOS, Linux, Android, iOS',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@id': `${BASE_URL}/#organization`,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '1250',
    },
  };
}

/**
 * Generates Breadcrumb Schema
 */
export function getBreadcrumbSchema(items: { name: string; item: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.item}`,
    })),
  };
}

/**
 * Generates FAQ Schema
 */
export function getFAQSchema(questions: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

/**
 * Generates Blog/Article Schema
 */
export function getBlogSchema(post: {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  authorName: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: post.image,
    datePublished: post.datePublished,
    author: {
      '@type': 'Person',
      name: post.authorName,
    },
    publisher: {
      '@id': `${BASE_URL}/#organization`,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': post.url,
    },
  };
}
