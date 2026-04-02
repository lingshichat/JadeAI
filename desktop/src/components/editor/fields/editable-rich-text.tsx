import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface EditableRichTextProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EditableRichText({
  label,
  value,
  onChange,
  placeholder,
}: EditableRichTextProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </Label>
      <Textarea
        value={value || ""}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="min-h-[80px] text-sm"
      />
    </div>
  );
}