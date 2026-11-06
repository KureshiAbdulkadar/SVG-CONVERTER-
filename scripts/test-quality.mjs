import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { trace } from "vecline/core";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { compileEngine } from "./helpers/engine.mjs";
import { fixtures } from "./helpers/quality-fixtures.mjs";
const out = process.env.CONVERTER_TEST_OUTPUT;
if (out) mkdirSync(out, { recursive: true });
const raster = async (svg, width) => {
  const r = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render();
  return {
    data: new Uint8ClampedArray(
      await sharp(r.asPng()).ensureAlpha().raw().toBuffer(),
    ),
    width: r.width,
    height: r.height,
  };
};
function compare(a, b) {
  let error = 0,
    interiorLeaks = 0;
  const { data: s, width: w, height: h } = a,
    { data: d } = b;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++)
        for (const bg of [24, 255])
          error += Math.abs(
            (s[i + c] * s[i + 3]) / 255 +
              bg * (1 - s[i + 3] / 255) -
              (d[i + c] * d[i + 3]) / 255 -
              bg * (1 - d[i + 3] / 255),
          );
      if (
        s[i + 3] === 255 &&
        d[i + 3] < 250 &&
        x > 2 &&
        y > 2 &&
        x < w - 3 &&
        y < h - 3
      ) {
        let inside = true;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++)
            if (s[((y + dy) * w + x + dx) * 4 + 3] !== 255) inside = false;
        if (inside) interiorLeaks++;
      }
    }
  return { error: error / (w * h * 6), interiorLeaks };
}
const priorOptions = {
  colors: 64,
  alphaLevels: 32,
  tolerance: 0.25,
  fitError: 0.35,
  cornerAngle: 65,
  minArea: 0,
  subpixel: true,
  optimize: true,
  optimizeError: 0.18,
  precision: 3,
  background: false,
  primitives: false,
  refineIterations: 3,
};
const params = {
  preset: "balanced",
  imageType: "logo",
  colorCount: 64,
  removeBackground: false,
};
const engine = await compileEngine();
try {
  const rows = [];
  for (const [name, body] of fixtures) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="80">${body}</svg>`;
    const source = await raster(svg, 96),
      truth = await raster(svg, 355);
    const previous = trace(source, priorOptions).svg;
    const sourceCopy = source.data.slice();
    const result = await engine.vectorizeImage(source.data, 96, 80, params);
    const actual = await raster(result.svg, 355),
      old = await raster(previous, 355);
    assert.deepEqual(
      source.data,
      sourceCopy,
      "Conversion must not mutate source pixels",
    );
    const current = compare(truth, actual),
      prior = compare(truth, old);
    const preserved =
      name === "small-type" ||
      name === "small-type-opaque" ||
      name === "translucent";
    assert.ok(
      current.error <= prior.error + 0.02,
      `${name}: reconstruction regressed (${current.error} vs ${prior.error})`,
    );
    if (!preserved && name !== "small-type-opaque")
      assert.ok(
        current.error < prior.error * 0.6,
        `${name}: expected a substantial reconstruction improvement`,
      );
    if (name === "shared-colours")
      assert.ok(
        current.interiorLeaks < prior.interiorLeaks * 0.02,
        "Interior seams must fall by at least 98%",
      );
    if (name === "opaque-art")
      assert.equal(
        current.interiorLeaks,
        0,
        "Opaque art must have no interior alpha leaks",
      );
    if (!preserved)
      assert.equal(
        result.meta.upscaleFactor,
        4,
        "Small flat art must be enlarged before tracing",
      );
    else
      assert.equal(
        result.meta.upscaleFactor,
        1,
        "Preserve native sampling when enlargement would damage alpha",
      );
    rows.push({
      fixture: name,
      previousError: +prior.error.toFixed(3),
      currentError: +current.error.toFixed(3),
      previousLeaks: prior.interiorLeaks,
      currentLeaks: current.interiorLeaks,
      scale: result.meta.upscaleFactor,
      paths: result.meta.pathsCount,
      nodes: result.meta.nodesCount,
      ms: result.meta.processingTimeMs,
    });
    assert.equal(result.meta.width, 96);
    assert.equal(result.meta.height, 80);
    assert.ok(result.svg.includes('viewBox="0 0 96 80"'));
    assert.ok(!result.svg.includes("<image"));
    if (out) {
      writeFileSync(
        join(out, `${name}-previous.png`),
        new Resvg(previous, { fitTo: { mode: "width", value: 355 } })
          .render()
          .asPng(),
      );
      writeFileSync(
        join(out, `${name}-current.png`),
        new Resvg(result.svg, { fitTo: { mode: "width", value: 355 } })
          .render()
          .asPng(),
      );
      writeFileSync(
        join(out, `${name}-truth.png`),
        new Resvg(svg, { fitTo: { mode: "width", value: 355 } })
          .render()
          .asPng(),
      );
      writeFileSync(join(out, `${name}.svg`), result.svg);
    }
  }

  // The real preprocessor must be colour/alpha safe and respect a hard budget.
  const solid = {
    data: new Uint8ClampedArray([52, 91, 77, 255, 52, 91, 77, 255]),
    width: 2,
    height: 1,
  };
  const copy = solid.data.slice();
  const up = engine.upscaleForTracing(solid, 4);
  assert.equal(up.width, 8);
  assert.equal(up.height, 4);
  for (let i = 0; i < up.data.length; i += 4)
    assert.deepEqual([...up.data.slice(i, i + 4)], [52, 91, 77, 255]);
  assert.deepEqual(
    solid.data,
    copy,
    "Preprocessing must never mutate the upload",
  );
  const hidden = {
    data: new Uint8ClampedArray([255, 0, 0, 0, 0, 0, 255, 255]),
    width: 2,
    height: 1,
  };
  const edge = engine.upscaleForTracing(hidden, 4);
  for (let i = 0; i < edge.data.length; i += 4)
    if (edge.data[i + 3] > 0) {
      assert.equal(
        edge.data[i],
        0,
        "Hidden transparent RGB must not make a red halo",
      );
      assert.equal(edge.data[i + 2], 255);
    }
  const budget = engine.upscaleForTracing(
    { data: new Uint8ClampedArray(900 * 700 * 4), width: 900, height: 700 },
    4,
  );
  assert.ok(budget.width * budget.height <= 4_000_000);
  assert.throws(
    () =>
      engine.upscaleForTracing({
        data: new Uint8ClampedArray(4),
        width: 2,
        height: 1,
      }),
    /dimensions/,
  );
  assert.throws(() => engine.upscaleForTracing(solid, Infinity), /factor/);
  assert.throws(
    () =>
      engine.upscaleForTracing({
        data: new Uint8ClampedArray(4_000_001 * 4),
        width: 4_000_001,
        height: 1,
      }),
    /dimensions/,
  );
  // Distinct tiny accents are content, not noise. The grey pixel is near a
  // black shape but must not be mistaken for black/white antialiasing.
  const accentsSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><rect width="64" height="48" fill="white"/><rect x="40" y="8" width="16" height="32" fill="black"/><rect x="37" y="23" width="1" height="1" fill="#808080"/><rect x="6" y="5" width="1" height="1" fill="#ffc000"/></svg>';
  const accents = await raster(accentsSvg, 64),
    ink = engine.analyseArtwork(accents).palette;
  assert.ok(
    ink?.some((c) => c.r === 128 && c.g === 128 && c.b === 128),
    "Keep the single grey pixel",
  );
  assert.ok(
    ink?.some((c) => c.r === 255 && c.g === 192 && c.b === 0),
    "Keep the single yellow pixel",
  );
  const accentResult = await engine.vectorizeImage(
      accents.data,
      64,
      48,
      params,
    ),
    accentImage = await raster(accentResult.svg, 256);
  const grey = (94 * accentImage.width + 150) * 4,
    yellow = (22 * accentImage.width + 26) * 4;
  assert.ok(
    Math.abs(accentImage.data[grey] - 128) < 12,
    "The grey accent must survive the exported SVG",
  );
  assert.ok(
    accentImage.data[yellow] > 230 &&
      accentImage.data[yellow + 1] > 150 &&
      accentImage.data[yellow + 2] < 40,
    "The yellow accent must survive the exported SVG",
  );
  // Holes and narrow connections are checked on the delivered geometry.
  const bridgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><path fill="#204938" fill-rule="evenodd" d="M4 8h24v30H4zM10 14v18h12V14z"/><path fill="#204938" d="M27 22h10v2H27zM36 8h24v30H36z"/></svg>`;
  const bridgeSource = await raster(bridgeSvg, 64),
    bridgeResult = await engine.vectorizeImage(
      bridgeSource.data,
      64,
      48,
      params,
    ),
    bridge = await raster(bridgeResult.svg, 256);
  assert.equal(
    bridge.data[(92 * 256 + 64) * 4 + 3],
    0,
    "Preserve the counter/hole",
  );
  for (let x = 110; x < 148; x++)
    assert.ok(
      bridge.data[(92 * 256 + x) * 4 + 3] > 245,
      "Do not break the narrow bridge",
    );
  // Lossy raster formats and continuous-tone gradients keep working; smoothing
  // is never purchased by flattening real transparency or arbitrary colour ramps.
  const jpegSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="80"><rect width="96" height="80" fill="white"/>${fixtures[1][1]}</svg>`;
  const jpeg = await sharp(new Resvg(jpegSvg).render().asPng())
    .jpeg({ quality: 40 })
    .toBuffer();
  const decoded = await sharp(jpeg).ensureAlpha().raw().toBuffer();
  const jpegSource = {
    data: new Uint8ClampedArray(decoded),
    width: 96,
    height: 80,
  };
  const jpegResult = await engine.vectorizeImage(
    jpegSource.data,
    96,
    80,
    params,
  );
  const jpegCurrent = compare(
    await raster(jpegSvg, 355),
    await raster(jpegResult.svg, 355),
  );
  const jpegPrevious = compare(
    await raster(jpegSvg, 355),
    await raster(trace(jpegSource, priorOptions).svg, 355),
  );
  assert.equal(jpegCurrent.interiorLeaks, 0);
  assert.ok(
    jpegCurrent.error <= jpegPrevious.error + 0.15,
    "Compressed artwork must not suffer a significant regression",
  );
  rows.push({
    fixture: "compressed-jpeg",
    previousError: +jpegPrevious.error.toFixed(3),
    currentError: +jpegCurrent.error.toFixed(3),
    previousLeaks: jpegPrevious.interiorLeaks,
    currentLeaks: jpegCurrent.interiorLeaks,
    scale: jpegResult.meta.upscaleFactor,
    paths: jpegResult.meta.pathsCount,
    nodes: jpegResult.meta.nodesCount,
    ms: jpegResult.meta.processingTimeMs,
  });
  if (out) {
    const previousJpeg = trace(jpegSource, priorOptions).svg;
    for (const [suffix, svg] of [
      ["previous", previousJpeg],
      ["current", jpegResult.svg],
      ["truth", jpegSvg],
    ])
      writeFileSync(
        join(out, `compressed-jpeg-${suffix}.png`),
        new Resvg(svg, { fitTo: { mode: "width", value: 355 } })
          .render()
          .asPng(),
      );
    writeFileSync(join(out, "compressed-jpeg.svg"), jpegResult.svg);
  }
  const gradient = await raster(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="80"><defs><linearGradient id="g"><stop stop-color="#173e77"/><stop offset="1" stop-color="#f9c367"/></linearGradient></defs><rect width="96" height="80" fill="url(#g)"/></svg>',
    96,
  );
  assert.equal(
    engine.analyseArtwork(gradient).palette,
    undefined,
    "Do not force a gradient into guessed flat inks",
  );
  const gradientResult = await engine.vectorizeImage(
    gradient.data,
    96,
    80,
    params,
  );
  assert.ok(
    gradientResult.palette.length > 20,
    "Retain continuous-tone colour variation",
  );
  await raster(gradientResult.svg, 355);
  console.log(
    "PASS: alpha-safe upscaling; memory cap; source immutability; tiny accents; holes; bridges; JPEG; gradients; dimensions; reconstruction and seam regressions.",
  );
  console.table(rows);
  if (out)
    writeFileSync(join(out, "metrics.json"), JSON.stringify(rows, null, 2));
} finally {
  engine.close();
}
