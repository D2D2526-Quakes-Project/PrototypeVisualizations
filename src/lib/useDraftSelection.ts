import { useState } from "react";

export function useDraftSelection<T>(selected: T[], onChange: (value: T[]) => void) {
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

  return { open, draft, handleOpenChange, toggleOption };
}
