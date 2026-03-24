# Database Guidelines

> How the database layer is structured in JadeAI.

---

## Overview

JadeAI uses Drizzle ORM with two database backends:

- **SQLite** (development default) — schema in `src/lib/db/schema.ts`
- **PostgreSQL** (production) — schema in `src/lib/db/pg-schema.ts`

Both share the same repository interface in `src/lib/db/repositories/`.

---

## Schema Files

| File | Purpose |
|------|---------|
| `src/lib/db/schema.ts` | SQLite schema (dev) |
| `src/lib/db/pg-schema.ts` | PostgreSQL schema (prod) |
| `src/lib/db/index.ts` | DB client singleton and initialization |

Both schemas define the same tables (users, resumes, resume_sections,
chat_sessions, chat_messages, resume_shares, jd_analyses, grammar_checks) but
with dialect-specific column types.

---

## Drizzle Config

```typescript
// drizzle.config.ts — SQLite
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.SQLITE_PATH || './data/jade.db',
  },
});

// drizzle-pg.config.ts — PostgreSQL
export default defineConfig({
  schema: './src/lib/db/pg-schema.ts',
  out: './drizzle/pg-migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Run migrations with `pnpm drizzle-kit push` or generate migration files with
`pnpm drizzle-kit generate`.

---

## Table Overview

### users

```typescript
// src/lib/db/schema.ts (SQLite)
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  fingerprint: text('fingerprint').unique(),
  authType: text('auth_type', { enum: ['oauth', 'fingerprint'] }).notNull(),
  settings: text('settings', { mode: 'json' }).default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
```

### resumes

```typescript
export const resumes = sqliteTable('resumes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull().default('未命名简历'),
  template: text('template').notNull().default('classic'),
  themeConfig: text('theme_config', { mode: 'json' }).default('{}'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  language: text('language').notNull().default('zh'),
  shareToken: text('share_token'),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  sharePassword: text('share_password'),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
```

### resumeSections

```typescript
export const resumeSections = sqliteTable('resume_sections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  resumeId: text('resume_id').notNull().references(() => resumes.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),            // 'personal_info' | 'summary' | 'work_experience' | ...
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
  content: text('content', { mode: 'json' }).notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
```

### Other tables

- `authAccounts` — OAuth account linkage
- `chatSessions` / `chatMessages` — AI chat history per resume
- `resumeShares` — per-share-token metadata (password, label, view count)
- `jdAnalyses` — JD match analysis results
- `grammarChecks` — grammar check history

---

## Repository Pattern

All data access goes through repository objects in `src/lib/db/repositories/`.
Repositories are plain objects (not classes) with async methods.

```
src/lib/db/repositories/
├── resume.repository.ts      # findById, findAllByUserId, create, update, delete, duplicate, ...
├── user.repository.ts        # findById, findByEmail, findByFingerprint, upsertByFingerprint, create
├── chat.repository.ts        # session and message CRUD
├── analysis.repository.ts    # JD analysis and grammar check history
└── share.repository.ts       # resume share management
```

Example — `src/lib/db/repositories/resume.repository.ts`:

```typescript
export const resumeRepository = {
  async findAllByUserId(userId: string) {
    return db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.updatedAt));
  },

  async findById(id: string) {
    const resume = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
    if (!resume[0]) return null;
    const sections = await db.select().from(resumeSections)
      .where(eq(resumeSections.resumeId, id))
      .orderBy(resumeSections.sortOrder);
    return { ...resume[0], sections };
  },

  async create(data: { userId: string; title?: string; template?: string; language?: string }) {
    const id = crypto.randomUUID();
    await db.insert(resumes).values({
      id,
      userId: data.userId,
      title: data.title || '未命名简历',
      template: data.template || 'classic',
      language: data.language || 'zh',
    });
    return this.findById(id);
  },

  async update(id: string, data: Partial<{ title: string; template: string; themeConfig: unknown; language: string }>) {
    await db.update(resumes).set({ ...data, updatedAt: new Date() } as any).where(eq(resumes.id, id));
    return this.findById(id);
  },
  // ...
};
```

---

## Migrations

### SQLite migrations

Location: `drizzle/migrations/`
Generated by: `pnpm drizzle-kit generate`
Applied by: `pnpm drizzle-kit push` or `pnpm drizzle-kit migrate`

Each migration file is a numbered SQL file:
- `0000_fast_king_cobra.sql`
- `0001_nifty_logan.sql`
- ...

The `_journal.json` file tracks migration history.

### PostgreSQL migrations

Location: `drizzle/pg-migrations/`
Same naming convention as SQLite.

### Creating a new table (example)

1. Add the table definition to both `src/lib/db/schema.ts` (SQLite) and
   `src/lib/db/pg-schema.ts` (PostgreSQL).
2. Run `pnpm drizzle-kit generate` to create a new migration file.
3. Review the generated SQL in `drizzle/migrations/` (or `drizzle/pg-migrations/`).
4. Run `pnpm drizzle-kit push` to apply to the local database.

For PostgreSQL production, the generated SQL must be run against the production
database manually or via a CI pipeline.

---

## Query Patterns

### Basic select

```typescript
const result = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
```

### Select with join

Sections are always fetched separately after the parent resume:

```typescript
const resume = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
if (!resume[0]) return null;
const sections = await db.select().from(resumeSections)
  .where(eq(resumeSections.resumeId, id))
  .orderBy(resumeSections.sortOrder);
return { ...resume[0], sections };
```

### JSON columns

Drizzle serializes/deserializes JSON automatically when the column is defined
with `{ mode: 'json' }`:

```typescript
settings: text('settings', { mode: 'json' }).default('{}'),
```

Access it as a normal object in TypeScript.

### Timestamp handling

SQLite stores timestamps as Unix epoch integers. Use `{ mode: 'timestamp' }` to
have Drizzle return JavaScript `Date` objects:

```typescript
createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
```

---

## Common Mistakes

- Editing migration SQL files manually after they are generated (regenerate instead)
- Using `db.select()` without a `.where()` clause on large tables (performance)
- Forgetting that `findById` returns an array (check `.limit(1)` and `[0]`)
- Mixing SQLite and PostgreSQL schema definitions when adding columns (always update both)
- Using `$defaultFn` with `crypto.randomUUID()` in PostgreSQL mode — verify it works with your PG version
