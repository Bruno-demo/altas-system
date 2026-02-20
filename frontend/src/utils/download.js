export function getFilenameFromDisposition(headerValue, fallback) {
  if (!headerValue) return fallback;
  const match = /filename=\"?([^\";]+)\"?/i.exec(headerValue);
  return match?.[1] || fallback;
}

export function downloadBlob(data, filename) {
  const blob = data instanceof Blob ? data : new Blob([data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
