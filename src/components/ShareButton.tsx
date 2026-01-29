import React from 'react';
import { Share2 } from 'lucide-react';
import type { SerializedDockview } from 'dockview';
import { copyShareableUrlToClipboard } from '../lib/layoutPersistence';

interface ShareButtonProps {
  layout: SerializedDockview;
  className?: string;
}

export function ShareButton({ layout, className }: ShareButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const success = await copyShareableUrlToClipboard(layout);
    
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Fallback: show error or try alternative method
      alert('Failed to copy URL. Please try again.');
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${className || ''}`}
      title="Copy shareable URL"
    >
      <Share2 size={16} />
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}