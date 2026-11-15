// Shrink an image in the browser before upload: max width ~1,600px, JPEG.
// Non-image files (PDF) are returned unchanged.
const MAX_WIDTH = 1600;
const QUALITY = 0.85;

// Returns { blob, mimeType, ext }.
export async function prepareFile(blob, mimeType) {
  if (!mimeType.startsWith('image/')) return { blob, mimeType, ext: 'pdf' };

  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // flatten transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const out = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  return { blob: out, mimeType: 'image/jpeg', ext: 'jpg' };
}
