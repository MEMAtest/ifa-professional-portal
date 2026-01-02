import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogPostView } from '@/components/marketing/blog/BlogPost'
import { blogPosts } from '@/components/marketing/blog/BlogData'

interface BlogPostPageProps {
  params: { slug: string }
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export function generateMetadata({ params }: BlogPostPageProps): Metadata {
  const post = blogPosts.find((entry) => entry.slug === params.slug)
  if (!post) {
    return { title: 'Article not found | Plannetic' }
  }

  return {
    title: `${post.title} | Plannetic`,
    description: post.summary
  }
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = blogPosts.find((entry) => entry.slug === params.slug)
  if (!post) {
    notFound()
  }

  return <BlogPostView post={post} />
}
