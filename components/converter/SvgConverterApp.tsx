"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  Layers,
  LockKeyhole,
  Minus,
  Plus,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";
import {
  useWorkbenchStore,
  formatFileSize,
} from "../../stores/workbench-store";

type View = "compare" | "vector" | "original";
function Mark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path d="M5 25C5 7 27 25 27 7" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M5 25V7h22"
        stroke="currentColor"
        strokeWidth="1"
        opacity=".45"
      />
      <path d="M2 22h6v6H2zM24 4h6v6h-6z" fill="currentColor" />
      <circle cx="5" cy="7" r="2" fill="currentColor" />
    </svg>
  );
}
function SampleArt({ nodes = false }: { nodes?: boolean }) {
  return (
    <svg viewBox="0 0 300 260" fill="none" aria-hidden="true">
      <g fill="#e64b35">
        <path d="M150 38C185 38 194 82 177 103C206 84 242 109 237 140C233 170 203 182 177 169C194 197 176 231 146 230C113 230 100 199 114 174C83 188 54 169 56 139C57 108 90 94 115 108C96 80 115 38 150 38Z" />
        <circle cx="147" cy="138" r="31" fill="#fff" />
      </g>
      {nodes && (
        <g stroke="#303c36" strokeWidth="1">
          <path d="M150 38C185 38 194 82 177 103C206 84 242 109 237 140C233 170 203 182 177 169C194 197 176 231 146 230C113 230 100 199 114 174C83 188 54 169 56 139C57 108 90 94 115 108C96 80 115 38 150 38Z" />
          <path d="M150 14v48M126 38h48M213 140h48M237 116v48" opacity=".5" />
          {[
            [150, 38],
            [177, 103],
            [237, 140],
            [177, 169],
            [146, 230],
            [114, 174],
            [56, 139],
            [115, 108],
          ].map(([x, y], i) => (
            <rect
              key={i}
              x={x - 3}
              y={y - 3}
              width="6"
              height="6"
              fill="white"
            />
          ))}
          <circle cx="150" cy="14" r="2.5" fill="white" />
          <circle cx="261" cy="140" r="2.5" fill="white" />
        </g>
      )}
    </svg>
  );
}
function createSample(kind: "mark" | "line") {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 400;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(1.5, 1.5);
  if (kind === "mark") {
    ctx.translate(10, 0);
    ctx.fillStyle = "#e64b35";
    ctx.fill(
      new Path2D(
        "M150 38C185 38 194 82 177 103C206 84 242 109 237 140C233 170 203 182 177 169C194 197 176 231 146 230C113 230 100 199 114 174C83 188 54 169 56 139C57 108 90 94 115 108C96 80 115 38 150 38Z",
      ),
    );
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(147, 138, 31, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = "#253c34";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(160, 225);
    ctx.bezierCurveTo(125, 165, 190, 110, 155, 45);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const y = 85 + i * 32;
      ctx.beginPath();
      ctx.moveTo(156, y + 20);
      ctx.bezierCurveTo(100, y + 25, 95, y - 20, 96, y - 20);
      ctx.bezierCurveTo(140, y - 22, 158, y + 3, 156, y + 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(157, y + 30);
      ctx.bezierCurveTo(205, y + 33, 220, y - 10, 220, y - 10);
      ctx.bezierCurveTo(173, y - 10, 158, y + 8, 157, y + 30);
      ctx.stroke();
    }
  }
  return canvas.toDataURL("image/png");
}
export function SvgConverterApp() {
  const store = useWorkbenchStore();
  const { appState, imageDataUrl, svgBlobUrl, result, splitPosition } = store;
  const input = useRef<HTMLInputElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<View>("compare");
  const [zoom, setZoom] = useState(1);
  const [showLayers, setShowLayers] = useState(false);
  const [help, setHelp] = useState(false);
  const busy = appState === "converting";
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (useWorkbenchStore.getState().appState === "converting") return;
      const file = Array.from(event.clipboardData?.items || [])
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (file) {
        event.preventDefault();
        void store.convertFile(file);
      }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [store.convertFile]);
  useEffect(() => {
    if (appState === "done") {
      setView("compare");
      setZoom(1);
      setShowLayers(false);
      resultHeading.current?.focus({ preventScroll: true });
    }
  }, [appState]);
  const choose = () => input.current?.click();
  const sample = (kind: "mark" | "line") =>
    void store.convertDataUrl(
      createSample(kind),
      kind === "mark" ? "flower-mark.png" : "botanical-line.png",
    );
  const splitAt = (x: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (rect) store.setSplitPosition(((x - rect.left) / rect.width) * 100);
  };
  const cleanName = store.fileName.replace(/\.[^/.]+$/, "") + ".svg";
  return (
    <div className="app-shell">
      <a href="#workspace" className="skip-link">
        Skip to converter
      </a>
      <header className="app-header">
        <a className="brand" href="/" aria-label="VectorForge home">
          <Mark />
          <span>
            VectorForge<span className="brand-period">.</span>
          </span>
        </a>
        <div className="header-context">Image to SVG</div>
        <button
          className="text-button help-button"
          onClick={() => setHelp(!help)}
          aria-expanded={help}
        >
          How it works {help ? <X size={15} /> : <ArrowDown size={15} />}
        </button>
      </header>
      {help && (
        <aside className="help-panel">
          <strong>From pixels to paths.</strong>
          <p>
            Choose an image or paste one from your clipboard. We trace it on
            your device. Compare the result, zoom in to check the edges, then
            save your SVG. Logos and flat artwork work best; photos become
            simplified illustrations.
          </p>
          <p>
            SVG colour layers contain editable paths. Lettering is traced as
            shapes, rather than editable text.
          </p>
        </aside>
      )}
      <main
        id="workspace"
        className={`workspace ${appState === "done" ? "workspace-result" : ""}`}
      >
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/bmp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void store.convertFile(file);
          }}
        />
        {appState === "idle" && (
          <>
            <div className="intro">
              <h1>Image to SVG</h1>
              <p>
                Your artwork, ready for its next size.
                <br className="mobile-break" /> Convert an image into editable
                vector paths.
              </p>
            </div>
            <div
              className={`upload-workspace ${dragging ? "is-dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node))
                  setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) void store.convertFile(file);
              }}
            >
              <section className="upload-panel" aria-label="Upload an image">
                <Upload size={30} strokeWidth={1.4} />
                <h2>
                  {dragging
                    ? "Drop it. We’ll take it from here."
                    : "Start with your image"}
                </h2>
                <p>Drag it here, or choose a file.</p>
                <button
                  className="button button-primary upload-button"
                  onClick={choose}
                >
                  Choose image <ArrowRight size={18} />
                </button>
                <span className="file-support">
                  PNG, JPG, WebP, BMP · Up to 25 MB
                </span>
                <span className="paste-hint">
                  You can also paste an image with <kbd>⌘ / Ctrl V</kbd>
                </span>
              </section>
              <section
                className="specimen"
                aria-label="Example of raster artwork becoming vector paths"
              >
                <div className="specimen-top">
                  <span>A little less pixel. A lot more possibility.</span>
                  <span className="specimen-dot" />
                </div>
                <div className="specimen-art">
                  <div className="raster-specimen">
                    <SampleArt />
                  </div>
                  <div className="vector-specimen">
                    <SampleArt nodes />
                  </div>
                  <div className="specimen-divider">
                    <span>
                      <ArrowLeft size={12} />
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
                <div className="specimen-bottom">
                  <span>Raster image</span>
                  <span>Editable paths</span>
                </div>
                <p className="specimen-caption">
                  A sample mark, shown as pixels and vector curves.
                </p>
              </section>
            </div>
            <div className="sample-row">
              <span>No image handy? Try one:</span>
              <button onClick={() => sample("mark")}>
                <span className="sample-flower" />
                Flower mark <ArrowRight size={14} />
              </button>
              <button onClick={() => sample("line")}>
                <span className="sample-line" />
                Line drawing <ArrowRight size={14} />
              </button>
            </div>
            <div className="workflow-note">
              <span>
                <LockKeyhole size={15} /> Your files stay on your device.
              </span>
              <span>
                Upload <ArrowRight size={13} /> Compare <ArrowRight size={13} />{" "}
                Download
              </span>
            </div>
          </>
        )}
        {busy && (
          <section
            className="processing-state"
            aria-labelledby="processing-title"
          >
            <div className="processing-art">
              {imageDataUrl ? (
                <img src={imageDataUrl} alt="Your image being converted" />
              ) : (
                <Upload size={32} />
              )}
            </div>
            <h1 id="processing-title">Making room for every detail.</h1>
            <p role="status">{store.processingStage}</p>
            <div className="loading-track" aria-hidden="true">
              <span />
            </div>
            <p className="processing-note">
              Tracing locally. Detailed images may take a little longer.
            </p>
            <button className="text-button" onClick={store.reset}>
              Cancel conversion
            </button>
          </section>
        )}
        {appState === "done" && result && (
          <>
            <div className="result-heading">
              <div>
                <div className="ready-label">
                  <Check size={15} /> Your SVG is ready
                </div>
                <h1 ref={resultHeading} tabIndex={-1} title={cleanName}>
                  {cleanName}
                </h1>
                <p>
                  {store.imageWidth.toLocaleString()} ×{" "}
                  {store.imageHeight.toLocaleString()} px <span>·</span>{" "}
                  {formatFileSize(store.svgSizeBytes)} <span>·</span> Editable
                  vector paths
                </p>
              </div>
              <button
                className="button button-primary"
                onClick={store.downloadSvg}
              >
                <Download size={17} /> Download SVG
              </button>
            </div>
            <div className="editor">
              <div className="editor-toolbar">
                <div
                  className="view-tabs"
                  role="group"
                  aria-label="Preview mode"
                >
                  {(["compare", "vector", "original"] as View[]).map((mode) => (
                    <button
                      key={mode}
                      aria-pressed={view === mode}
                      onClick={() => setView(mode)}
                    >
                      {mode === "compare"
                        ? "Compare"
                        : mode === "vector"
                          ? "SVG"
                          : "Original"}
                    </button>
                  ))}
                </div>
                <div className="editor-tools">
                  <button
                    className="icon-button"
                    aria-label="Zoom out"
                    disabled={zoom <= 1}
                    onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    className="zoom-value"
                    onClick={() => setZoom(1)}
                    aria-label="Fit image to preview"
                  >
                    {zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`}
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Zoom in"
                    disabled={zoom >= 4}
                    onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
                  >
                    <Plus size={16} />
                  </button>
                  <span className="tool-divider" />
                  <button
                    className={`layers-button ${showLayers ? "selected" : ""}`}
                    aria-label="Inspect colour layers"
                    aria-expanded={showLayers}
                    onClick={() => setShowLayers(!showLayers)}
                  >
                    <Layers size={16} />
                    <span>Layers</span>
                  </button>
                </div>
              </div>
              <div className="editor-body">
                <div className={`preview-well ${zoom > 1 ? "is-zoomed" : ""}`}>
                  <div className="preview-scroll">
                    <div
                      className="artboard"
                      ref={frame}
                      style={
                        {
                          aspectRatio: `${store.imageWidth}/${store.imageHeight}`,
                          "--art-ratio": store.imageWidth / store.imageHeight,
                          "--art-zoom": zoom,
                          maxWidth: zoom === 1 ? "100%" : "none",
                        } as CSSProperties
                      }
                    >
                      {imageDataUrl && view !== "vector" && (
                        <img
                          draggable={false}
                          src={imageDataUrl}
                          alt="Original raster image"
                          style={{
                            clipPath:
                              view === "compare"
                                ? `inset(0 ${100 - splitPosition}% 0 0)`
                                : undefined,
                          }}
                        />
                      )}
                      {svgBlobUrl && view !== "original" && (
                        <img
                          draggable={false}
                          src={svgBlobUrl}
                          alt="Converted SVG with editable vector paths"
                          style={{
                            clipPath:
                              view === "compare"
                                ? `inset(0 0 0 ${splitPosition}%)`
                                : undefined,
                          }}
                        />
                      )}
                      {view === "compare" && (
                        <>
                          <div
                            className="compare-line"
                            style={{ left: `${splitPosition}%` }}
                          >
                            <span>
                              <ArrowLeft size={13} />
                              <ArrowRight size={13} />
                            </span>
                          </div>
                          <input
                            type="range"
                            className="compare-input"
                            min="0"
                            max="100"
                            value={splitPosition}
                            aria-label="Before and after comparison"
                            aria-valuetext={`${Math.round(splitPosition)} percent original image`}
                            onChange={(e) =>
                              store.setSplitPosition(Number(e.target.value))
                            }
                            onPointerDown={(e) => {
                              e.currentTarget.setPointerCapture(e.pointerId);
                              splitAt(e.clientX);
                            }}
                            onPointerMove={(e) => {
                              if (e.buttons === 1) splitAt(e.clientX);
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="canvas-labels">
                    <span>
                      {view === "vector" ? "SVG vector" : "Original image"}
                    </span>
                    <span>
                      {view === "compare"
                        ? "SVG vector"
                        : zoom > 1
                          ? "Scroll to inspect the edges"
                          : "Transparent areas shown as checks"}
                    </span>
                  </div>
                </div>
                {showLayers && (
                  <aside className="layers-panel">
                    <div className="layers-heading">
                      <h2>Colour layers</h2>
                      <span>{result.layers.length}</span>
                    </div>
                    <p>Paths in their original stacking order.</p>
                    <ol className="layer-list">
                      {result.layers.map((layer, i) => (
                        <li key={layer.id}>
                          <span
                            className="layer-swatch"
                            style={{ backgroundColor: layer.color }}
                          />
                          <div>
                            <strong>Colour {i + 1}</strong>
                            <span>
                              {layer.color.toUpperCase()} · {layer.paths.length}{" "}
                              {layer.paths.length === 1 ? "path" : "paths"}
                            </span>
                          </div>
                          <span className="layer-order">{i + 1}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="layers-note">
                      Named groups stay in your SVG for editing in vector
                      applications.
                    </p>
                  </aside>
                )}
              </div>
              <div className="editor-status">
                <span>
                  {result.meta.pathsCount.toLocaleString()}{" "}
                  {result.meta.pathsCount === 1 ? "path" : "paths"}{" "}
                  <span>·</span> {result.palette.length}{" "}
                  {result.palette.length === 1 ? "colour" : "colours"}
                </span>
                <span>
                  {view === "compare"
                    ? "Drag the divider to compare"
                    : "Use + to inspect small details"}
                </span>
              </div>
            </div>
            <div className="result-actions">
              <button className="text-button" onClick={store.reset}>
                <ArrowLeft size={16} /> Convert another image
              </button>
              <div>
                <button className="text-button" onClick={store.copySvg}>
                  {store.copiedToast ? <Check size={16} /> : <Copy size={16} />}{" "}
                  {store.copiedToast ? "Copied SVG" : "Copy SVG"}
                </button>
                {!store.detailed && (
                  <button
                    className="text-button detail-button"
                    onClick={store.retryDetailed}
                  >
                    Trace finer details <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>
            <p className="result-footnote">
              {store.detailed
                ? "Fine-detail tracing uses more colours and a tighter curve fit."
                : "Missing a small detail? Try a finer trace. It may create a larger file."}{" "}
              Lettering is saved as shapes.
            </p>
            <div className="sr-only" role="status">
              {store.copiedToast ? "SVG copied to clipboard." : ""}
            </div>
            {store.actionError && (
              <p className="action-error" role="alert">
                <AlertCircle size={16} />
                {store.actionError}
              </p>
            )}
          </>
        )}
        {appState === "error" && (
          <section className="error-state" role="alert">
            <AlertCircle size={32} />
            <h1>Let’s try another image.</h1>
            <p>{store.errorMessage}</p>
            <button
              className="button button-primary"
              onClick={() => {
                store.reset();
                choose();
              }}
            >
              Choose another image <ArrowRight size={17} />
            </button>
            <button className="text-button" onClick={store.reset}>
              Back to converter
            </button>
          </section>
        )}
      </main>
      <footer className="app-footer">
        <span>Made for the next size.</span>
        <span>
          <LockKeyhole size={13} /> Converted on your device
        </span>
        <span>VectorForge</span>
      </footer>
    </div>
  );
}
