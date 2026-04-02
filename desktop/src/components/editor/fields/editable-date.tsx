import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditableDateProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EditableDate({
  label,
  value,
  onChange,
  placeholder,
}: EditableDateProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </Label>
      <Input
        type="text"
        value={value || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder || "YYYY.MM"}
        className="h-8 text-sm"
      />
    </div>
  );
}