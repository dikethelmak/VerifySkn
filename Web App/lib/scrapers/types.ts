export interface ScrapedPost {
  platform: 'reddit' | 'twitter' | 'tiktok' | 'instagram'
  post_url: string
  content: string
  image_urls: string[]
  engagement_score: number
  created_at: string
}

export interface ScraperAdapter {
  name: string
  isAvailable(): Promise<boolean>
  scrape(brand: string, product: string): Promise<ScrapedPost[]>
}
