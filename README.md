# VectorForge

A local image-to-SVG converter. Choose or paste a PNG, JPG, WebP or BMP image, inspect the before/after result, and download editable vector paths.

## Run

Requires Node 22+.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Both `/` and `/workbench` show the converter.

## Verify

```sh
npm run build
npm run test:converter
npm run test:quality
```

The conversion suite compiles the actual engine and uses resvg/sharp to render and compare exports, including transparency, small lettering, fine lines, paint order, and PNG/JPEG/WebP inputs.

## Workflow

Tracing runs in a browser worker. Images stay on the device. Inputs are limited to 25 MB, four megapixels, and 8,192 pixels per side. Low-resolution flat artwork is first enlarged up to 4× with alpha-safe interpolation. Source-aware colour recovery and interior coverage reduce fragments and seams. Genuine translucency and delicate collections of small marks retain native sampling when that is safer. The SVG keeps original dimensions, named colour groups, holes and path opacity. Use the optional finer trace for additional colours and a tighter curve fit.

The layer inspector describes exported colour groups; it is not a full path editor. Text becomes outlined shapes. Curved tracing approximates raster boundaries, so arbitrary images are not guaranteed pixel-perfect.

[Conversion quality and validation](docs/CONVERSION_QUALITY.md) · [Design review and attention map](docs/PRODUCT_REVIEW.md)
