import { BriefcaseBusiness } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getResumeTargetLabel } from '@/lib/resume-target';
import type { Resume } from '@/types/resume';

interface ResumeTargetBadgeProps {
  targetJobTitle?: Resume['targetJobTitle'];
  targetCompany?: Resume['targetCompany'];
  className?: string;
}

export function ResumeTargetBadge({ targetJobTitle, targetCompany, className }: ResumeTargetBadgeProps) {
  const label = getResumeTargetLabel({ targetJobTitle, targetCompany });

  if (!label) {
    return null;
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-1 border border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900/60 dark:bg-pink-950/30 dark:text-pink-200',
        className
      )}
    >
      <BriefcaseBusiness className="h-3 w-3" />
      <span className="truncate">{label}</span>
    </Badge>
  );
}
