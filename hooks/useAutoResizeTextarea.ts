import { useRef, useCallback, useEffect, type RefObject } from "react";

export interface UseAutoResizeTextareaOptions {
  minRows?: number;
  maxRows?: number;
  lineHeight?: number;
}

export interface UseAutoResizeTextareaReturn {
  ref: RefObject<HTMLTextAreaElement | null>;
  rows: number;
  resetHeight: () => void;
}

export function useAutoResizeTextarea(
  value: string,
  options?: UseAutoResizeTextareaOptions
): UseAutoResizeTextareaReturn {
  const { minRows = 1, maxRows = 5, lineHeight = 24 } = options ?? {};
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const lineCount = value && value.trim() ? value.split("\n").length : minRows;
  const rows = Math.min(Math.max(lineCount, minRows), maxRows);

  const adjustHeight = useCallback(() => {
    const textarea = ref.current;
    if (!textarea) return;

    if (!value || !value.trim()) {
      textarea.rows = minRows;
      textarea.style.height = "auto";
      textarea.style.overflowY = "hidden";
      return;
    }

    textarea.rows = rows;
    textarea.style.height = "auto";
    const maxHeight = lineHeight * maxRows;
    const hasOverflow = lineCount > maxRows;
    textarea.style.overflowY = hasOverflow ? "auto" : "hidden";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [value, rows, minRows, maxRows, lineHeight]);

  const resetHeight = useCallback(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.rows = minRows;
    textarea.style.height = "auto";
    textarea.style.overflowY = "hidden";
  }, [minRows]);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  return { ref, rows, resetHeight };
}
