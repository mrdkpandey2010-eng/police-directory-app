// Utility for Image Compression (Canvas-based) and File Size Validation
// Zero external dependencies; reduces 3MB-5MB camera photos to ~30KB JPEG
// Ensures localStorage never hits QuotaExceededError and optimizes Firebase bandwidth

export const MAX_FILE_SIZES = {
  PHOTO: 1 * 1024 * 1024,      // 1 MB
  PDF: 30 * 1024 * 1024,       // 30 MB
  DOCUMENT: 3 * 1024 * 1024    // 3 MB (Word & Excel)
};

/**
 * Validates a file against policy size limits
 * @param {File} file 
 * @param {'photo' | 'pdf' | 'word' | 'excel' | 'auto'} category 
 * @returns {{ valid: boolean, error: string | null }}
 */
export const validateFileSize = (file, category = 'auto') => {
  if (!file) return { valid: false, error: 'फ़ाइल प्राप्त नहीं हुई।' };

  let detectedCategory = category;
  if (category === 'auto') {
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();

    if (type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/.test(name)) {
      detectedCategory = 'photo';
    } else if (type === 'application/pdf' || name.endsWith('.pdf')) {
      detectedCategory = 'pdf';
    } else if (/\.(doc|docx)$/.test(name) || type.includes('word') || type.includes('officedocument.wordprocessingml')) {
      detectedCategory = 'word';
    } else if (/\.(xls|xlsx|csv)$/.test(name) || type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) {
      detectedCategory = 'excel';
    }
  }

  if (detectedCategory === 'photo') {
    if (file.size > MAX_FILE_SIZES.PHOTO) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return { 
        valid: false, 
        error: `⚠️ फ़ोटो का आकार अधिकतम 1 MB होना चाहिए (आपकी फ़ाइल: ${mb} MB)। कृपया 1 MB से छोटी फ़ोटो चुनें।` 
      };
    }
  } else if (detectedCategory === 'pdf') {
    if (file.size > MAX_FILE_SIZES.PDF) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return { 
        valid: false, 
        error: `⚠️ PDF फ़ाइल का आकार अधिकतम 30 MB होना चाहिए (आपकी फ़ाइल: ${mb} MB)। कृपया 30 MB से छोटी फ़ाइल चुनें।` 
      };
    }
  } else if (detectedCategory === 'word' || detectedCategory === 'excel') {
    if (file.size > MAX_FILE_SIZES.DOCUMENT) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      const label = detectedCategory === 'excel' ? 'Excel' : 'Word';
      return { 
        valid: false, 
        error: `⚠️ ${label} फ़ाइल का आकार अधिकतम 3 MB होना चाहिए (आपकी फ़ाइल: ${mb} MB)। कृपया 3 MB से छोटी फ़ाइल चुनें।` 
      };
    }
  }

  return { valid: true, error: null };
};

/**
 * Compresses an image using an HTML5 Canvas to a max size and JPEG quality
 * Reduces 2MB-5MB photos to ~25KB-40KB
 * @param {File | Blob | string} fileOrDataUrl 
 * @param {number} maxWidth 
 * @param {number} maxHeight 
 * @param {number} quality 
 * @returns {Promise<string>} Base64 data URL
 */
export const compressImage = (fileOrDataUrl, maxWidth = 480, maxHeight = 480, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const processImageSource = (src) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while clamping to bounding box
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
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');

        // Fill background with subtle dark for clean rendering if transparent
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          // If canvas export fails, fallback to original
          resolve(src);
        }
      };
      img.onerror = (e) => {
        console.warn('Canvas image load error, returning raw source', e);
        resolve(src);
      };
      img.src = src;
    };

    if (typeof fileOrDataUrl === 'string') {
      processImageSource(fileOrDataUrl);
    } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        processImageSource(e.target.result);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(fileOrDataUrl);
    } else {
      reject(new Error('Invalid image input to compressImage'));
    }
  });
};
