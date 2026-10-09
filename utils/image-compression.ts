/**
 * Utilidad de compresión y optimización de imágenes en el cliente (Browser HTML5 Canvas).
 * Reduce drásticamente el peso de imágenes tomadas con smartphones o cámaras digitales
 * antes de enviarlas por la red, previniendo errores HTTP 413 (Payload Too Large).
 */

export interface CompressionOptions {
  maxDimension?: number; // Ancho o alto máximo en píxeles (default: 1920)
  quality?: number; // Calidad de compresión JPEG/WebP 0.0 - 1.0 (default: 0.82)
  maxSizeBytes?: number; // Umbral a partir del cual comprimir (default: 1 MB)
}

/**
 * Comprime un archivo de imagen si supera el umbral de tamaño o resolución.
 * Si el archivo es un PDF u otro tipo no gráfico, lo devuelve sin alterar.
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxDimension = 1920,
    quality = 0.82,
    maxSizeBytes = 1024 * 1024, // 1 MB
  } = options;

  // Solo procesar archivos de imagen
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Si la imagen es SVG o GIF animado, no comprimir con canvas
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  // Si ya es menor al umbral y no es gigantesca, mantener
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Escalar proporcionalmente si excede maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // Dibujar con suavizado
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Determinar formato de salida: mantener webp o convertir a jpeg para compatibilidad
          const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                // Si la compresión no redujo el peso, retornar original
                resolve(file);
                return;
              }

              // Crear nuevo File con el nombre y extensión adecuada
              let newFileName = file.name;
              if (outputType === 'image/jpeg' && !/\.(jpe?g)$/i.test(newFileName)) {
                newFileName = newFileName.replace(/\.[^.]+$/, '') + '.jpg';
              }

              const compressedFile = new File([blob], newFileName, {
                type: outputType,
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            },
            outputType,
            quality
          );
        } catch (e) {
          console.warn('[ImageCompression] Error al procesar imagen, usando archivo original:', e);
          resolve(file);
        }
      };

      img.onerror = () => {
        resolve(file);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Formatea bytes a una cadena legible (KB / MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
