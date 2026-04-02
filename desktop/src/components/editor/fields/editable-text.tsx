import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditableTextProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

export function EditableText({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: EditableTextProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </Label>
      <Input
        type={type}
        value={value || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="h-8 text-sm"
      />
    </div>
  );
}