import React from 'react';
import { cn } from '@/lib/utils';

interface FormattedMomTextProps {
  text?: string | null;
  className?: string;
  bulletClassName?: string;
  emptyFallback?: string;
}

/**
 * Renders multi-line Minutes of Meeting (MoM) text cleanly with preserved line breaks
 * and structured bullet-point styling for lines starting with bullet markers (•, -, *, or numbered lists).
 */
export function FormattedMomText({
  text,
  className,
  bulletClassName,
  emptyFallback,
}: FormattedMomTextProps) {
  const raw = typeof text === 'string' ? text.trim() : '';
  if (!raw) {
    return emptyFallback ? (
      <p className={cn('text-xs text-slate-400 italic', className)}>{emptyFallback}</p>
    ) : null;
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return null;

  const isBulletLine = (line: string) => /^([•\-*▪▸]|\d+[.)])\s+/.test(line);
  const stripMarker = (line: string) => line.replace(/^([•\-*▪▸]|\d+[.)])\s+/, '').trim();

  // If multiple lines exist or any line uses bullet syntax, render as a clean structured list / paragraphs
  const hasExplicitBullets = lines.some(isBulletLine);

  if (hasExplicitBullets || lines.length > 1) {
    return (
      <ul className={cn('space-y-1.5 text-xs text-slate-800 leading-relaxed', className)}>
        {lines.map((line, idx) => {
          const numberedMatch = line.match(/^(\d+[.)])\s+(.*)$/);
          if (numberedMatch) {
            return (
              <li key={idx} className="flex items-start gap-2">
                <span className={cn('font-bold text-indigo-600 shrink-0 min-w-[1.25rem]', bulletClassName)}>
                  {numberedMatch[1]}
                </span>
                <span className="whitespace-pre-wrap break-words">{numberedMatch[2]}</span>
              </li>
            );
          }
          const content = isBulletLine(line) ? stripMarker(line) : line;
          return (
            <li key={idx} className="flex items-start gap-2">
              <span
                className={cn(
                  'mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0',
                  bulletClassName
                )}
              />
              <span className="whitespace-pre-wrap break-words">{content}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <p className={cn('text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-words', className)}>
      {raw}
    </p>
  );
}

/**
 * Helper to insert a bullet point at the start of a textarea value or on a new line.
 */
export function appendBulletPoint(currentValue: string): string {
  if (!currentValue || !currentValue.trim()) {
    return '• ';
  }
  const trimmedEnd = currentValue.replace(/[ \t]+$/, '');
  if (trimmedEnd.endsWith('\n')) {
    return `${trimmedEnd}• `;
  }
  return `${trimmedEnd}\n• `;
}

export default FormattedMomText;
