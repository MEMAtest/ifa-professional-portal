import Link from 'next/link'
import { BlogPost } from './BlogData'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { BlogCover } from './BlogCover'
import { HighlightTile } from './HighlightTile'

interface BlogPostProps {
  post: BlogPost
}

export const BlogPostView = ({ post }: BlogPostProps) => {
  return (
    <MarketingShell>
      <article className="bg-white py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/blog" className="text-sm text-teal-600 font-semibold">Back to blog</Link>
          <div className="mt-4 mb-8 space-y-4">
            <BlogCover
              tone={post.cover.tone}
              icon={post.cover.icon}
              label={post.cover.label}
              imageSrc={post.coverImage.src}
              imageAlt={post.coverImage.alt}
            />
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-semibold">{post.category}</span>
              <span>{post.date}</span>
              <span>{post.readingTime}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{post.title}</h1>
            <p className="text-lg text-gray-600">{post.summary}</p>
            <p className="text-sm text-gray-500 mt-3">By {post.author}</p>
          </div>

          {post.highlights?.length ? (
            <div className="mb-10">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Highlights</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {post.highlights.map((highlight) => (
                  <HighlightTile key={highlight.title} highlight={highlight} tone={post.cover.tone} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-10 text-gray-700 leading-relaxed">
            {post.sections.map((section, index) => (
              <section key={`${post.slug}-${index}`}>
                {section.heading && (
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.heading}</h2>
                )}
                <div className="space-y-4">
                  {section.body.map((paragraph, pIndex) => (
                    <p key={`${post.slug}-${index}-${pIndex}`}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Tagged</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full bg-slate-100 text-sm text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {post.sources?.length ? (
            <div className="mt-10 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Sources</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {post.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-600 hover:text-teal-700"
                    >
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </article>
    </MarketingShell>
  )
}
