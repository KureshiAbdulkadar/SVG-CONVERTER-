# VectorForge interface and conversion review

This records the interface milestone. For the subsequent conversion-engine improvements and current output behavior, see [Conversion quality](CONVERSION_QUALITY.md).

The core workflow stays upload → compare → download. This revision replaces the dark glowing interface with a light artboard, a restrained frame, self-hosted IBM Plex Sans, and a single red primary action. No account, onboarding modal or settings panel is required.

## Interface

- One primary upload button, drop support, clipboard paste, and two working sample images.
- Result preview with original/SVG/comparison views, a keyboard-operable divider, zoom and scrolling.
- An optional colour-layer inspector, with actual exported groups and path counts.
- One optional finer trace, with more colours and tighter curve fitting.
- Conversion cancellation, format/size/dimension checks, actionable errors, and clipboard failure feedback.
- Local font and worker processing; image conversion does not send files to a service.

[Desktop](review/desktop.jpg) · [Tablet](review/tablet.jpg) · [Phone](review/mobile.jpg) · [Result](review/result.png) · [Phone layers](review/mobile-layers.png)

## Attention and eye review

[Open the heuristic attention map](review/attention.html). This is a labeled design overlay, **not measured eye tracking, user analytics or a simulated scientific heatmap**. No analytics was installed.

The intended attention order is task identification → upload action → result inspection → download. The artwork may win the first glance; its role is to explain the transformation. Mobile places the action before the specimen. The result uses the same primary colour exclusively for download. Help, sample files and precision retry have secondary emphasis.

Visual inspection covered 1440, 768, 390 and 320 pixel widths, plus portrait image proportions. The final automated visual inspection reported no findings at 1440/768/390. The transparency checkerboard uses a small tiled SVG on the actual artboard.

## Conversion changes

- Source pixels are traced directly. Mandatory resizing and sharpening were removed; they changed colours and small edge features before tracing.
- Default palette increased from 16 to 64 colours, with 128 for the optional finer trace.
- Smaller curve-fit error, three-digit path precision, preserved partial transparency, and no removal of tiny colour regions.
- Named colour groups retain painter order. They are editable colour layers, not AI-recognized objects.
- SVG declares its Inkscape namespace and retains per-path fill opacity and hole fill rules.
- Original width, height and viewBox are preserved.
- CPU work runs in a transferable-buffer Web Worker. Cancellation terminates the worker, and stale callbacks cannot replace a newer state.
- A four-megapixel / 8,192-pixel-side limit prevents unbounded input allocation during tracing.

## Fidelity tests

`npm run test:converter` compiles the real engine, rasterizes source fixtures, converts them, renders the delivered SVG, and compares pixels over both white and dark backgrounds. Rendering is decoded to straight RGBA to match browser canvas input. PNG, JPEG and WebP encoding/decoding are also exercised.

The reference recreates the prior default pipeline: sharpening/upscaling, 16 colours, the previous curve tolerance, removal of two-pixel regions, and discarded path opacity. Both outputs use the corrected namespace so the old SVG can be rendered for comparison.

The metric is mean absolute RGB error, in levels from 0–255, averaged over white and dark backgrounds. Smaller is better. These are small synthetic fixtures, not a representative performance benchmark or a promise for arbitrary files.

| Fixture             | Previous error | New error | Error reduction |
| ------------------- | -------------: | --------: | --------------: |
| Brand colours       |          2.485 |     0.095 |           96.2% |
| Transparent holes   |          2.058 |     0.000 |          100.0% |
| Partial opacity     |         46.671 |     0.130 |           99.7% |
| Fine lines          |          1.511 |     1.206 |           20.2% |
| Small lettering     |          3.583 |     0.096 |           97.3% |
| Colour illustration |          1.177 |     0.385 |           67.3% |

Source and result PNGs are saved in `docs/review/` for visual comparison. To regenerate a fixture archive: `CONVERTER_TEST_OUTPUT=/private/tmp/vectorforge-quality npm run test:converter`.

Tests also assert output dimensions, actual editable geometry (no embedded bitmap), preserved transparent holes, partial alpha, empty transparent input, group membership, paint order, and successful SVG rendering.

## Browser and build validation

Verified in Chrome against both development and optimized production builds:

- Sample conversion and real file-input upload, including selecting the same filename again.
- Worker completion, original/SVG views, layer disclosure, zoom/reset and keyboard comparison.
- A downloaded SVG saved to disk, plus browser XML parsing with no parser errors.
- Finer-trace retry and conversion cancellation.
- Invalid file type and oversized-dimension errors, followed by recovery.
- Denied clipboard access with visible recovery instructions.
- Tall-artwork aspect ratio, 320/390 pixel overflow checks, and `/workbench` route parity.
- No JavaScript exceptions during the exercised flow.

`npm run build`, TypeScript and `git diff --check` pass.

## Limits

Curved tracing approximates raster boundaries. Fine lines still show measurable error, photographs are reduced to a finite palette, and very soft alpha edges may differ. Tiny text remains outlined geometry rather than editable typography. More precision can increase file size and processing time.

The SVG was tested with Chrome and resvg. Illustrator, Inkscape and Figma import were not exercised in those applications; their compatibility should be checked with the user's own artwork before making application-specific guarantees. No claim of universal pixel-perfect conversion is made.
