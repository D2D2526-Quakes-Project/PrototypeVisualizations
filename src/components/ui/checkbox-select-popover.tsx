import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

type CheckboxOption<T extends string> = {
  value: T;
  label: string;
  color: string;
};

type CheckboxSelectPopoverProps<T extends string> = {
  options: Array<CheckboxOption<T>>;
  selected: T[];
  onChange: (selected: T[]) => void;
  triggerLabel: string;
  triggerTitle?: string;
  align?: "start" | "end" | "center";
  buttonSize?: "xs" | "sm" | "default" | "lg" | "icon";
  popoverWidth?: string;
  scrollable?: boolean;
  idPrefix?: string;
  className?: string;
};

export function CheckboxSelectPopover<T extends string>({
  options,
  selected,
  onChange,
  triggerLabel,
  triggerTitle,
  align = "start",
  buttonSize = "sm",
  popoverWidth = "w-64",
  scrollable = true,
  idPrefix,
  className,
}: CheckboxSelectPopoverProps<T>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(selected);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setDraft(selected);
    }
    setOpen(newOpen);
  };

  const toggleOption = (item: T) => {
    const prev = draft;
    const next = prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item];
    setDraft(next);
    if (next.length >= 1) {
      onChange(next);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button title={triggerTitle} variant="outline" size={buttonSize} className={className}>
          <span data-slot="checkbox-select-trigger-label" className="flex-1 truncate">
            {triggerLabel}
          </span>
          <ChevronDown
            data-slot="checkbox-select-chevron"
            className={cn("text-muted-foreground h-3 w-3 shrink-0 transition-transform", open && "rotate-180")}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className={cn(popoverWidth)}>
        <div
          data-slot="checkbox-select-options"
          className={cn("flex flex-col gap-0.5", scrollable && "max-h-80 overflow-auto")}>
          {options.map((option) => {
            const isChecked = draft.includes(option.value);
            return (
              <Label
                key={option.value}
                htmlFor={idPrefix ? `${idPrefix}-${option.value}` : undefined}
                className="hover:bg-accent focus:bg-accent dark:hover:bg-accent/50 dark:focus:bg-accent/50 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors">
                <Checkbox
                  id={idPrefix ? `${idPrefix}-${option.value}` : undefined}
                  checked={isChecked}
                  onCheckedChange={() => toggleOption(option.value)}
                />
                <span className="flex-1">{option.label}</span>
                <span className="border-border h-3 w-3 rounded-full border" style={{ backgroundColor: option.color }} />
              </Label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
