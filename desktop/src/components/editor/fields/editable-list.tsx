import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface EditableListProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export function EditableList({
  label,
  items,
  onChange,
  placeholder,
}: EditableListProps) {
  const { t } = useTranslation();

  const addItem = () => {
    onChange([...items, ""]);
  };

  const updateItem = (index: number, value: string) => {
    const updated = items.map((item, i) => (i === index ? value : item));
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </Label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              className="h-8 text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 cursor-pointer p-0 text-zinc-400 hover:text-red-500"
              onClick={() => removeItem(index)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full cursor-pointer gap-1"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("editor.fields.addItem")}
      </Button>
    </div>
  );
}