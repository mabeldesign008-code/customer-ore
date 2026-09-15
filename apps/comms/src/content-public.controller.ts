/**
 * Public content API — blog, help centre, legal pages, banners. No token required.
 *
 *   GET /content/articles[?kind&categoryId&tag&limit]
 *   GET /content/articles/:slug
 *   GET /content/categories
 *   GET /content/banners/active
 *
 * Everything here is PUBLISHED-only by construction: the service refuses to return a draft
 * or an archived article, so there is no query parameter that can be tweaked into leaking
 * unpublished content. That property is the reason an editor can save a half-finished policy
 * page without worrying about it appearing on the site.
 *
 * Legal pages that nobody has signed off are served with `legalReviewed: false`, which is
 * what the public page uses to render the "DRAFT — NOT LEGAL ADVICE" banner. The flag is
 * returned rather than the text being withheld, because a customer who has found the page is
 * better served by reading it with a warning than by getting a 404.
 */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '@ore/core';
import { ContentService } from './content.service';

@Controller('content')
export class ContentPublicController {
  constructor(private readonly content: ContentService) {}

  @Get('articles')
  @Public()
  async articles(
    @Query('kind') kind?: string,
    @Query('categoryId') categoryId?: string,
    @Query('tag') tag?: string,
    @Query('limit') limit?: string,
  ) {
    const rows = await this.content.listPublished({ kind, categoryId, tag, limit: limit ? parseInt(limit, 10) : undefined });
    // Listings carry no body: a blog index that ships every article's full markdown is a
    // large response for no benefit.
    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      kind: a.kind,
      excerpt: a.excerpt,
      tags: (a.tagsText ?? '').split(' ').filter(Boolean),
      categoryId: a.categoryId,
      ogImageUrl: a.ogImageUrl,
      publishedAt: a.publishedAt,
    }));
  }

  @Get('articles/:slug')
  @Public()
  async article(@Param('slug') slug: string) {
    const a = await this.content.publishedArticle(slug);
    return {
      id: a.id,
      title: a.title,
      slug: a.slug,
      kind: a.kind,
      bodyMarkdown: a.bodyMarkdown,
      excerpt: a.excerpt,
      tags: (a.tagsText ?? '').split(' ').filter(Boolean),
      categoryId: a.categoryId,
      seoTitle: a.seoTitle,
      seoDescription: a.seoDescription,
      ogImageUrl: a.ogImageUrl,
      indexable: a.indexable,
      legalReviewed: a.legalReviewed,
      revision: a.revisionCount,
      publishedAt: a.publishedAt,
      updatedAt: a.updatedAt,
    };
  }

  @Get('categories')
  @Public()
  async categories() {
    const rows = await this.content.listCategories();
    return rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug, kind: c.kind, description: c.description }));
  }

  /**
   * Banners live for this viewer. Unauthenticated callers see only `ALL`-audience banners,
   * which is correct: we do not know their role, so we must not guess one.
   */
  @Get('banners/active')
  @Public()
  async banners(@Query('city') city?: string) {
    const rows = await this.content.activeBanners({ role: 'CUSTOMER', city: city ?? null });
    return rows.map((b) => ({
      id: b.id,
      title: b.title,
      body: b.body,
      severity: b.severity,
      linkUrl: b.linkUrl,
      dismissible: b.dismissible,
      startsAt: b.startsAt,
      endsAt: b.endsAt,
    }));
  }
}
