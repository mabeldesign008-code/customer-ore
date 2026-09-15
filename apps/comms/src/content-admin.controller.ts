/**
 * Admin CMS API. Mounted at `/content/admin/...` inside the comms service.
 *
 *   GET|POST /content/admin/categories                content.category.manage (POST)
 *   GET|POST /content/admin/articles                  content.article.draft (POST)
 *   GET|PATCH      /content/admin/articles/:id
 *   POST           /content/admin/articles/:id/{publish,archive,restore}
 *   POST           /content/admin/articles/:id/legal-review    content.legal.manage (⚖ dual)
 *   GET            /content/admin/articles/:id/revisions
 *   POST           /content/admin/articles/:id/revert          content.revision.revert
 *   GET|POST       /content/admin/media                        content.media.upload (POST)
 *   GET|POST       /content/admin/banners                      content.banner.manage (POST)
 *   POST           /content/admin/banners/:id/status
 *
 * Every write records who did it on the row. Publishing and archiving additionally log at
 * WARN, because "when did our refund policy change and who changed it" is a question that
 * gets asked out loud, in front of a customer.
 */
import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, RequirePermission, Roles, requireDualControl } from '@ore/core';
import type { JwtPayload } from '@ore/core';
import { Role } from '@ore/contracts';
import { z } from 'zod';
import { ContentService } from './content.service';

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  kind: z.enum(['BLOG', 'HELP', 'LEGAL']).optional(),
  sortOrder: z.number().int().optional(),
});

const articleSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).optional(),
  bodyMarkdown: z.string().min(1),
  excerpt: z.string().max(500).nullable().optional(),
  kind: z.enum(['BLOG', 'HELP', 'LEGAL']).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).nullable().optional(),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
  ogImageUrl: z.string().max(500).nullable().optional(),
  indexable: z.boolean().optional(),
  changeNote: z.string().max(300).nullable().optional(),
});

const articlePatchSchema = articleSchema.partial();

const mediaSchema = z.object({
  url: z.string().min(1).max(500),
  originalName: z.string().min(1).max(200),
  contentType: z.string().max(80).nullable().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  widthPx: z.number().int().nullable().optional(),
  heightPx: z.number().int().nullable().optional(),
  altText: z.string().max(300).nullable().optional(),
  storageKey: z.string().max(300).nullable().optional(),
});

const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  body: z.string().max(1000).nullable().optional(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
  audience: z.enum(['ALL', 'CUSTOMERS', 'RIDERS', 'VENDORS']).optional(),
  city: z.string().max(80).nullable().optional(),
  linkUrl: z.string().max(500).nullable().optional(),
  dismissible: z.boolean().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().nullable().optional(),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED']).optional(),
});

@Controller('content/admin')
export class ContentAdminController {
  constructor(private readonly content: ContentService) {}

  /* ── categories ───────────────────────────────────────────────────── */

  @Get('categories')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.revision.read')
  categories() {
    return this.content.listCategories();
  }

  @Post('categories')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.category.manage')
  upsertCategory(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.content.upsertCategory(user, categorySchema.parse(body));
  }

  /* ── articles ─────────────────────────────────────────────────────── */

  @Get('articles')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.revision.read')
  articles(
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('categoryId') categoryId?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.content.listArticles({ status, kind, categoryId, q, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get('articles/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.revision.read')
  article(@Param('id') id: string) {
    return this.content.oneArticle(id);
  }

  @Post('articles')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.article.draft')
  create(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.content.createArticle(user, articleSchema.parse(body));
  }

  @Patch('articles/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.article.draft')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    return this.content.updateArticle(user, id, articlePatchSchema.parse(body));
  }

  @Post('articles/:id/publish')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.article.publish')
  publish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.content.publish(user, id);
  }

  @Post('articles/:id/archive')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.article.archive')
  archive(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.content.archive(user, id);
  }

  @Post('articles/:id/restore')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.article.draft')
  restore(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.content.restore(user, id);
  }

  /**
   * Clear the "draft — not legal advice" watermark on a legal page.
   *
   * `content.legal.manage` is a `D` permission: publishing terms and conditions in the
   * company's name is not a one-person decision, so the first call raises an approval and
   * changes nothing.
   */
  @Post('articles/:id/legal-review')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.legal.manage')
  legalReview(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { note?: string }) {
    const note = body?.note?.trim() || '';
    // Thrown, not returned: a controller that RETURNS an error shape answers 201 with an
    // error body, which reads as success to every caller and to the console.
    if (note.length < 5) throw new BadRequestException('A note of at least 5 characters is required to sign off a legal page');
    return requireDualControl(
      {
        kind: 'content.legal.review',
        permission: 'content.legal.manage',
        service: 'comms',
        resourceType: 'content_article',
        resourceId: id,
        reason: note,
        payload: { articleId: id, note },
        makerUserId: user.sub,
        makerAdminRole: user.adminRole ?? null,
        forceApprovals: 2,
        forceRequiresSuper: true,
      },
      user.sub,
      () => this.content.markLegalReviewed(user, id),
    );
  }

  /* ── revisions ────────────────────────────────────────────────────── */

  @Get('articles/:id/revisions')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.revision.read')
  revisions(@Param('id') id: string) {
    return this.content.listRevisions(id);
  }

  @Post('articles/:id/revert')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.revision.revert')
  revert(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { revision?: number }) {
    if (!Number.isInteger(body?.revision)) throw new BadRequestException('revision must be an integer');
    return this.content.revert(user, id, body.revision as number);
  }

  /* ── media ────────────────────────────────────────────────────────── */

  @Get('media')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.revision.read')
  media(@Query('limit') limit?: string) {
    return this.content.listMedia(limit ? parseInt(limit, 10) : 50);
  }

  @Post('media')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.media.upload')
  upload(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.content.registerMedia(user, mediaSchema.parse(body));
  }

  /* ── banners ──────────────────────────────────────────────────────── */

  @Get('banners')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.banner.manage')
  banners(@Query('status') status?: string) {
    return this.content.listBanners(status);
  }

  @Post('banners')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.banner.manage')
  upsertBanner(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.content.upsertBanner(user, bannerSchema.parse(body));
  }

  @Post('banners/:id/status')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('content.banner.manage')
  bannerStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { status?: string }) {
    const status = body?.status?.toUpperCase();
    if (!['SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED'].includes(status ?? '')) {
      throw new BadRequestException('status must be SCHEDULED, ACTIVE, PAUSED or ENDED');
    }
    return this.content.setBannerStatus(user, id, status as 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED');
  }
}
