import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The CMS tables: articles, revisions, categories, media, banners.
 *
 * `UNIQUE("slug")` on `content_article` is the constraint that matters most: the slug is the
 * URL, so two articles claiming one would mean the same address serving two different
 * policies depending on which row the query happened to hit first. Publishing must fail
 * loudly instead.
 *
 * `UNIQUE("articleId","revision")` makes concurrent edits unable to both claim revision 4,
 * which is what keeps the revision history a sequence rather than a pile.
 */
export class AddContent1788700000000 implements MigrationInterface {
  name = 'AddContent1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    // sqlite spells it `datetime`; Postgres has no such type and fails the whole migration.
    // Matches what the entities declare (`@CreateDateColumn` / `Date` → `timestamp`).
    const tsType = isSqlite ? 'datetime' : 'timestamp';
    // Unqualified DDL lands in `public`, not the service's schema — TypeORM's `schema` option
    // does not apply to raw queries. That silently broke schema-per-service and made the
    // `hasTable` probes below (which look in this schema) always false, so the migration was
    // never actually idempotent either. sqlite has no schemas, so the two dialects differ.
    const q = (t: string) => (isSqlite ? `"${t}"` : `"comms"."${t}"`);
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "comms"`);

    const hasTable = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
          : `SELECT table_name FROM information_schema.tables WHERE table_schema='comms' AND table_name='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };
    const hasIndex = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='index' AND name='${name}'`
          : `SELECT indexname FROM pg_indexes WHERE schemaname='comms' AND indexname='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };

    if (!(await hasTable('content_category'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('content_category')} (
          "id" varchar PRIMARY KEY,
          "name" varchar NOT NULL,
          "slug" varchar NOT NULL,
          "description" text,
          "kind" varchar NOT NULL DEFAULT 'BLOG',
          "sortOrder" integer NOT NULL DEFAULT 0,
          "createdBy" varchar,
          "createdAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await hasTable('content_article'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('content_article')} (
          "id" varchar PRIMARY KEY,
          "title" varchar NOT NULL,
          "slug" varchar NOT NULL,
          "bodyMarkdown" text NOT NULL,
          "excerpt" text,
          "kind" varchar NOT NULL DEFAULT 'BLOG',
          "status" varchar NOT NULL DEFAULT 'DRAFT',
          "categoryId" varchar,
          "tagsText" text,
          "seoTitle" varchar,
          "seoDescription" text,
          "ogImageUrl" varchar,
          "indexable" boolean NOT NULL DEFAULT 1,
          "legalReviewed" boolean NOT NULL DEFAULT 0,
          "authorId" varchar,
          "lastEditedBy" varchar,
          "revisionCount" integer NOT NULL DEFAULT 1,
          "publishedAt" ${tsType},
          "archivedAt" ${tsType},
          "createdAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await hasTable('content_revision'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('content_revision')} (
          "id" varchar PRIMARY KEY,
          "articleId" varchar NOT NULL,
          "revision" integer NOT NULL,
          "bodyMarkdown" text NOT NULL,
          "title" varchar,
          "excerpt" text,
          "changeNote" varchar,
          "editedBy" varchar,
          "revertedFrom" integer,
          "createdAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await hasTable('content_media'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('content_media')} (
          "id" varchar PRIMARY KEY,
          "url" varchar NOT NULL,
          "originalName" varchar NOT NULL,
          "contentType" varchar,
          "sizeBytes" integer NOT NULL DEFAULT 0,
          "widthPx" integer,
          "heightPx" integer,
          "altText" varchar,
          "uploadedBy" varchar,
          "storageKey" varchar,
          "createdAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await hasTable('content_banner'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('content_banner')} (
          "id" varchar PRIMARY KEY,
          "title" varchar NOT NULL,
          "body" text,
          "severity" varchar NOT NULL DEFAULT 'INFO',
          "audience" varchar NOT NULL DEFAULT 'ALL',
          "city" varchar,
          "linkUrl" varchar,
          "status" varchar NOT NULL DEFAULT 'SCHEDULED',
          "dismissible" boolean NOT NULL DEFAULT 1,
          "startsAt" ${tsType} NOT NULL,
          "endsAt" ${tsType},
          "createdBy" varchar,
          "createdAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await hasIndex('UQ_content_category_slug'))) {
      await queryRunner.query(`CREATE UNIQUE INDEX "UQ_content_category_slug" ON ${q('content_category')} ("slug")`);
    }
    if (!(await hasIndex('UQ_content_article_slug'))) {
      await queryRunner.query(`CREATE UNIQUE INDEX "UQ_content_article_slug" ON ${q('content_article')} ("slug")`);
    }
    if (!(await hasIndex('IDX_content_article_status_kind_published'))) {
      await queryRunner.query(`CREATE INDEX "IDX_content_article_status_kind_published" ON ${q('content_article')} ("status", "kind", "publishedAt")`);
    }
    if (!(await hasIndex('IDX_content_revision_article_revision'))) {
      await queryRunner.query(`CREATE UNIQUE INDEX "IDX_content_revision_article_revision" ON ${q('content_revision')} ("articleId", "revision")`);
    }
    if (!(await hasIndex('IDX_content_media_uploaded_by_created'))) {
      await queryRunner.query(`CREATE INDEX "IDX_content_media_uploaded_by_created" ON ${q('content_media')} ("uploadedBy", "createdAt")`);
    }
    if (!(await hasIndex('IDX_content_banner_status_window'))) {
      await queryRunner.query(`CREATE INDEX "IDX_content_banner_status_window" ON ${q('content_banner')} ("status", "startsAt", "endsAt")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    const driver = queryRunner.connection.options.type;

    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';

    const q = (t: string) => (isSqlite ? `"${t}"` : `"comms"."${t}"`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('content_banner')}`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('content_media')}`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('content_revision')}`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('content_article')}`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('content_category')}`);
  }
}
