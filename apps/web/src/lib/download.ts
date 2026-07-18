export async function downloadBlob(url: string, fallbackFilename: string, authToken?: string | null): Promise<void> {
  const res = await window.fetch(url, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) throw new Error('Tải về thất bại');

  const disposition = res.headers.get('Content-Disposition');
  let filename = fallbackFilename;
  if (disposition) {
    const match = disposition.match(/filename[^;=\n]*=(?:(['"])(.*?)\1|([^;\n]*))/);
    if (match) {
      filename = match[2] || match[3] || filename;
    }
  }

  if (!filename.includes('.')) {
    const mime = res.headers.get('Content-Type') || '';
    const ext = mime.split('/')[1] || 'mp4';
    filename = `${filename}.${ext}`;
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}
