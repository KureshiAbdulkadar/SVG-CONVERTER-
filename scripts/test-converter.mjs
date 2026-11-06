// Node 22+. Compiles the actual TypeScript engine and renders its exported SVGs.
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  symlinkSync,
  rmSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { trace } from "vecline/core";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const root = resolve(".");
const temp = mkdtempSync(join(tmpdir(), "vectorforge-test-"));
const output = process.env.CONVERTER_TEST_OUTPUT;
if (output) mkdirSync(output, { recursive: true });
try {
  const compile = spawnSync(
    join(root, "node_modules/.bin/tsc"),
    [
      "--ignoreConfig",
      "--target",
      "es2022",
      "--module",
      "esnext",
      "--moduleResolution",
      "bundler",
      "--ignoreDeprecations",
      "6.0",
      "--esModuleInterop",
      "--skipLibCheck",
      "--outDir",
      temp,
      "lib/vector-engine/index.ts",
    ],
    { encoding: "utf8" },
  );
  assert.equal(compile.status, 0, compile.stdout + compile.stderr);
  writeFileSync(join(temp, "package.json"), '{"type":"module"}');
  for (const file of readdirSync(temp).filter((file) => file.endsWith(".js"))) {
    const path = join(temp, file);
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace(
        /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,
        "$1$2.js$3",
      ),
    );
  }
  symlinkSync(join(root, "node_modules"), join(temp, "node_modules"), "dir");
  const { vectorizeImage } = await import(join(temp, "index.js"));
  const { enhanceAndUpscaleImage } = await import(join(temp, "upscaler.js"));
  const { composeSvg } = await import(join(temp, "svg-generator.js"));
  const params = {
    preset: "balanced",
    imageType: "logo",
    colorCount: 64,
    detail: 0.8,
    smoothness: 0.45,
    cornerSharpness: 0.8,
    noiseRemoval: 0,
    removeBackground: false,
  };
  const fixture = (body, w = 180, h = 150) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`;
  const fixtures = [
    [
      "brand-colours",
      fixture(
        '<rect width="180" height="150" fill="#fff"/><path d="M20 120L90 18L160 120Z" fill="#c53535"/><circle cx="90" cy="83" r="20" fill="#235e49"/><rect x="15" y="133" width="150" height="2" fill="#202a25"/>',
      ),
    ],
    [
      "transparent-holes",
      fixture(
        '<path fill="#e64b35" fill-rule="evenodd" d="M20 20h140v110H20z M60 50v50h60V50z"/><circle cx="30" cy="30" r="3" fill="#fff"/>',
      ),
    ],
    [
      "partial-opacity",
      fixture(
        '<rect x="10" y="10" width="160" height="130" fill="#2472a4" fill-opacity=".35"/><circle cx="90" cy="75" r="42" fill="#d02f44" fill-opacity=".65"/>',
      ),
    ],
    [
      "fine-lines",
      fixture(
        '<g fill="none" stroke="#243a31" stroke-width="1.5"><path d="M20 120C45 20 90 145 160 20"/><circle cx="90" cy="70" r="40"/><path d="M12 135h155"/></g><rect x="140" y="125" width="2" height="2" fill="#c53535"/>',
      ),
    ],
    [
      "small-lettering",
      fixture(
        '<rect width="180" height="150" fill="white"/><text x="15" y="65" font-family="sans-serif" font-size="26" font-weight="bold">VECTOR</text><text x="15" y="90" font-family="sans-serif" font-size="12">Small details matter.</text>',
      ),
    ],
    [
      "colour-illustration",
      fixture(
        '<rect width="180" height="150" fill="#f0dfb3"/><path d="M0 90L45 30L100 110L140 60L180 100V150H0Z" fill="#345b4d"/><circle cx="135" cy="30" r="18" fill="#cf6d41"/><path d="M0 120Q90 60 180 130V150H0Z" fill="#799b6c"/>',
      ),
    ],
  ];
  const render = async (svg, width, height) => {
    const image = new Resvg(svg, {
      fitTo: { mode: "width", value: width },
    }).render();
    assert.equal(image.height, height);
    // resvg's direct pixel buffer is premultiplied; canvas ImageData is straight RGBA.
    const data = await sharp(image.asPng()).ensureAlpha().raw().toBuffer();
    return new Uint8ClampedArray(data);
  };
  const error = (a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i += 4)
      for (let c = 0; c < 3; c++) {
        const whiteA = (a[i + c] * a[i + 3]) / 255 + 255 - a[i + 3],
          whiteB = (b[i + c] * b[i + 3]) / 255 + 255 - b[i + 3];
        const darkA = (a[i + c] * a[i + 3]) / 255 + 24 * (1 - a[i + 3] / 255),
          darkB = (b[i + c] * b[i + 3]) / 255 + 24 * (1 - b[i + 3] / 255);
        sum += Math.abs(whiteA - whiteB) + Math.abs(darkA - darkB);
      }
    return sum / ((a.length / 4) * 6);
  };
  // Reproduce the previous delivered geometry: sharpen/upscale, 16 colours,
  // fitError 1.24, minArea 2, and fill-opacity discarded during export.
  const baseline = (source, width, height) => {
    const up = enhanceAndUpscaleImage(source, width, height, 800);
    const traced = trace(up, {
      colors: 16,
      tolerance: 0.54,
      fitError: 1.24,
      cornerAngle: 76,
      minArea: 2,
      subpixel: true,
      optimize: true,
      background: true,
      primitives: false,
      refineIterations: 2,
    });
    const paths = [...traced.svg.matchAll(/<path\b([^>]+)>/g)].map(
      ([, attrs], i) => ({
        id: `old_${i}`,
        d: attrs.match(/\bd="([^"]+)"/)?.[1] || "",
        fill: attrs.match(/\bfill="([^"]+)"/)?.[1] || "#000",
        fillRule: attrs.match(/fill-rule="([^"]+)"/)?.[1] || "evenodd",
        nodeCount: 0,
        points: [],
        curves: [],
        visible: true,
      }),
    );
    return composeSvg(
      [
        {
          id: "old",
          name: "Old",
          visible: true,
          color: "#000",
          semanticRole: "main-shape",
          paths,
        },
      ],
      { width: up.width, height: up.height },
    );
  };
  const rows = [];
  for (const [name, svg] of fixtures) {
    const width = 180,
      height = 150,
      source = await render(svg, width, height);
    const start = performance.now();
    const result = await vectorizeImage(source, width, height, params);
    const elapsed = performance.now() - start;
    assert.equal(result.meta.width, width);
    assert.equal(result.meta.height, height);
    assert.ok(result.layers.length > 0);
    assert.ok(
      !/<image\b/.test(result.svg),
      "Output must contain editable vector geometry",
    );
    assert.ok(result.svg.includes("xmlns:inkscape="));
    assert.ok(
      result.layers.every((layer) =>
        layer.paths.every((path) => path.layerId === layer.id),
      ),
    );
    const flattened = result.layers
      .flatMap((layer) => layer.paths)
      .map((path) => path.id);
    assert.deepEqual(
      flattened,
      [...flattened].sort(
        (a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1]),
      ),
      "Paint order must be preserved",
    );
    const actual = await render(result.svg, width, height),
      old = await render(baseline(source, width, height), width, height);
    const currentError = error(source, actual),
      oldError = error(source, old);
    assert.ok(
      currentError < oldError,
      `${name}: new error ${currentError} must beat old ${oldError}`,
    );
    if (name === "partial-opacity")
      assert.ok(
        result.layers.some((layer) =>
          layer.paths.some((path) => path.opacity > 0 && path.opacity < 1),
        ),
      );
    if (name === "transparent-holes")
      assert.equal(
        actual[(75 * width + 90) * 4 + 3],
        0,
        "Centre hole must remain transparent",
      );
    if (output) {
      writeFileSync(join(output, `${name}.svg`), result.svg);
      writeFileSync(
        join(output, `${name}-source.png`),
        new Resvg(svg).render().asPng(),
      );
      writeFileSync(
        join(output, `${name}-result.png`),
        new Resvg(result.svg).render().asPng(),
      );
    }
    rows.push({
      fixture: name,
      previousError: +oldError.toFixed(3),
      currentError: +currentError.toFixed(3),
      improvement: `${((1 - currentError / oldError) * 100).toFixed(1)}%`,
      milliseconds: Math.round(elapsed),
      paths: result.meta.pathsCount,
    });
  }
  // Raster inputs are actually encoded/decoded, rather than testing only SVG fixtures.
  const raster = new Resvg(fixtures[0][1]).render();
  for (const format of ["png", "jpeg", "webp"]) {
    const encoded = await sharp(raster.asPng()).toFormat(format).toBuffer();
    const { data, info } = await sharp(encoded)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const result = await vectorizeImage(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      params,
    );
    await render(result.svg, info.width, info.height);
    assert.ok(result.layers.length > 0);
  }
  const transparent = await vectorizeImage(
    new Uint8ClampedArray(8 * 8 * 4),
    8,
    8,
    params,
  );
  assert.equal(transparent.layers.length, 0);
  console.table(rows);
  console.log(
    "PASS: 6 fidelity comparisons; PNG/JPEG/WebP conversion; dimensions; transparency; layer order; editable SVG parsing.",
  );
  if (output)
    writeFileSync(join(output, "metrics.json"), JSON.stringify(rows, null, 2));
} finally {
  rmSync(temp, { recursive: true, force: true });
}
