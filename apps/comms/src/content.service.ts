import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import type { JwtPayload } from '@ore/core';
import { ContentArticle } from './entities/content-article.entity';
import { ContentBanner } from './entities/content-banner.entity';
import { ContentCategory } from './entities/content-category.entity';
import { ContentMedia } from './entities/content-media.entity';
import { ContentRevision } from './entities/content-revision.entity';

/**
 * The CMS: blog, help centre, legal pages, media and banners.
 *
 * WHY THIS EXISTS
 * The support AI is forbidden from inventing policy. That is correct — a hallucinated refund
 * window is a promise the company did not make. But with no written policy anywhere, the
 * correct behaviour looked like a broken product: every "what is your refund policy?" was
 * met with a refusal. This service is the missing half. Brand writes the policy once, here,
 * and `searchHelp()` is what the AI reads before it answers.
 *
 * TWO RULES SHAPE IT
 * 1. **Only PUBLISHED content is ever returned to a customer or to the AI.** A draft is
 *    invisible outside the admin API. This is what makes "unpublish it and the AI stops
 *    saying it" true without any cache to chase.
 * 2. **Every edit writes a revision.** The article row holds the current text; the revision
 *    table holds all of it. A revert appends, it never deletes.
 */

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export interface HelpHit {
  id: string;
  title: string;
  slug: string;
  kind: ContentArticle['kind'];
  excerpt: string;
  /** The matching passage, trimmed to a window around the match, for the model to quote. */
  passage: string;
  revision: number;
  publishedAt: string | null;
  /** What the AI must tell the customer this came from. */
  citation: string;
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectRepository(ContentArticle) private readonly articles: Repository<ContentArticle>,
    @InjectRepository(ContentRevision) private readonly revisions: Repository<ContentRevision>,
    @InjectRepository(ContentCategory) private readonly categories: Repository<ContentCategory>,
    @InjectRepository(ContentMedia) private readonly media: Repository<ContentMedia>,
    @InjectRepository(ContentBanner) private readonly banners: Repository<ContentBanner>,
  ) {}

  /* ─────────────────────────── categories ──────────────────────────── */

  async listCategories(): Promise<ContentCategory[]> {
    return this.categories.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async upsertCategory(
    actor: JwtPayload,
    input: { id?: string; name: string; slug?: string; description?: string | null; kind?: 'BLOG' | 'HELP' | 'LEGAL'; sortOrder?: number },
  ): Promise<ContentCategory> {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('name is required');
    const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(name)) || null;
    if (!slug) throw new BadRequestException('could not derive a slug from that name');

    const clash = await this.categories.findOne({ where: { slug } });
    const existing = input.id ? await this.categories.findOne({ where: { id: input.id } }) : null;
    if (clash && clash.id !== existing?.id) throw new ConflictException(`A category already uses /${slug}`);

    const row = existing ?? this.categories.create({});
    row.name = name;
    row.slug = slug;
    row.description = input.description?.trim() || null;
    row.kind = input.kind ?? row.kind ?? 'BLOG';
    row.sortOrder = input.sortOrder ?? row.sortOrder ?? 0;
    if (!existing) row.createdBy = actor.sub;
    return this.categories.save(row);
  }

  /* ──────────────────────────── articles ───────────────────────────── */

  /**
   * Admin listing. Sees DRAFT and ARCHIVED as well — this is the editor's own index.
   * `q` matches title, slug, excerpt and body, so "find the refund article" works from a
   * half-remembered phrase.
   */
  async listArticles(opts: {
    status?: string;
    kind?: string;
    categoryId?: string;
    q?: string;
    limit?: number;
  }): Promise<{ articles: ContentArticle[]; total: number }> {
    const qb = this.articles.createQueryBuilder('a');
    if (opts.status) qb.andWhere('a.status = :status', { status: opts.status.toUpperCase() });
    if (opts.kind) qb.andWhere('a.kind = :kind', { kind: opts.kind.toUpperCase() });
    if (opts.categoryId) qb.andWhere('a.categoryId = :categoryId', { categoryId: opts.categoryId });
    if (opts.q) {
      const like = `%${opts.q.trim()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('a.title LIKE :like', { like })
            .orWhere('a.slug LIKE :like', { like })
            .orWhere('a.excerpt LIKE :like', { like })
            .orWhere('a.bodyMarkdown LIKE :like', { like })
            .orWhere('a.tagsText LIKE :like', { like });
        }),
      );
    }
    qb.orderBy('a.updatedAt', 'DESC').take(Math.min(200, opts.limit ?? 50));
    const [rows, total] = await qb.getManyAndCount();
    return { articles: rows, total };
  }

  async oneArticle(idOrSlug: string): Promise<ContentArticle> {
    const row = await this.articles.findOne({ where: [{ id: idOrSlug }, { slug: idOrSlug }] });
    if (!row) throw new NotFoundException(`No article ${idOrSlug}`);
    return row;
  }

  /** Public read. PUBLISHED only — a draft must never reach a customer or a crawler. */
  async publishedArticle(idOrSlug: string): Promise<ContentArticle> {
    const row = await this.oneArticle(idOrSlug);
    if (row.status !== 'PUBLISHED') throw new NotFoundException(`No published article ${idOrSlug}`);
    return row;
  }

  /** Public listing: published only, newest first. */
  async listPublished(opts: { kind?: string; categoryId?: string; tag?: string; limit?: number }): Promise<ContentArticle[]> {
    const qb = this.articles
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 'PUBLISHED' });
    if (opts.kind) qb.andWhere('a.kind = :kind', { kind: opts.kind.toUpperCase() });
    if (opts.categoryId) qb.andWhere('a.categoryId = :categoryId', { categoryId: opts.categoryId });
    if (opts.tag) qb.andWhere('a.tagsText LIKE :tag', { tag: `%${opts.tag.trim()}%` });
    qb.orderBy('a.publishedAt', 'DESC').take(Math.min(100, opts.limit ?? 20));
    return qb.getMany();
  }

  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    let candidate = base;
    for (let i = 2; i < 200; i += 1) {
      const clash = await this.articles.findOne({ where: { slug: candidate } });
      if (!clash || clash.id === ignoreId) return candidate;
      candidate = `${base}-${i}`;
    }
    throw new ConflictException('Could not derive a unique slug — set one explicitly');
  }

  /** Create a draft. Nothing is visible to customers until it is published. */
  async createArticle(
    actor: JwtPayload,
    input: {
      title: string;
      slug?: string;
      bodyMarkdown: string;
      excerpt?: string | null;
      kind?: 'BLOG' | 'HELP' | 'LEGAL';
      categoryId?: string | null;
      tags?: string[] | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      ogImageUrl?: string | null;
      indexable?: boolean;
      changeNote?: string | null;
    },
  ): Promise<ContentArticle> {
    const title = input.title?.trim();
    if (!title) throw new BadRequestException('title is required');
    if (!input.bodyMarkdown?.trim()) throw new BadRequestException('bodyMarkdown is required');
    const kind = input.kind ?? 'BLOG';
    if (input.categoryId && !(await this.categories.findOne({ where: { id: input.categoryId } }))) {
      throw new BadRequestException('Unknown category');
    }

    const base = input.slug?.trim() ? slugify(input.slug) : slugify(title);
    if (!base) throw new BadRequestException('could not derive a slug from that title');

    const row = await this.articles.save(
      this.articles.create({
        title,
        slug: await this.uniqueSlug(base),
        bodyMarkdown: input.bodyMarkdown,
        excerpt: input.excerpt?.trim() || null,
        kind,
        status: 'DRAFT',
        categoryId: input.categoryId ?? null,
        tagsText: (input.tags ?? []).join(' ') || null,
        seoTitle: input.seoTitle?.trim() || null,
        seoDescription: input.seoDescription?.trim() || null,
        ogImageUrl: input.ogImageUrl?.trim() || null,
        indexable: input.indexable ?? true,
        // A legal page starts unreviewed whatever anyone typed. Clearing that flag is a
        // separate, dual-controlled action — drafting a legal page must not publish one.
        legalReviewed: false,
        authorId: actor.sub,
        lastEditedBy: actor.sub,
        revisionCount: 1,
      }),
    );
    await this.writeRevision(row, actor, input.changeNote ?? 'created', null);
    this.logger.log(`${kind} draft "${row.title}" (${row.slug}) created by ${actor.sub}`);
    return row;
  }

  /** Edit. Always writes a revision, always bumps revisionCount. */
  async updateArticle(
    actor: JwtPayload,
    idOrSlug: string,
    input: {
      title?: string;
      slug?: string;
      bodyMarkdown?: string;
      excerpt?: string | null;
      categoryId?: string | null;
      tags?: string[] | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      ogImageUrl?: string | null;
      indexable?: boolean;
      changeNote?: string | null;
    },
  ): Promise<ContentArticle> {
    const row = await this.oneArticle(idOrSlug);
    if (input.categoryId && !(await this.categories.findOne({ where: { id: input.categoryId } }))) {
      throw new BadRequestException('Unknown category');
    }

    const bodyChanged = input.bodyMarkdown !== undefined && input.bodyMarkdown !== row.bodyMarkdown;
    const titleChanged = input.title !== undefined && input.title.trim() !== row.title;

    if (input.title?.trim()) row.title = input.title.trim();
    if (input.slug?.trim()) {
      const want = slugify(input.slug);
      if (want && want !== row.slug) row.slug = await this.uniqueSlug(want, row.id);
    }
    if (input.bodyMarkdown !== undefined) {
      if (!input.bodyMarkdown.trim()) throw new BadRequestException('bodyMarkdown cannot be empty');
      row.bodyMarkdown = input.bodyMarkdown;
    }
    if (input.excerpt !== undefined) row.excerpt = input.excerpt?.trim() || null;
    if (input.categoryId !== undefined) row.categoryId = input.categoryId ?? null;
    if (input.tags !== undefined) row.tagsText = (input.tags ?? []).join(' ') || null;
    if (input.seoTitle !== undefined) row.seoTitle = input.seoTitle?.trim() || null;
    if (input.seoDescription !== undefined) row.seoDescription = input.seoDescription?.trim() || null;
    if (input.ogImageUrl !== undefined) row.ogImageUrl = input.ogImageUrl?.trim() || null;
    if (input.indexable !== undefined) row.indexable = input.indexable;
    row.lastEditedBy = actor.sub;

    if (bodyChanged || titleChanged) {
      row.revisionCount += 1;
      await this.articles.save(row);
      await this.writeRevision(row, actor, input.changeNote ?? null, null);
    } else {
      await this.articles.save(row);
    }
    return row;
  }

  /**
   * Publish. An unreviewed LEGAL page is published with the watermark still on — the page
   * exists, and says loudly that nobody has signed it off.
   */
  async publish(actor: JwtPayload, idOrSlug: string): Promise<ContentArticle> {
    const row = await this.oneArticle(idOrSlug);
    if (row.status === 'PUBLISHED') return row;
    if (row.status === 'ARCHIVED') throw new ConflictException('Archived content cannot be republished directly — restore it first');
    if (!row.bodyMarkdown?.trim()) throw new BadRequestException('Cannot publish an empty article');
    row.status = 'PUBLISHED';
    row.publishedAt = row.publishedAt ?? new Date();
    row.lastEditedBy = actor.sub;
    const saved = await this.articles.save(row);
    this.logger.warn(`${row.kind} "${row.title}" PUBLISHED by ${actor.sub}${row.kind === 'LEGAL' && !row.legalReviewed ? ' (UNREVIEWED — watermark on)' : ''}`);
    return saved;
  }

  /**
   * Unpublish. This is the kill switch for something the AI is saying that it should not:
   * the moment an article leaves PUBLISHED it disappears from every public and AI read.
   */
  async archive(actor: JwtPayload, idOrSlug: string): Promise<ContentArticle> {
    const row = await this.oneArticle(idOrSlug);
    row.status = 'ARCHIVED';
    row.archivedAt = new Date();
    row.lastEditedBy = actor.sub;
    const saved = await this.articles.save(row);
    this.logger.warn(`${row.kind} "${row.title}" ARCHIVED by ${actor.sub}`);
    return saved;
  }

  async restore(actor: JwtPayload, idOrSlug: string): Promise<ContentArticle> {
    const row = await this.oneArticle(idOrSlug);
    if (row.status !== 'ARCHIVED') throw new ConflictException(`Only ARCHIVED content can be restored (this is ${row.status})`);
    row.status = 'DRAFT';
    row.archivedAt = null;
    row.lastEditedBy = actor.sub;
    return this.articles.save(row);
  }

  /** Clear the "not legal advice" watermark. Called only through the dual-controlled route. */
  async markLegalReviewed(actor: JwtPayload, idOrSlug: string): Promise<ContentArticle> {
    const row = await this.oneArticle(idOrSlug);
    if (row.kind !== 'LEGAL') throw new BadRequestException('Only a LEGAL page can be marked reviewed');
    row.legalReviewed = true;
    row.lastEditedBy = actor.sub;
    this.logger.warn(`LEGAL "${row.title}" marked reviewed by ${actor.sub}`);
    return this.articles.save(row);
  }

  /* ─────────────────────────── revisions ───────────────────────────── */

  private async writeRevision(
    article: ContentArticle,
    actor: JwtPayload,
    changeNote: string | null,
    revertedFrom: number | null,
  ): Promise<ContentRevision> {
    return this.revisions.save(
      this.revisions.create({
        articleId: article.id,
        revision: article.revisionCount,
        bodyMarkdown: article.bodyMarkdown,
        title: article.title,
        excerpt: article.excerpt,
        changeNote: changeNote?.trim() || null,
        editedBy: actor.sub,
        revertedFrom,
      }),
    );
  }

  async listRevisions(articleIdOrSlug: string): Promise<ContentRevision[]> {
    const article = await this.oneArticle(articleIdOrSlug);
    return this.revisions.find({ where: { articleId: article.id }, order: { revision: 'DESC' } });
  }

  async oneRevision(articleIdOrSlug: string, revision: number): Promise<ContentRevision> {
    const article = await this.oneArticle(articleIdOrSlug);
    const row = await this.revisions.findOne({ where: { articleId: article.id, revision } });
    if (!row) throw new NotFoundException(`No revision ${revision} of ${article.slug}`);
    return row;
  }

  /**
   * Revert to an earlier revision.
   *
   * Appends a new revision carrying the old body; it does not delete anything and does not
   * renumber. `revertedFrom` records which version was restored, so the history reads as a
   * sequence of decisions rather than looking like the intervening edits never happened.
   */
  async revert(actor: JwtPayload, articleIdOrSlug: string, revision: number): Promise<ContentArticle> {
    const article = await this.oneArticle(articleIdOrSlug);
    const target = await this.oneRevision(articleIdOrSlug, revision);
    if (target.revision === article.revisionCount) {
      throw new ConflictException(`Revision ${revision} is already the current version`);
    }
    article.bodyMarkdown = target.bodyMarkdown;
    if (target.title) article.title = target.title;
    article.excerpt = target.excerpt;
    article.revisionCount += 1;
    article.lastEditedBy = actor.sub;
    const saved = await this.articles.save(article);
    await this.writeRevision(saved, actor, `reverted to revision ${revision}`, revision);
    this.logger.warn(`"${saved.title}" reverted to r${revision} by ${actor.sub} (now r${saved.revisionCount})`);
    return saved;
  }

  /* ─────────────────── T7.5 the AI's help-centre search ─────────────── */

  /**
   * Search PUBLISHED help content. This is the tool the support AI calls before it answers
   * a policy question, and the reason it can quote our actual refund window instead of
   * either inventing one or refusing.
   *
   * Read-only by construction: it has no write path and returns only published rows. A
   * DRAFT is invisible here, which is what makes "unpublish it and the AI stops saying it"
   * true with no cache to invalidate.
   *
   * The search is a substring match, deliberately. A help centre is tens of articles; the
   * failure mode worth engineering against is the model quoting the wrong policy, and the
   * defence against that is returning the passage it matched plus a citation, not a cleverer
   * ranking.
   */
  async searchHelp(query: string, limit = 5): Promise<HelpHit[]> {
    const q = (query ?? '').trim();
    if (q.length < 2) return [];

    // Split the query into terms and require the title or body to contain one of them,
    // so "how do refunds work" still finds an article titled "Refund policy".
    const terms = [...new Set(q.toLowerCase().split(/\s+/).filter((t) => t.length > 2))].slice(0, 6);
    if (!terms.length) return [];

    const rows = await this.articles
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 'PUBLISHED' })
      .andWhere('a.kind IN (:...kinds)', { kinds: ['HELP', 'LEGAL'] })
      .andWhere(
        new Brackets((w) => {
          terms.forEach((t, i) => {
            const param = `t${i}`;
            const or = i === 0 ? 'where' : 'orWhere';
            w[or](`LOWER(a.title) LIKE :${param}`, { [param]: `%${t}%` })
              [or](`LOWER(a.bodyMarkdown) LIKE :${param}b`, { [`${param}b`]: `%${t}%` });
          });
        }),
      )
      .orderBy('a.publishedAt', 'DESC')
      .take(Math.min(10, limit))
      .getMany();

    const hits: HelpHit[] = [];
    for (const row of rows) {
      const body = row.bodyMarkdown ?? '';
      const lower = body.toLowerCase();
      // Find the first term that actually appears in the body and quote around it. Falling
      // back to the excerpt keeps the answer useful when only the title matched.
      let at = -1;
      for (const t of terms) {
        at = lower.indexOf(t);
        if (at >= 0) break;
      }
      const passage =
        at >= 0
          ? body.slice(Math.max(0, at - 160), at + 500).trim()
          : (row.excerpt ?? body.slice(0, 400)).trim();
      hits.push({
        id: row.id,
        title: row.title,
        slug: row.slug,
        kind: row.kind,
        excerpt: row.excerpt ?? '',
        passage,
        revision: row.revisionCount,
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        citation: `/help/${row.slug} (revision ${row.revisionCount})`,
      });
    }
    return hits;
  }

  /* ───────────────────────────── media ─────────────────────────────── */

  async listMedia(limit = 50): Promise<ContentMedia[]> {
    return this.media.find({ order: { createdAt: 'DESC' }, take: Math.min(200, limit) });
  }

  /**
   * Register an upload.
   *
   * The bytes are stored by `libs/storage` (R2 in production, local disk in dev); this row
   * is the catalogue entry the editor lists. Content type is checked because an <img> tag
   * pointing at something executable is a stored-XSS vector, and the check belongs here
   * rather than trusting whatever the browser sent.
   */
  async registerMedia(
    actor: JwtPayload,
    input: { url: string; originalName: string; contentType?: string | null; sizeBytes?: number; widthPx?: number | null; heightPx?: number | null; altText?: string | null; storageKey?: string | null },
  ): Promise<ContentMedia> {
    if (!input.url?.trim()) throw new BadRequestException('url is required');
    if (!input.originalName?.trim()) throw new BadRequestException('originalName is required');
    const ct = input.contentType ?? null;
    if (ct && !/^(image\/(png|jpe?g|gif|webp|svg\+xml)|application\/pdf)$/.test(ct)) {
      throw new BadRequestException(`Refusing content type ${ct} — images and PDF only`);
    }
    const MAX_BYTES = 8 * 1024 * 1024;
    if ((input.sizeBytes ?? 0) > MAX_BYTES) throw new BadRequestException('Uploads are limited to 8 MB');
    return this.media.save(
      this.media.create({
        url: input.url.trim(),
        originalName: input.originalName.trim(),
        contentType: ct,
        sizeBytes: input.sizeBytes ?? 0,
        widthPx: input.widthPx ?? null,
        heightPx: input.heightPx ?? null,
        altText: input.altText?.trim() || null,
        storageKey: input.storageKey?.trim() || null,
        uploadedBy: actor.sub,
      }),
    );
  }

  /* ──────────────────────────── banners ────────────────────────────── */

  async listBanners(status?: string): Promise<ContentBanner[]> {
    const where = status ? { status: status.toUpperCase() as ContentBanner['status'] } : {};
    return this.banners.find({ where, order: { startsAt: 'DESC' } });
  }

  /**
   * Banners currently live for a given viewer.
   *
   * The window is evaluated here, at read time, so a banner expires when its `endsAt`
   * passes rather than when some job notices. `status` is still honoured, because PAUSED is
   * a human decision that must override the clock.
   */
  async activeBanners(viewer: { role?: string; city?: string | null }): Promise<ContentBanner[]> {
    const now = new Date();
    const rows = await this.banners.find({ order: { startsAt: 'DESC' } });
    const audienceFor = (role?: string): ContentBanner['audience'][] => {
      const r = (role ?? '').toUpperCase();
      if (r === 'RIDER') return ['ALL', 'RIDERS'];
      if (r === 'VENDOR') return ['ALL', 'VENDORS'];
      if (r === 'CUSTOMER') return ['ALL', 'CUSTOMERS'];
      return ['ALL'];
    };
    const ok = audienceFor(viewer.role);
    return rows.filter((b) => {
      if (b.status === 'PAUSED' || b.status === 'ENDED') return false;
      if (b.startsAt && b.startsAt.getTime() > now.getTime()) return false;
      if (b.endsAt && b.endsAt.getTime() < now.getTime()) return false;
      if (!ok.includes(b.audience)) return false;
      if (b.city && (viewer.city ?? '').trim().toLowerCase() !== b.city.trim().toLowerCase()) return false;
      return true;
    });
  }

  async upsertBanner(
    actor: JwtPayload,
    input: {
      id?: string;
      title: string;
      body?: string | null;
      severity?: 'INFO' | 'WARNING' | 'CRITICAL';
      audience?: 'ALL' | 'CUSTOMERS' | 'RIDERS' | 'VENDORS';
      city?: string | null;
      linkUrl?: string | null;
      dismissible?: boolean;
      startsAt: string;
      endsAt?: string | null;
      status?: 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED';
    },
  ): Promise<ContentBanner> {
    if (!input.title?.trim()) throw new BadRequestException('title is required');
    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('startsAt is not a valid date');
    let endsAt: Date | null = null;
    if (input.endsAt) {
      endsAt = new Date(input.endsAt);
      if (Number.isNaN(endsAt.getTime())) throw new BadRequestException('endsAt is not a valid date');
      if (endsAt.getTime() <= startsAt.getTime()) throw new BadRequestException('endsAt must be after startsAt');
    }

    const existing = input.id ? await this.banners.findOne({ where: { id: input.id } }) : null;
    if (input.id && !existing) throw new NotFoundException(`No banner ${input.id}`);
    const row = existing ?? this.banners.create({});
    row.title = input.title.trim();
    row.body = input.body?.trim() || null;
    row.severity = input.severity ?? row.severity ?? 'INFO';
    row.audience = input.audience ?? row.audience ?? 'ALL';
    row.city = input.city?.trim() || null;
    row.linkUrl = input.linkUrl?.trim() || null;
    row.dismissible = input.dismissible ?? row.dismissible ?? true;
    row.startsAt = startsAt;
    row.endsAt = endsAt;
    row.status = input.status ?? row.status ?? 'SCHEDULED';
    if (!existing) row.createdBy = actor.sub;
    return this.banners.save(row);
  }

  async setBannerStatus(actor: JwtPayload, id: string, status: 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED'): Promise<ContentBanner> {
    const row = await this.banners.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`No banner ${id}`);
    row.status = status;
    this.logger.log(`banner "${row.title}" -> ${status} by ${actor.sub}`);
    return this.banners.save(row);
  }

  /* ───────────────────────── seeding ───────────────────────────────── */

  /** Seed the categories the console's navigation assumes exist. Idempotent on slug. */
  async ensureSeeded(): Promise<void> {
    const defaults: { name: string; slug: string; kind: 'BLOG' | 'HELP' | 'LEGAL'; description: string }[] = [
      { name: 'Help Centre', slug: 'help', kind: 'HELP', description: 'Customer-facing how-to and policy articles the support AI may quote.' },
      { name: 'Blog', slug: 'blog', kind: 'BLOG', description: 'Marketing and brand posts.' },
      { name: 'Legal', slug: 'legal', kind: 'LEGAL', description: 'Terms, privacy and refund policy. Unreviewed pages carry a not-legal-advice watermark.' },
    ];
    for (const d of defaults) {
      const existing = await this.categories.findOne({ where: { slug: d.slug } });
      if (existing) continue;
      try {
        await this.categories.save(
          this.categories.create({ name: d.name, slug: d.slug, kind: d.kind, description: d.description, sortOrder: 0 }),
        );
      } catch (err) {
        if (!/UNIQUE|duplicate key/i.test((err as Error).message)) throw err;
      }
    }
  }
}
