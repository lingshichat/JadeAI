'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResumeTargetBadge } from '@/components/resume/resume-target-badge';
import { buildJdVersionTitle } from '@/lib/resume-target';
import type { Resume } from '@/types/resume';

type ResumeSource = Pick<Resume, 'id' | 'title' | 'targetJobTitle' | 'targetCompany'>;

interface CreateJdVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceResume: ResumeSource | null;
  onCreate: (
    sourceResumeId: string,
    options: { targetJobTitle: string; targetCompany?: string | null }
  ) => Promise<Resume | null>;
  onCreated?: (resume: Resume) => void;
}

export function CreateJdVersionDialog({
  open,
  onOpenChange,
  sourceResume,
  onCreate,
  onCreated,
}: CreateJdVersionDialogProps) {
  const t = useTranslations('jdVersion');
  const ct = useTranslations('common');
  const [targetJobTitle, setTargetJobTitle] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTargetJobTitle(sourceResume?.targetJobTitle ?? '');
    setTargetCompany(sourceResume?.targetCompany ?? '');
    setError('');
    setIsCreating(false);
  }, [open, sourceResume]);

  const previewTitle = sourceResume
    ? buildJdVersionTitle(sourceResume, targetJobTitle)
    : '';

  const handleCreate = async () => {
    if (!sourceResume) return;

    const normalizedTargetJobTitle = targetJobTitle.trim();
    const normalizedTargetCompany = targetCompany.trim();

    if (!normalizedTargetJobTitle) {
      setError(t('missingJobTitle'));
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const createdResume = await onCreate(sourceResume.id, {
        targetJobTitle: normalizedTargetJobTitle,
        targetCompany: normalizedTargetCompany || null,
      });

      if (!createdResume) {
        setError(t('error'));
        return;
      }

      toast.success(t('success'));
      onOpenChange(false);
      onCreated?.(createdResume);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error');
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isCreating && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t('sourceResume')}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {sourceResume?.title || ''}
            </p>
            {sourceResume?.targetJobTitle && (
              <ResumeTargetBadge
                targetJobTitle={sourceResume.targetJobTitle}
                targetCompany={sourceResume.targetCompany}
                className="mt-2 w-fit"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('targetJobTitle')}
            </label>
            <Input
              value={targetJobTitle}
              onChange={(event) => setTargetJobTitle(event.target.value)}
              placeholder={t('targetJobTitlePlaceholder')}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('targetCompany')}
            </label>
            <Input
              value={targetCompany}
              onChange={(event) => setTargetCompany(event.target.value)}
              placeholder={t('targetCompanyPlaceholder')}
              disabled={isCreating}
            />
          </div>

          <div className="rounded-xl border border-pink-200 bg-pink-50/70 p-4 dark:border-pink-900/60 dark:bg-pink-950/20">
            <p className="text-xs font-medium uppercase tracking-wide text-pink-700 dark:text-pink-300">
              {t('previewTitle')}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {previewTitle}
            </p>
            <ResumeTargetBadge
              targetJobTitle={targetJobTitle}
              targetCompany={targetCompany}
              className="mt-2 w-fit"
            />
            <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t('independentHint')}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating} className="cursor-pointer">
            {ct('cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={isCreating} className="cursor-pointer bg-pink-500 hover:bg-pink-600">
            {isCreating ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                {t('creating')}
              </>
            ) : (
              t('createButton')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
