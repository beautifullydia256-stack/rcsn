/**
 * Visual Template Designer - Component Library Panel
 *
 * Sidebar panel showing all available components for the current template
 * category, grouped by component category, with search and collapse support.
 *
 * Components are draggable via HTML5 drag-and-drop.  The drag data transfer
 * carries the component type under the key:
 *   'application/x-template-component'
 */

import React, { useState, useMemo } from 'react';
import type { TemplateCategory } from '../../domain/types';
import {
  COMPONENT_METADATA,
  getAllComponentCategories,
  getComponentsForCategory,
  isComponentAllowedForCategory,
  type ComponentCategory,
} from '../../domain/models';

// ---------------------------------------------------------------------------
// Icon map — maps the icon string stored in metadata to an emoji
// ---------------------------------------------------------------------------

const ICON_EMOJI: Record<string, string> = {
  image: '🖼️',
  text: '🔤',
  'map-pin': '📍',
  phone: '📞',
  user: '👤',
  camera: '📷',
  book: '📖',
  layers: '🗂️',
  hash: '#️⃣',
  'calendar-check': '📅',
  table: '📊',
  list: '📋',
  award: '🏆',
  calculator: '🧮',
  'trending-up': '📈',
  'message-square': '💬',
  'file-text': '📄',
  'dollar-sign': '💲',
  'credit-card': '💳',
  'list-ordered': '🔢',
  minus: '➖',
  square: '⬛',
  circle: '⭕',
  droplet: '💧',
  type: '🔡',
  'edit-3': '✏️',
};

function getIcon(iconName: string): string {
  return ICON_EMOJI[iconName] ?? '🧩';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ComponentLibraryProps {
  templateCategory: TemplateCategory;
}

// ---------------------------------------------------------------------------
// Component item
// ---------------------------------------------------------------------------

interface ComponentItemProps {
  componentType: string;
  displayName: string;
  icon: string;
}

function ComponentItem({ componentType, displayName, icon }: ComponentItemProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      'application/x-template-component',
      JSON.stringify({ componentType })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2 px-3 py-2 rounded cursor-grab active:cursor-grabbing hover:bg-blue-50 hover:text-blue-700 transition-colors select-none"
      title={`Drag to add ${displayName}`}
    >
      <span className="text-base leading-none w-5 text-center flex-shrink-0" aria-hidden="true">
        {getIcon(icon)}
      </span>
      <span className="text-sm font-medium truncate">{displayName}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group header with collapse toggle
// ---------------------------------------------------------------------------

interface GroupHeaderProps {
  category: ComponentCategory;
  isOpen: boolean;
  count: number;
  onToggle: () => void;
}

function GroupHeader({ category, isOpen, count, onToggle }: GroupHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors rounded text-left"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {category}
      </span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400">{count}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main ComponentLibrary panel
// ---------------------------------------------------------------------------

export function ComponentLibrary({ templateCategory }: ComponentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<ComponentCategory>>(new Set());

  const allowedTypes = useMemo(
    () => new Set(getComponentsForCategory(templateCategory)),
    [templateCategory]
  );

  const groupedComponents = useMemo(() => {
    const categories = getAllComponentCategories();
    const query = searchQuery.trim().toLowerCase();

    return categories
      .map((category) => {
        const items = Object.values(COMPONENT_METADATA).filter((meta) => {
          if (!allowedTypes.has(meta.type)) return false;
          if (!isComponentAllowedForCategory(templateCategory, meta.type)) return false;
          if (meta.category !== category) return false;
          if (query && !meta.displayName.toLowerCase().includes(query)) return false;
          return true;
        });
        return { category, items };
      })
      .filter(({ items }) => items.length > 0);
  }, [allowedTypes, templateCategory, searchQuery]);

  const toggleGroup = (category: ComponentCategory) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <aside
      style={{ width: 260 }}
      className="h-full flex flex-col bg-white border-r border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-3 pt-4 pb-3 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Components</h2>
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components…"
            className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
          />
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {groupedComponents.length === 0 && (
          <p className="text-xs text-gray-400 text-center pt-4">
            No components match your search.
          </p>
        )}

        {groupedComponents.map(({ category, items }) => {
          const isOpen = !collapsedGroups.has(category);

          return (
            <div key={category}>
              <GroupHeader
                category={category}
                isOpen={isOpen}
                count={items.length}
                onToggle={() => toggleGroup(category)}
              />

              {isOpen && (
                <div className="mt-1 space-y-0.5">
                  {items.map((meta) => (
                    <ComponentItem
                      key={meta.type}
                      componentType={meta.type}
                      displayName={meta.displayName}
                      icon={meta.icon}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-gray-200 flex-shrink-0">
        <p className="text-xs text-gray-400 text-center">Drag a component onto the canvas</p>
      </div>
    </aside>
  );
}

export default ComponentLibrary;
