function escapeSvgText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function collectDocumentCssText(): string {
  const cssChunks: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      cssChunks.push(
        Array.from(rules)
          .map((rule) => rule.cssText)
          .join("\n")
      );
    } catch {
      // Some browser-managed sheets are intentionally unreadable. Ignore them.
    }
  }

  return cssChunks.join("\n");
}

function replaceCanvasesWithDataUrls(clonedRoot: HTMLElement, dataUrls: string[]) {
  const clonedCanvases = Array.from(clonedRoot.querySelectorAll("canvas"));
  dataUrls.forEach((dataUrl, index) => {
    const clonedCanvas = clonedCanvases[index];
    if (!clonedCanvas) return;

    const image = document.createElement("img");
    image.setAttribute("src", dataUrl);
    image.setAttribute("width", clonedCanvas.getAttribute("width") ?? "");
    image.setAttribute("height", clonedCanvas.getAttribute("height") ?? "");
    image.setAttribute("style", clonedCanvas.getAttribute("style") ?? "");
    image.className = clonedCanvas.className;
    image.alt = "";
    clonedCanvas.replaceWith(image);
  });
}

function replaceCanvasWithImages(sourceRoot: HTMLElement, clonedRoot: HTMLElement) {
  const sourceCanvases = Array.from(sourceRoot.querySelectorAll("canvas"));
  replaceCanvasesWithDataUrls(
    clonedRoot,
    sourceCanvases.map((canvas) => canvas.toDataURL("image/png"))
  );
}

export function captureCanvasDataUrls(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll("canvas")).map((canvas) => canvas.toDataURL("image/png"));
}

export async function capturePanelAsPng(element: HTMLElement, scale = 2): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const canvasDataUrls = captureCanvasDataUrls(element);
  await rasterizeElementToCanvas({ element, canvas, scale, canvasDataUrls });
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/png"));
}

export async function rasterizeElementToCanvas(params: {
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  scale: number;
  canvasDataUrls?: string[];
}): Promise<{ width: number; height: number }> {
  const { element, canvas, scale, canvasDataUrls } = params;
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  const clonedRoot = element.cloneNode(true) as HTMLElement;
  clonedRoot.setAttribute(
    "style",
    `${clonedRoot.getAttribute("style") ?? ""};width:${width}px;height:${height}px;box-sizing:border-box;`
  );
  if (canvasDataUrls) {
    replaceCanvasesWithDataUrls(clonedRoot, canvasDataUrls);
  } else {
    replaceCanvasWithImages(element, clonedRoot);
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <div style="width:${width}px;height:${height}px;overflow:hidden;background:transparent;">
            <style>${escapeSvgText(collectDocumentCssText())}</style>
            ${new XMLSerializer().serializeToString(clonedRoot)}
          </div>
        </div>
      </foreignObject>
    </svg>
  `;

  // const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  const url = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.crossOrigin = "anonymous";
      nextImage.alt = "";
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = (s) => reject(new Error("Failed to render export frame", { cause: s }));
      nextImage.src = url;
    });

    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to create export canvas context");
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);
    context.restore();

    return { width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
