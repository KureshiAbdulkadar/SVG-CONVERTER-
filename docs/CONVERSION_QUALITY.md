# SVG conversion quality

This revision changes the conversion engine and its tests. The product interface and upload → compare → download workflow are retained.

[Open before/after comparisons](quality-comparison.html) · [Raw measurements](quality/metrics.json)

## Pipeline

1. Analyse the original image before resizing. Recover a small coherent ink palette from flat regions, with local checks to preserve tiny accents instead of assuming every intermediate shade is noise.
2. For suitable low-resolution flat artwork, enlarge the working image up to **4× per dimension**. Use centred, premultiplied-alpha interpolation: hidden RGB behind transparency contributes nothing, and the convex kernel cannot introduce sharpening overshoot or ringing. The working image is limited to four megapixels. Large sources already at useful resolution are not enlarged unnecessarily.
3. Trace on the finer grid with fitting tolerances appropriate to that grid. Keep small regions; do not globally delete particles or close gaps, since these operations can destroy legitimate details and counters.
4. Prevent transparent seams inside opaque artwork. Fully opaque inputs get a continuous base. Transparent flat artwork gets a coverage path limited to an eroded, fully opaque interior; holes and genuine partial-alpha areas remain excluded. Continuous-tone opaque inputs additionally use a narrow same-colour overlap to reduce gaps between quantized fills.
5. Scale the generated geometry back through SVG group transforms. Original width, height and viewBox remain unchanged. Keep editable colour groups, path opacity, paint order and optional stroke attributes in the downloaded SVG.

The preprocessor runs in the existing worker, reports real processing stages and remains cancellable. No image is sent to an external service. This is deterministic interpolation and tracing, not a neural super-resolution model.

## Conservative cases

Unconditional enlargement tested worse on true translucency and fine lettering. Alpha gradients can turn into many artificial bands, and reduction of antialiased lettering shades can thicken stems. Those cases retain native sampling and the previous fine-detail fitting parameters. A geometry guard protects collections of small disconnected marks; it does not recognize or replace fonts.

The old sharpen/upscale implementation is retained only for the historical regression benchmark. It is not used by the live converter.

## Measured results

The quality suite compares against the immediately preceding 64-colour, native-resolution converter, rather than the older 16-colour implementation. A 96 × 80 raster is converted and its SVG rendered at width 355, then compared against the known vector reference at that size. The non-integer scale exposes seams which integer magnification can hide.

RGB error is averaged over both white and dark backgrounds, on a 0–255 scale. Interior leaks are pixels which the reference says are fully opaque at least two rendered pixels from transparency, but whose output alpha falls below 250. Lower is better. The low-quality JPEG case is encoded at quality 40 before conversion.

| Fixture                              | Previous error | Updated error | Interior leaks, before → after |
| ------------------------------------ | -------------: | ------------: | -----------------------------: |
| Curved mark and counter              |          1.464 |         0.378 |                          0 → 0 |
| Touching colours and a narrow accent |          2.245 |         0.794 |                      2,365 → 8 |
| Fine connected linework              |          2.286 |         0.841 |                          0 → 0 |
| Delicate lettering on transparency   |          2.575 |         2.575 |                          0 → 0 |
| Opaque illustration                  |          1.783 |         0.816 |                      2,733 → 0 |
| Genuine translucency                 |          0.471 |         0.471 |                          0 → 0 |
| Small lettering on white             |          5.935 |         5.679 |                      4,100 → 0 |
| Compressed JPEG artwork              |         13.210 |        10.095 |                     18,951 → 0 |

The curved mark, touching-colour artwork, thin connections and opaque illustration show roughly 54–74% lower reconstruction error. Interior leaks fall from 2,365 to 8 on the touching-colour fixture (over 99% fewer). Opaque illustration, lettering on white and compressed JPEG fixtures have zero interior alpha leaks. Delicate transparent lettering and genuine translucency retain the prior error exactly.

These controlled fixtures are regression evidence, not a broad benchmark, a guarantee of zero defects on arbitrary input, or proof of superiority over another converter. Source-size pixel matching and reconstruction of smooth curves at enlargement are different objectives; this suite measures both through two complementary commands.

## Verification

- `npm run test:quality`: enlarged reconstruction, interior seams, alpha-safe sampling, hidden-RGB halo prevention, source immutability, allocation limits, isolated one-pixel accents, counters/holes, narrow bridges, JPEG and gradients.
- `npm run test:converter`: the existing historical fidelity suite, SVG rendering, PNG/JPEG/WebP input, dimensions, opacity, transparent holes and paint order.
- `npm run build`: production compilation and TypeScript.
- Chrome against the optimized production build: sample conversion, actual file upload and repeated upload, worker completion/cancellation, finer retry, views/layers/zoom, SVG XML parsing, downloaded file saved to disk, clipboard error recovery and mobile layout regression checks.

To regenerate the comparison measurements and image files:

```sh
CONVERTER_TEST_OUTPUT=/private/tmp/vectorforge-new-quality npm run test:quality
```

## Remaining limits

Upsampling improves sampling density; it cannot infer missing source detail with certainty. Thin marks and real transparency need different treatment from flat opaque artwork. Some residual near-edge seams remain in the touching-colour fixture, and continuous-tone images are still approximated with a finite palette. SVGs were rendered with resvg and Chrome; Illustrator-specific import behavior was not exercised in Illustrator.
