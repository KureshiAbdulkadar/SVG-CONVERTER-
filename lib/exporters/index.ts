import { jsPDF } from 'jspdf';
import { VectorLayer, ExportFormat, RGBColor } from '../vector-engine/types';
import { composeSvg, minifySvgString } from '../vector-engine/svg-generator';
import { hexToRgb } from '../vector-engine/perceptual-color';

export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  width: number;
  height: number;
  layers: VectorLayer[];
  includeOriginalRef?: boolean;
  flattenTransforms?: boolean;
}

// Convert layers to Encapsulated PostScript (EPS 3.0) format
export function generateEps(layers: VectorLayer[], width: number, height: number): string {
  let eps = `%!PS-Adobe-3.0 EPSF-3.0
%%Creator: VectorForge Vector Engine
%%Title: Exported Vector
%%BoundingBox: 0 0 ${Math.round(width)} ${Math.round(height)}
%%HiResBoundingBox: 0 0 ${width} ${height}
%%Pages: 1
%%EndComments
%%Page: 1 1
gsave
`;

  for (const layer of layers) {
    if (!layer.visible) continue;

    const rgb: RGBColor = hexToRgb(layer.color);
    const r = (rgb.r / 255).toFixed(4);
    const g = (rgb.g / 255).toFixed(4);
    const b = (rgb.b / 255).toFixed(4);

    eps += `\n% Layer: ${layer.name}\n${r} ${g} ${b} setrgbcolor\n`;

    for (const path of layer.paths) {
      if (path.curves && path.curves.length > 0) {
        // EPS coordinate system origin is bottom-left, flip Y
        const startY = height - path.curves[0].p0.y;
        eps += `newpath\n${path.curves[0].p0.x.toFixed(2)} ${startY.toFixed(2)} moveto\n`;

        for (const curve of path.curves) {
          const c1y = height - curve.c1.y;
          const c2y = height - curve.c2.y;
          const p1y = height - curve.p1.y;
          eps += `${curve.c1.x.toFixed(2)} ${c1y.toFixed(2)} ${curve.c2.x.toFixed(2)} ${c2y.toFixed(2)} ${curve.p1.x.toFixed(2)} ${p1y.toFixed(2)} curveto\n`;
        }
        eps += `closepath\nfill\n`;
      }
    }
  }

  eps += `\ngrestore\nshowpage\n%%EOF\n`;
  return eps;
}

// Convert vector paths to AutoCAD DXF (R12 ASCII format)
export function generateDxf(layers: VectorLayer[], width: number, height: number): string {
  let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
${layers.length}
`;

  layers.forEach((l, idx) => {
    dxf += `0\nLAYER\n2\nLAYER_${idx}\n70\n0\n62\n7\n6\nCONTINUOUS\n`;
  });

  dxf += `0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;

  layers.forEach((layer, lIdx) => {
    if (!layer.visible) return;

    for (const path of layer.paths) {
      if (path.points && path.points.length > 1) {
        dxf += `0\nPOLYLINE\n8\nLAYER_${lIdx}\n66\n1\n70\n1\n`;

        for (const p of path.points) {
          const y = height - p.y;
          dxf += `0\nVERTEX\n8\nLAYER_${lIdx}\n10\n${p.x.toFixed(2)}\n20\n${y.toFixed(2)}\n30\n0.0\n`;
        }

        dxf += `0\nSEQEND\n`;
      }
    }
  });

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

// Generate PDF vector document using jsPDF
export async function generatePdf(svgString: string, width: number, height: number): Promise<Blob> {
  const orientation = width > height ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: [width, height],
  });

  // Render SVG to Canvas then embed at high resolution
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, width, height);
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 0, 0, width, height);
        const pdfBlob = doc.output('blob');
        URL.revokeObjectURL(url);
        resolve(pdfBlob);
      } else {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context not available'));
      }
    };

    img.onerror = err => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

// High-DPI PNG 2x exporter
export async function generatePng2x(svgString: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Failed to generate PNG blob'));
        }, 'image/png');
      } else {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context error'));
      }
    };

    img.onerror = err => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

// Master exporter function
export async function exportVectorFile(options: ExportOptions): Promise<{ blob: Blob; filename: string }> {
  const { format, filename, width, height, layers } = options;
  const baseName = filename.replace(/\.[^/.]+$/, '');

  switch (format) {
    case 'svg': {
      const svg = composeSvg(layers, { width, height, includeMetadata: true, figmaCompatible: false });
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      return { blob, filename: `${baseName}.svg` };
    }
    case 'svg-min': {
      const svg = composeSvg(layers, { width, height, minify: true });
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      return { blob, filename: `${baseName}.min.svg` };
    }
    case 'figma-svg': {
      const svg = composeSvg(layers, { width, height, includeMetadata: true, figmaCompatible: true });
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      return { blob, filename: `${baseName}-figma.svg` };
    }
    case 'pdf': {
      const svg = composeSvg(layers, { width, height });
      const blob = await generatePdf(svg, width, height);
      return { blob, filename: `${baseName}.pdf` };
    }
    case 'eps': {
      const eps = generateEps(layers, width, height);
      const blob = new Blob([eps], { type: 'application/postscript' });
      return { blob, filename: `${baseName}.eps` };
    }
    case 'dxf': {
      const dxf = generateDxf(layers, width, height);
      const blob = new Blob([dxf], { type: 'application/dxf' });
      return { blob, filename: `${baseName}.dxf` };
    }
    case 'png-2x': {
      const svg = composeSvg(layers, { width, height });
      const blob = await generatePng2x(svg, width, height);
      return { blob, filename: `${baseName}@2x.png` };
    }
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// Helper to trigger browser download of a Blob
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
