/**
 * Visual Template Designer - PageNavigation
 *
 * A panel showing page thumbnails for multi-page navigation.
 * Supports selecting, adding, removing, and drag-to-reorder pages.
 */

import React, { useRef, useState } from 'react';
import type { TemplatePage } from '../../domain/types';

export interface PageNavigationProps {
  pages: TemplatePage[];
  currentPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onRemovePage: (pageId: string) => void;
  onReorderPages: (pageIds: string[]) => void;
  /** Map of pageId -> true when at least one component extends beyond the page boundary. */
  componentWarnings?: Record<string, boolean>;
}

export function PageNavigation({
  pages,
  currentPageId,
  onSelectPage,
  onAddPage,
  onRemovePage,
  onReorderPages,
  componentWarnings = {},
}: PageNavigationProps) {
  const dragSrcIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragSrcIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, targetIndex: number) {
    e.preventDefault();
    const srcIndex = dragSrcIndex.current;
    if (srcIndex === null || srcIndex === targetIndex) {
      dragSrcIndex.current = null;
      setDragOverIndex(null);
      return;
    }

    const reordered = [...pages];
    const [moved] = reordered.splice(srcIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onReorderPages(reordered.map((p) => p.id));

    dragSrcIndex.current = null;
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    dragSrcIndex.current = null;
    setDragOverIndex(null);
  }

  const onlyOnePage = pages.length === 1;

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-gray-100 border-r border-gray-300 overflow-y-auto select-none"
      style={{ minWidth: 80, maxWidth: 96 }}
      aria-label="Page navigation"
    >
      {pages.map((page, index) => {
        const isActive = page.id === currentPageId;
        const hasWarning = componentWarnings[page.id] === true;
        const isDragTarget = dragOverIndex === index;

        return (
          <div
            key={page.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className="relative flex flex-col items-center"
          >
            {/* Drop indicator */}
            {isDragTarget && (
              <div className="w-full h-0.5 bg-blue-400 rounded mb-1" />
            )}

            {/* Thumbnail box */}
            <button
              type="button"
              onClick={() => onSelectPage(page.id)}
              className={[
                'w-14 h-20 rounded flex flex-col items-center justify-center text-xs font-medium cursor-pointer border-2 transition-colors',
                isActive
                  ? 'border-blue-500 bg-white shadow-md text-blue-700'
                  : 'border-gray-300 bg-white hover:border-blue-300 text-gray-600',
              ].join(' ')}
              aria-label={`Go to page ${page.pageNumber}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-base leading-none">{page.pageNumber}</span>
              {hasWarning && (
                <span
                  className="mt-1 text-yellow-500"
                  title="A component extends beyond the page boundary"
                  aria-label="Warning: component out of bounds"
                >
                  ⚠
                </span>
              )}
            </button>

            {/* Page label */}
            <span className="mt-0.5 text-xs text-gray-500 leading-tight">
              Page {page.pageNumber}
            </span>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemovePage(page.id)}
              disabled={onlyOnePage}
              className={[
                'absolute top-0 right-0 w-4 h-4 flex items-center justify-center rounded-full text-xs leading-none transition-colors',
                onlyOnePage
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-red-100 hover:text-red-600 cursor-pointer',
              ].join(' ')}
              aria-label={`Remove page ${page.pageNumber}`}
              title={onlyOnePage ? 'Cannot remove the only page' : `Remove page ${page.pageNumber}`}
            >
              ×
            </button>
          </div>
        );
      })}

      {/* Add page button */}
      <button
        type="button"
        onClick={onAddPage}
        className="mt-1 w-14 h-8 self-center rounded border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-lg leading-none flex items-center justify-center"
        aria-label="Add page"
        title="Add new page"
      >
        +
      </button>
    </div>
  );
}
