// Redimensiona e comprime imagem no navegador (lado maior máx. 1280px, JPEG 0.8)
export async function resizeImageForAI(file: File): Promise<File> {
  const MAX_DIMENSION = 1280;
  const JPEG_QUALITY = 0.8;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(new Error('Não foi possível abrir a imagem selecionada.'));
      el.src = objectUrl;
    });

    const { naturalWidth: width, naturalHeight: height } = img;
    if (!width || !height) {
      throw new Error('Imagem inválida ou vazia.');
    }

    const longestSide = Math.max(width, height);
    const scale = longestSide > MAX_DIMENSION ? MAX_DIMENSION / longestSide : 1;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Navegador sem suporte para processamento de imagem.');
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Falha ao comprimir imagem.'));
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    });

    return new File([blob], 'nota.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
