/**
 * Thin wrapper around shadcn Select for legacy Desktop components that
 * use a simplified onChange + options API.  Will be removed as pages
 * are rewritten to match the Web 1:1.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SimpleSelectOption {
  label: string;
  value: string;
}

interface SimpleSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SimpleSelectOption[];
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function SimpleSelect({
  value,
  onValueChange,
  options,
  className,
  disabled,
  placeholder,
}: SimpleSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
