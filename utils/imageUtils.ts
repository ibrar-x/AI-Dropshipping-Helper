




// FIX: Removed unused 'ExportBundle' type which is not exported from types.


export const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = error => reject(error);
  });
};

export const downloadImage = (dataUrl: string, filename: string, format: 'jpeg' | 'png' | 'webp' = 'jpeg') => {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Could not get canvas context for image download.");
      // Fallback to direct download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${filename}.png`; // Guess a format
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    ctx.drawImage(img, 0, 0);
    
    const mimeType = `image/${format}`;
    const quality = format === 'jpeg' ? 0.92 : undefined;
    const convertedDataUrl = canvas.toDataURL(mimeType, quality);

    const link = document.createElement('a');
    link.href = convertedDataUrl;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  img.onerror = () => {
      console.error("Failed to load image for format conversion.");
      alert("Could not download image in the selected format. Please try another format.");
  };
  img.src = dataUrl;
};


export const dataURLtoBase64 = (dataUrl: string): { base64: string; mimeType: string } => {
  const parts = dataUrl.split(',');
  const mimeTypeMatch = parts[0].match(/:(.*?);/);
  if (!mimeTypeMatch || !mimeTypeMatch[1]) {
    throw new Error('Invalid data URL');
  }
  const mimeType = mimeTypeMatch[1];
  const base64 = parts[1];
  return { base64, mimeType };
};

export const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = dataUrl;
  });
};

export const ensureSupportedImageFormat = (file: File): Promise<{ base64: string, mimeType: string }> => {
    // Gemini API supports PNG, JPEG, WEBP, HEIC, HEIF. It does not support AVIF.
    const UNSUPPORTED_MIME_TYPES = ['image/avif'];

    if (!UNSUPPORTED_MIME_TYPES.includes(file.type.toLowerCase())) {
        // If the format is supported, just encode it to base64
        return fileToBase64(file);
    }

    // If the format is not supported, convert it to JPEG
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target || typeof event.target.result !== 'string') {
                return reject(new Error('Failed to read file for conversion.'));
            }
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context for image conversion.'));
                }
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95); // Convert to high-quality JPEG
                const { base64, mimeType } = dataURLtoBase64(dataUrl);
                resolve({ base64, mimeType });
            };
            img.onerror = () => reject(new Error(`Failed to load image for conversion.`));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error(`Failed to read file for conversion.`));
    });
};

export const createThumbnail = (dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context for thumbnail creation.'));
      }
      ctx.drawImage(img, 0, 0, width, height);
      
      // Use JPEG for smaller size, with a reasonable quality.
      resolve(canvas.toDataURL('image/jpeg', 0.8)); 
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = dataUrl;
  });
};

export const createHighlightImage = (baseImageDataUrl: string, maskCanvas: HTMLCanvasElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.onload = () => {
      const highlightCanvas = document.createElement('canvas');
      highlightCanvas.width = baseImg.width;
      highlightCanvas.height = baseImg.height;
      const ctx = highlightCanvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not get canvas context for highlight image.'));

      // 1. Draw base image
      ctx.drawImage(baseImg, 0, 0);

      // 2. Prepare the overlay color in a temporary canvas
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = maskCanvas.width;
      overlayCanvas.height = maskCanvas.height;
      const overlayCtx = overlayCanvas.getContext('2d');
      if (!overlayCtx) return reject(new Error('Could not get canvas context for overlay.'));
      
      overlayCtx.fillStyle = 'rgba(74, 222, 128, 0.7)'; // Semi-transparent green
      overlayCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      // 3. Use the mask to clip the overlay color
      overlayCtx.globalCompositeOperation = 'destination-in';
      overlayCtx.drawImage(maskCanvas, 0, 0);

      // 4. Draw the clipped, colored overlay onto the main highlight canvas, scaling to fit the base image
      ctx.drawImage(overlayCanvas, 0, 0, baseImg.width, baseImg.height);

      resolve(highlightCanvas.toDataURL('image/jpeg', 0.9));
    };
    baseImg.onerror = (err) => reject(err);
    baseImg.src = baseImageDataUrl;
  });
};

export const compositeImageWithLogo = (baseImageSrc: string, logoSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const baseImg = new Image();
        baseImg.crossOrigin = 'anonymous';
        baseImg.onload = () => {
            const logoImg = new Image();
            logoImg.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = baseImg.width;
                canvas.height = baseImg.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('Could not get canvas context');
                
                ctx.drawImage(baseImg, 0, 0);

                // Scale logo to be 15% of the base image width, maintaining aspect ratio
                const logoMaxWidth = baseImg.width * 0.15;
                const scale = logoMaxWidth / logoImg.width;
                const logoWidth = logoImg.width * scale;
                const logoHeight = logoImg.height * scale;
                
                // Position at bottom right with padding
                const padding = baseImg.width * 0.02;
                const x = baseImg.width - logoWidth - padding;
                const y = baseImg.height - logoHeight - padding;

                ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
                resolve(canvas.toDataURL('image/png'));
            };
            logoImg.onerror = reject;
            logoImg.src = logoSrc;
        };
        baseImg.onerror = reject;
        baseImg.src = baseImageSrc;
    });
};

export const compositeOntoSolidColor = (noBgImageSrc: string, color: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for compositing.'));
            }
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => reject(err);
        img.src = noBgImageSrc;
    });
};

export const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left',
  style: 'fill' | 'stroke' = 'fill',
  lineWidth: number = 1
) => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.textAlign = align;
  ctx.lineWidth = lineWidth;

  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  let currentY = y;
  for(const l of lines) {
    if (style === 'fill') {
        ctx.fillText(l.trim(), x, currentY);
    } else {
        ctx.strokeText(l.trim(), x, currentY);
    }
    currentY += lineHeight;
  }
};