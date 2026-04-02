import { Label } from "@/components/ui/label";
import { SimpleSelect } from "../../simple-select";

interface SelectOption {
  label: string;
  value: string;
}

interface EditableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

export function EditableSelect({
  label,
  value,
  onChange,
  options,
}: EditableSelectProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </Label>
      <SimpleSelect
        value={value || ""}
        onValueChange={onChange}
        options={options}
        className="h-8 text-sm"
      />
    </div>
  );
}
