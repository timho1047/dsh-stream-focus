/** Global stylesheet owned by the row presenter. */
export const PROGRESS_STYLE = `
[data-variant="think"][data-dshsf-progress] [class*="separator"],
[data-variant="think"][data-dshsf-progress] [class*="summary"] {
  display: none !important;
}

[data-variant="think"][data-dshsf-progress] [data-disclosure-header] [data-shimmer] > [inert] {
  display: none !important;
}

[data-variant="think"][data-dshsf-progress] [class*="_title"]::after {
  content: " · " attr(data-dshsf-phrase);
  font-weight: 400;
  color: var(--dsw-alias-label-secondary, inherit);
  white-space: nowrap;
}

[data-variant="think"][data-dshsf-progress][data-dshsf-pending] [class*="_title"]::after {
  content: " · …";
  color: var(--dsw-alias-label-tertiary, inherit);
}
`;
//# sourceMappingURL=progress-style.js.map