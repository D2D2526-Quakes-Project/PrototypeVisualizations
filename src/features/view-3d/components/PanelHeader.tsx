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
    <div className={cn("px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0", className)}>
      <div className={cn("flex items-center gap-2", actions ? "justify-between" : "justify-start")}>
        <div className="text-sm text-neutral-700 min-w-0">
          <span className="font-medium">{title}</span>
          {subtitle ? <span className="text-neutral-400 ml-2">{subtitle}</span> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {meta ? <div className="mt-1">{meta}</div> : null}
    </div>
  );
}
