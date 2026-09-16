import { NextRequest, NextResponse } from 'next/server';
import { generateEps, generateDxf } from '../../../lib/exporters';
import { minifySvgString } from '../../../lib/vector-engine/svg-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { format, svg, layers, width = 500, height = 500 } = body;

    if (format === 'eps' && layers) {
      const eps = generateEps(layers, width, height);
      return new NextResponse(eps, {
        headers: {
          'Content-Type': 'application/postscript',
          'Content-Disposition': 'attachment; filename="export.eps"',
        },
      });
    }

    if (format === 'dxf' && layers) {
      const dxf = generateDxf(layers, width, height);
      return new NextResponse(dxf, {
        headers: {
          'Content-Type': 'application/dxf',
          'Content-Disposition': 'attachment; filename="export.dxf"',
        },
      });
    }

    if (format === 'svg-min' && svg) {
      const minSvg = minifySvgString(svg);
      return new NextResponse(minSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': 'attachment; filename="export.min.svg"',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
