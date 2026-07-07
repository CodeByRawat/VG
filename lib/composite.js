const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 1080;

// gpt-image-1 has no true 16:9 size option, so every returned image is
// padded client-side onto an exact white 1920x1080 canvas, scaled to
// fit the target height. Returns a PNG data URL — this is the only
// version ever shown, downloaded, or zipped.
export function padImageTo16x9(base64Png) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

      const scale = OUTPUT_HEIGHT / img.naturalHeight;
      const drawWidth = img.naturalWidth * scale;
      const x = (OUTPUT_WIDTH - drawWidth) / 2;
      ctx.drawImage(img, x, 0, drawWidth, OUTPUT_HEIGHT);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load generated image for compositing'));
    img.src = `data:image/png;base64,${base64Png}`;
  });
}

export function dataUrlToBase64(dataUrl) {
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}
