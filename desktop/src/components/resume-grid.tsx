import type { Resume } from "../types/resume";
import { ResumeCard } from "./resume-card";

interface ResumeGridProps {
  resumes: Resume[];
  onDelete: (id: string) => Promise<boolean>;
  onDuplicate: (id: string) => Promise<Resume | null>;
  onRename: (id: string, title: string) => Promise<boolean>;
}

export function ResumeGrid({ resumes, onDelete, onDuplicate, onRename }: ResumeGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {resumes.map((resume) => (
        <ResumeCard
          key={resume.id}
          resume={resume}
          onDelete={() => onDelete(resume.id)}
          onDuplicate={() => onDuplicate(resume.id)}
          onRename={(title) => onRename(resume.id, title)}
        />
      ))}
    </div>
  );
}
