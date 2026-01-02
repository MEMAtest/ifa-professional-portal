import { Metadata } from 'next'
import { BlogIndex } from '@/components/marketing/blog/BlogIndex'
import { blogPosts } from '@/components/marketing/blog/BlogData'

export const metadata: Metadata = {
  title: 'Blog | Plannetic',
  description: 'Insights for modern advisory firms on compliance, suitability, and planning.'
}

export default function BlogPage() {
  return <BlogIndex posts={blogPosts} />
}
