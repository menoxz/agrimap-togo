import { useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Share2, Copy, X, Check } from 'lucide-react';

/**
 * ShareWidget — Floating share button (bottom-right).
 * Opens a modal with the current page URL to copy and a pre-filled key message.
 * Uses navigator.clipboard.writeText for clipboard.
 */
export default function ShareWidget() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareMessage = t('story:story.share_message');

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select and copy via textarea
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${shareMessage}\n\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = `${shareMessage}\n\n${shareUrl}`;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareMessage, shareUrl]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className={[
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full',
          'bg-primary text-white shadow-lg hover:bg-primary-hover',
          'flex items-center justify-center',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          'focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2',
          'print:hidden',
        ].join(' ')}
        aria-label="Partager"
      >
        <Share2 size={22} />
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm print:hidden"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-surface rounded-lg shadow-lg w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 font-bold text-text">
                Partager
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-surface-alt transition-colors"
                aria-label="Fermer"
              >
                <X size={20} className="text-muted" />
              </button>
            </div>

            {/* Share message preview */}
            <div className="bg-surface-alt rounded-md p-3 mb-4 text-body-sm text-text-secondary leading-relaxed">
              {shareMessage}
            </div>

            {/* URL to copy */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-surface-alt rounded-md px-3 py-2 text-body-sm text-text truncate">
                {shareUrl}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCopyLink}
                className={[
                  'flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md font-semibold text-body-sm transition-all',
                  copied
                    ? 'bg-success text-white'
                    : 'bg-primary text-white hover:bg-primary-hover',
                ].join(' ')}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Lien copié
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copier le lien
                  </>
                )}
              </button>
              <button
                onClick={handleCopyMessage}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md font-semibold text-body-sm border-2 border-primary text-primary hover:bg-primary-light transition-all"
              >
                <Copy size={16} />
                Copier avec le message
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
