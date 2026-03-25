import type { Resume } from '@/types/resume';

type ResumeTargetMeta = Pick<Resume, 'title' | 'targetJobTitle' | 'targetCompany'>;

function normalizeOptionalText(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function getResumeTargetLabel(target: Pick<Resume, 'targetJobTitle' | 'targetCompany'>) {
  const jobTitle = normalizeOptionalText(target.targetJobTitle);
  if (!jobTitle) return null;

  const company = normalizeOptionalText(target.targetCompany);
  return company ? `${jobTitle} · ${company}` : jobTitle;
}

export function stripResumeTargetSuffix(title: string, targetJobTitle?: string | null) {
  const normalizedTitle = title.trim();
  const normalizedTargetJobTitle = normalizeOptionalText(targetJobTitle);

  if (!normalizedTargetJobTitle) {
    return normalizedTitle;
  }

  const suffix = ` - ${normalizedTargetJobTitle}`;
  return normalizedTitle.endsWith(suffix)
    ? normalizedTitle.slice(0, -suffix.length)
    : normalizedTitle;
}

export function buildJdVersionTitle(sourceResume: ResumeTargetMeta, nextTargetJobTitle?: string | null) {
  const normalizedTargetJobTitle = normalizeOptionalText(nextTargetJobTitle);
  if (!normalizedTargetJobTitle) {
    return sourceResume.title;
  }

  return `${stripResumeTargetSuffix(sourceResume.title, sourceResume.targetJobTitle)} - ${normalizedTargetJobTitle}`;
}
