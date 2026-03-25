import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../index';
import { resumes, resumeSections } from '../schema';

function normalizeOptionalText(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

type ResumeMutation = Partial<{
  title: string;
  template: string;
  themeConfig: unknown;
  language: string;
  targetJobTitle: string | null;
  targetCompany: string | null;
}>;

export const resumeRepository = {
  async findAllByUserId(userId: string) {
    return db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.updatedAt));
  },

  async findById(id: string) {
    const resume = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
    if (!resume[0]) return null;
    const sections = await db.select().from(resumeSections).where(eq(resumeSections.resumeId, id)).orderBy(resumeSections.sortOrder);
    return { ...resume[0], sections };
  },

  async create(data: {
    userId: string;
    title?: string;
    template?: string;
    themeConfig?: unknown;
    language?: string;
    targetJobTitle?: string | null;
    targetCompany?: string | null;
  }) {
    const id = crypto.randomUUID();
    await db.insert(resumes).values({
      id,
      userId: data.userId,
      title: data.title || '未命名简历',
      template: data.template || 'classic',
      ...(data.themeConfig !== undefined ? { themeConfig: data.themeConfig } : {}),
      language: data.language || 'zh',
      targetJobTitle: normalizeOptionalText(data.targetJobTitle),
      targetCompany: normalizeOptionalText(data.targetCompany),
    });
    return this.findById(id);
  },

  async update(id: string, data: ResumeMutation) {
    const payload = { ...data } as ResumeMutation;
    if ('targetJobTitle' in data) {
      payload.targetJobTitle = normalizeOptionalText(data.targetJobTitle);
    }
    if ('targetCompany' in data) {
      payload.targetCompany = normalizeOptionalText(data.targetCompany);
    }
    await db.update(resumes).set({ ...payload, updatedAt: new Date() }).where(eq(resumes.id, id));
    return this.findById(id);
  },

  async delete(id: string) {
    await db.delete(resumes).where(eq(resumes.id, id));
  },

  async duplicate(
    id: string,
    userId: string,
    options?: {
      title?: string;
      targetJobTitle?: string | null;
      targetCompany?: string | null;
    }
  ) {
    const original = await this.findById(id);
    if (!original) return null;

    const titleOverride = options?.title?.trim();
    const hasTargetJobTitle = options && 'targetJobTitle' in options;
    const hasTargetCompany = options && 'targetCompany' in options;
    const targetJobTitle = hasTargetJobTitle
      ? normalizeOptionalText(options?.targetJobTitle)
      : normalizeOptionalText(original.targetJobTitle);
    const targetCompany = hasTargetCompany
      ? normalizeOptionalText(options?.targetCompany)
      : normalizeOptionalText(original.targetCompany);
    const baseTitle = original.targetJobTitle && original.title.endsWith(` - ${original.targetJobTitle}`)
      ? original.title.slice(0, -(` - ${original.targetJobTitle}`).length)
      : original.title;
    const derivedTitle = titleOverride
      ?? (hasTargetJobTitle && targetJobTitle ? `${baseTitle} - ${targetJobTitle}` : `${original.title} (副本)`);

    const newId = crypto.randomUUID();
    await db.insert(resumes).values({
      id: newId,
      userId,
      title: derivedTitle,
      template: original.template,
      themeConfig: original.themeConfig,
      language: original.language,
      targetJobTitle,
      targetCompany,
    });

    for (const section of original.sections) {
      await db.insert(resumeSections).values({
        id: crypto.randomUUID(),
        resumeId: newId,
        type: section.type,
        title: section.title,
        sortOrder: section.sortOrder,
        visible: section.visible,
        content: section.content,
      });
    }

    return this.findById(newId);
  },

  // Share operations
  async findByShareToken(token: string) {
    const resume = await db.select().from(resumes).where(eq(resumes.shareToken, token)).limit(1);
    if (!resume[0]) return null;
    const sections = await db.select().from(resumeSections).where(eq(resumeSections.resumeId, resume[0].id)).orderBy(resumeSections.sortOrder);
    return { ...resume[0], sections };
  },

  async incrementViewCount(id: string) {
    await db.update(resumes).set({ viewCount: sql`${resumes.viewCount} + 1` }).where(eq(resumes.id, id));
  },

  async updateShareSettings(id: string, settings: { isPublic?: boolean; shareToken?: string | null; sharePassword?: string | null }) {
    await db.update(resumes).set({ ...settings, updatedAt: new Date() }).where(eq(resumes.id, id));
  },

  // Section operations
  async createSection(data: { id?: string; resumeId: string; type: string; title: string; sortOrder: number; visible?: boolean; content?: unknown }) {
    const id = data.id || crypto.randomUUID();
    await db.insert(resumeSections).values({
      id,
      resumeId: data.resumeId,
      type: data.type,
      title: data.title,
      sortOrder: data.sortOrder,
      visible: data.visible ?? true,
      content: data.content || {},
    });
    const rows = await db.select().from(resumeSections).where(eq(resumeSections.id, id)).limit(1);
    return rows[0];
  },

  async updateSection(id: string, data: Partial<{ title: string; sortOrder: number; visible: boolean; content: unknown }>) {
    await db.update(resumeSections).set({ ...data, updatedAt: new Date() }).where(eq(resumeSections.id, id));
  },

  async deleteSection(id: string) {
    await db.delete(resumeSections).where(eq(resumeSections.id, id));
  },

  async updateSectionOrder(sections: { id: string; sortOrder: number }[]) {
    for (const s of sections) {
      await db.update(resumeSections).set({ sortOrder: s.sortOrder, updatedAt: new Date() }).where(eq(resumeSections.id, s.id));
    }
  },
};
