// Reserve room for keyword candidates instead of letting the textarea fill the dialog.
export function mobileEditorHeight(contentHeight: number, viewportHeight: number, bodyHeight: number) {
  const ceiling = Math.max(52, Math.min(180, viewportHeight * 0.36, bodyHeight - 88));
  return Math.ceil(Math.max(52, Math.min(contentHeight, ceiling)));
}
