type Size = { width: number; height: number };
type Rect = { x: number; y: number; width: number; height: number };

/** Map the visible guide in a center-filled camera preview onto the saved, upright photo. */
export function receiptFrameCrop(photo: Size, preview: Size, frame: Rect) {
  const values = [photo.width, photo.height, preview.width, preview.height, frame.x, frame.y, frame.width, frame.height];
  if (values.some((value) => !Number.isFinite(value)) ||
      photo.width <= 0 || photo.height <= 0 || preview.width <= 0 || preview.height <= 0 ||
      frame.width <= 0 || frame.height <= 0 || frame.x < 0 || frame.y < 0 ||
      frame.x + frame.width > preview.width + 1 || frame.y + frame.height > preview.height + 1) {
    throw new Error('Không xác định được vùng ảnh trong khung chụp.');
  }

  // CameraView uses a center-filled preview when no ratio is set. The photo may
  // have another aspect ratio, so account for the image hidden beyond the view.
  const scale = Math.max(preview.width / photo.width, preview.height / photo.height);
  const hiddenX = (photo.width * scale - preview.width) / 2;
  const hiddenY = (photo.height * scale - preview.height) / 2;
  const left = Math.max(0, Math.floor((frame.x + hiddenX) / scale));
  const top = Math.max(0, Math.floor((frame.y + hiddenY) / scale));
  const right = Math.min(photo.width, Math.ceil((frame.x + frame.width + hiddenX) / scale));
  const bottom = Math.min(photo.height, Math.ceil((frame.y + frame.height + hiddenY) / scale));
  if (right <= left || bottom <= top) throw new Error('Vùng ảnh trong khung chụp không hợp lệ.');

  return { originX: left, originY: top, width: right - left, height: bottom - top };
}
