import React, { useMemo, useState } from 'react';
import { renderMathAndCleanHtml } from '../utils/greLogic';
import { X, ZoomIn } from 'lucide-react';

interface RichHtmlProps {
  html: string | null | undefined;
  className?: string;
  inline?: boolean;
}

export const RichHtml: React.FC<RichHtmlProps> = ({ html, className = '', inline = false }) => {
  const [zoomedImgSrc, setZoomedImgSrc] = useState<string | null>(null);

  const rendered = useMemo(() => renderMathAndCleanHtml(html), [html]);

  if (!rendered) return null;

  const handleContainerClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      if (img.src) {
        e.stopPropagation();
        setZoomedImgSrc(img.src);
      }
    }
  };

  const hasImage = rendered.includes('<img');

  return (
    <>
      {inline ? (
        <span
          className={`gre-option-content ${className}`}
          onClick={handleContainerClick}
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      ) : (
        <div className="relative group/rich">
          <div
            className={`gre-rich-content ${className}`}
            onClick={handleContainerClick}
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
          {hasImage && (
            <div className="mt-1.5 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <ZoomIn className="w-3.5 h-3.5" />
                Click diagram or chart to enlarge
              </span>
            </div>
          )}
        </div>
      )}

      {zoomedImgSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4"
          onClick={() => setZoomedImgSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged diagram view"
        >
          <div
            className="relative max-w-6xl max-h-[90vh] bg-white rounded-xl p-4 shadow-2xl overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-700">
                Figure &amp; Data Chart Inspector
              </span>
              <button
                type="button"
                onClick={() => setZoomedImgSrc(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                aria-label="Close enlarged diagram"
              >
                <X className="w-3.5 h-3.5" />
                Close
              </button>
            </div>
            <img
              src={zoomedImgSrc}
              alt="Enlarged GRE question figure"
              referrerPolicy="no-referrer"
              className="max-w-full h-auto mx-auto"
            />
          </div>
        </div>
      )}
    </>
  );
};
