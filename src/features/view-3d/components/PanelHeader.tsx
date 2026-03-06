import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, subtitle, actions, meta, className }: PanelHeaderProps) {
  return (
    <div className={cn("z-20 shrink-0 border-b border-neutral-100 bg-white px-3 py-1.5", className)}>
      <div className={cn("flex items-center gap-2", actions ? "justify-between" : "justify-start")}>
        <div className="min-w-0 text-sm text-neutral-700">
          <span className="font-medium">{title}</span>
          {subtitle ? <span className="ml-2 text-neutral-400">{subtitle}</span> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {meta ? <div className="mt-1">{meta}</div> : null}
    </div>
  );
}
