import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> { key: string; header: string; render?: (row: T) => React.ReactNode; className?: string }

/** Simple responsive table: scrolls horizontally on small screens. */
export function DataTable<T extends { id: string }>({ columns, rows, empty = 'لا توجد بيانات', className }: { columns: Column<T>[]; rows: T[]; empty?: string; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-line bg-surface scroll-thin', className)}>
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-canvas-2 text-xs text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn('px-4 py-2.5 text-start font-medium', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-t border-line hover:bg-canvas/60">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 align-middle', c.className)}>
                    {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
