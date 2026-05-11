import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PDF Maya',
    short_name: 'PDF Maya',
    description: 'Every PDF Tool in One Place. Edit, Merge, split, compress, convert, sign and do much more with PDFs.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#047C58',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
