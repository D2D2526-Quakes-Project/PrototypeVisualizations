import React from "react";
import { Share2 } from "lucide-react";
import type { SerializedDockview } from "dockview";
import { copyShareableUrlToClipboard } from "../lib/layoutPersistence";
import { Button } from "./ui/button";

interface ShareButtonProps {
  layout: SerializedDockview;
  className?: string;
}

export function ShareButton({ layout }: ShareButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const success = await copyShareableUrlToClipboard(layout);

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Fallback: show error or try alternative method
      alert("Failed to copy URL. Please try again.");
    }
  };

  return (
    <Button onClick={handleShare} title="Copy shareable URL" variant={"secondary"} size="sm">
      <Share2 size={16} />
      {copied ? "Copied!" : "Share"}
    </Button>
  );
}
