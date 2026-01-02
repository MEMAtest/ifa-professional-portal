import Link from 'next/link'
import { BlogPost } from './BlogData'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { BlogCover } from './BlogCover'
import { HighlightTile } from './HighlightTile'

interface BlogIndexProps {
  posts: BlogPost[]
}

export const BlogIndex = ({ posts }: BlogIndexProps) => {
  return (
    <MarketingShell>
      <section className="bg-slate-50 py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600 mb-3">Plannetic Blog</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Insights for modern advisory firms</h1>
            <p className="text-lg text-gray-600 max-w-2xl">Practical guidance on compliance, suitability, and financial planning workflows.</p>
          </div>

          <div className="space-y-6">
            {posts.map((post) => (
              <article key={post.slug} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <BlogCover
                  tone={post.cover.tone}
                  icon={post.cover.icon}
                  label={post.cover.label}
                  imageSrc={post.coverImage.src}
                  imageAlt={post.coverImage.alt}
                  compact
                />
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-semibold">{post.category}</span>
                  <span>{post.date}</span>
                  <span>{post.readingTime}</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  <Link href={`/blog/${post.slug}`} className="hover:text-teal-600">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-gray-600 mb-4">{post.summary}</p>
                {post.highlights?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {post.highlights.slice(0, 2).map((highlight) => (
                      <HighlightTile key={`${post.slug}-${highlight.title}`} highlight={highlight} tone={post.cover.tone} compact />
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>By {post.author}</span>
                  <span>-</span>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 rounded-full bg-slate-100 text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
