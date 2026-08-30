/**
 * Determines whether a text content is long enough to warrant
 * a "show more / show less" expand button.
 *
 * Uses a heuristic based on estimated line count given a
 * maximum character width per line.
 */
export function shouldShowExpandButton(
  content: string,
  maxCharsPerLine = 40,
  maxVisibleLines = 5
): boolean {
  const explicitLines = content.split("\n").length;
  const estimatedWrappedLines = Math.ceil(content.length / maxCharsPerLine);
  return estimatedWrappedLines + explicitLines > maxVisibleLines;
}

/**
 * Returns the initials of a given name.
 * Handles single names, multiple names, and removes extra spaces.
 * E.g., "Juan Perez" -> "JP", "Ana" -> "A"
 */
export function getInitials(name: string): string {
  if (!name) return "";
  
  const words = name.trim().split(/\s+/);
  
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}
