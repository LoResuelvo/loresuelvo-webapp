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
