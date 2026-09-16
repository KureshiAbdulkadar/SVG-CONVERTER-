# VECTORFORGE — Master Build Plan

> **Written from the mindset of:** A senior engineer who built Figma's vector engine single-handedly, then spent 6 years at Adobe on Illustrator's Image Trace team. This is how *I* would build a PNG→Vector tool that beats Vectorizer.AI.

**Version:** 1.0
**Target:** Ship MVP in 90 days, $0 initial cost
**Goal:** Not "match" Vectorizer.AI — **surpass it** in quality, speed, and workflow.

---

## 0. THE THESIS (why this can win)

Vectorizer.AI is a **general-purpose** raster-to-vector converter. It treats every image the same way: pixels → color quantization → path tracing → smoothing.

**That is a 2019 approach.**

In 2026, we have:
- **SAM 2** (Meta) — pixel-perfect object segmentation, free
- **Depth Anything V2** — depth understanding, free
- **ControlNet** — edge intelligence, free
- **BiRefNet** — foreground extraction, free
- **CLIP / DINOv2** — semantic understanding of what an image IS

**Our unfair advantage:** We don't trace pixels. We **understand the image, then vectorize each semantic layer optimally.**

A cat photo isn't "5000 orange pixels." It's:
- Body (smooth curves, few nodes)
- Eyes (high detail, precise)
- Fur edges (organic, needs jitter)
- Whiskers (single-stroke paths)
- Background (flat regions)

**Vectorizer.AI does not know this. We will.**

---

## 1. PRODUCT PRINCIPLES (non-negotiable)

Written from the Figma/Adobe engineer lens:

1. **Nodes are sacred.** Every unnecessary anchor point is a sin. A logo should have <100 nodes, not 5000.
2. **Curves > polygons.** Bezier optimization is the difference between "amateur" and "professional" output.
3. **Layers matter.** SVG output must be organized, named, and editable — not one monolithic blob.
4. **Color fidelity.** Match input colors exactly. Don't "close enough" — designers will notice.
5. **Reversibility.** Every operation user does must be undoable, tweakable, non-destructive.
6. **Speed is a feature.** If it takes >10 seconds, we lost. Vectorizer.AI takes 15-30s. We aim for <5s.
7. **The output should be indistinguishable from a human designer's work in Illustrator.**

---

## 2. THE TECHNICAL ARCHITECTURE

### 2.1 High-level pipeline

```
┌─────────────────────────────────────────────────────────┐
│                     INPUT LAYER                          │
│  PNG / JPG / WebP → Validation → Upscale (if needed)    │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│              SEMANTIC ANALYSIS LAYER                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ CLIP     │ │ SAM 2    │ │ Depth V2 │ │ BiRefNet   │ │
│  │ (what)   │ │ (where)  │ │ (layers) │ │ (fg/bg)    │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│                    ↓ (parallel execution)                │
│              Image Type Classifier                       │
│         [logo|photo|icon|sketch|illustration]            │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│           PREPROCESSING LAYER (per-type)                 │
│  Logo → Sharpen, threshold                              │
│  Photo → Real-ESRGAN 4x, denoise, edge-preserve filter  │
│  Sketch → Skeletonize, close gaps                       │
│  Icon → Force geometric alignment                       │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│           COLOR INTELLIGENCE LAYER                       │
│  K-means++ with perceptual (LAB) distance               │
│  Smart palette: auto-detect 2, 4, 8, 16, 32, 64, full   │
│  Preserve brand colors (dominant hues stay pure)        │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│             VECTORIZATION CORE                           │
│  Per SAM segment:                                        │
│    - vtracer (multi-color paths)                        │
│    - Custom Potrace fork (B&W high-detail)              │
│    - Curve fitting: Schneider's algorithm               │
│  Merge layers → Z-ordered SVG                            │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│         POST-PROCESSING (the secret sauce)              │
│  1. Douglas-Peucker path simplification (adaptive ε)    │
│  2. Bezier curve smoothing (Catmull-Rom → cubic)        │
│  3. Node reduction (colinear merge, near-duplicate)     │
│  4. Corner detection & preservation                     │
│  5. Symmetry detection (mirror axis snap)               │
│  6. Grid snapping (for icons/logos)                     │
│  7. Path union / boolean cleanup                        │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│              OUTPUT LAYER                                │
│  SVG (optimized) | PDF | EPS | AI | DXF | Figma-ready   │
│  With named layers, groups, and metadata                │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Why this beats Vectorizer.AI

| Feature | Vectorizer.AI | VectorForge |
|---|---|---|
| Image understanding | None (pixel-based) | Full (CLIP + SAM) |
| Layer output | Flat | Semantic, named |
| Type-specific tuning | Generic | 5 optimized paths |
| Node count on logos | ~500 | <100 |
| Processing time | 15-30s | 3-5s (GPU) |
| Editability | Single blob | Grouped, labeled |
| Corner preservation | Weak | Explicit detection |
| Symmetry detection | No | Yes |
| Grid snap | No | Yes (for icons) |
| Undo/tweak controls | Limited | Full parameter tree |

---

## 3. THE TECH STACK

### 3.1 Frontend

- **Framework:** Next.js 15 (App Router)
- **UI Library:** shadcn/ui + Radix
- **Styling:** Tailwind CSS
- **Canvas:** Fabric.js for preview + editing
- **SVG rendering:** Native + SVG.js for manipulation
- **State:** Zustand (simpler than Redux for this)
- **File handling:** react-dropzone
- **Comparison slider:** react-compare-image
- **Icons:** Lucide

### 3.2 Backend

- **API:** Next.js API routes (edge for light ops) + separate Python service for ML
- **ML service:** FastAPI + Python 3.11
- **Vector engine:** vtracer (Rust bindings via `@neplex/vectorizer`) + custom Potrace fork
- **Image processing:** Pillow + OpenCV + scikit-image
- **AI models (all free, HuggingFace):**
  - `facebook/sam2-hiera-large`
  - `depth-anything/Depth-Anything-V2-Large`
  - `ZhengPeng7/BiRefNet`
  - `openai/clip-vit-large-patch14`
  - `lllyasviel/sd-controlnet-canny`
- **Upscaler:** Real-ESRGAN (ONNX runtime, no GPU needed for 2x)
- **Queue:** BullMQ + Redis (for async jobs)

### 3.3 Infrastructure (all free tier)

- **Frontend hosting:** Vercel (free)
- **ML inference:** HuggingFace Spaces (free GPU) + Modal.com fallback ($30/mo free credit)
- **Database:** Supabase (free, Postgres + auth + storage)
- **File storage:** Cloudflare R2 (10GB free, no egress fees)
- **CDN:** Cloudflare
- **Analytics:** PostHog (free tier)
- **Error tracking:** Sentry (free tier)
- **Domain:** Namecheap (~$10/yr — only real cost)

**Monthly cost at MVP scale: ~$0**
**At 10,000 users/mo: ~$150**
**At 100,000 users/mo: ~$800**

---

## 4. UI / UX DESIGN

### 4.1 Design principles

- **Dark-first** (aligned with TB Website 2026 palette — reuse tokens)
- **Split-view always visible** — input left, output right, live diff
- **Every parameter has a slider AND a preset** — designers want speed, power users want control
- **Zero-config default** — drag, drop, download. Advanced hidden until asked.
- **No modal spam.** Everything inline.

### 4.2 Screen 1: Landing / Upload

```
┌────────────────────────────────────────────────────────┐
│  VectorForge                              [Sign in]    │
├────────────────────────────────────────────────────────┤
│                                                        │
│                                                        │
│              ┌──────────────────────────┐              │
│              │                          │              │
│              │      Drop image here      │              │
│              │           OR              │              │
│              │      [Browse files]       │              │
│              │                          │              │
│              │  PNG · JPG · WebP · BMP  │              │
│              │  Up to 20MB              │              │
│              └──────────────────────────┘              │
│                                                        │
│         Or try: [Logo] [Photo] [Sketch] [Icon]         │
│              (one-click sample images)                 │
│                                                        │
│  ── Trusted by designers at ──                         │
│  [Client logos row]                                    │
│                                                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ 10x sharper│  │  <5 sec    │  │ Free tier  │       │
│  │ than V.AI  │  │  processing│  │  100/month │       │
│  └────────────┘  └────────────┘  └────────────┘       │
└────────────────────────────────────────────────────────┘
```

### 4.3 Screen 2: The Workbench (the main event)

```
┌────────────────────────────────────────────────────────────────┐
│  ← Back    filename.png                    [Export ▼] [Save]    │
├──────────────────┬──────────────────┬──────────────────────────┤
│                  │                  │                          │
│                  │                  │  DETECTED: Logo          │
│                  │                  │  [Change type ▼]         │
│                  │                  │                          │
│   [INPUT PNG]    │  [OUTPUT SVG]    │  ─── PRESETS ───         │
│                  │                  │  ○ Sharp (icons)         │
│                  │  live preview    │  ● Balanced              │
│                  │                  │  ○ Smooth (organic)      │
│                  │                  │  ○ Custom                │
│                  │                  │                          │
│                  │                  │  ─── COLORS ───          │
│                  │                  │  ○ Auto detected: 6      │
│                  │                  │  ● Custom: [==●====] 8   │
│                  │                  │  □ Preserve brand colors │
│                  │                  │                          │
│                  │                  │  ─── DETAIL ───          │
│                  │                  │  Smoothness   [===●==]   │
│                  │                  │  Corner sharp [==●===]   │
│                  │                  │  Path detail  [====●=]   │
│                  │                  │  Noise remove [==●====]  │
│                  │                  │                          │
│  [<-Compare->]   │                  │  ─── ADVANCED ───        │
│                  │                  │  □ Symmetry snap         │
│                  │                  │  □ Grid align            │
│                  │                  │  □ Merge similar paths   │
│                  │                  │  □ Remove background     │
│                  │                  │                          │
├──────────────────┴──────────────────┤  ─── STATS ───           │
│  ⚡ Processed in 3.2s                │  Nodes: 87               │
│  📊 Layers: 4  Paths: 12  Nodes: 87 │  Paths: 12               │
│  🎨 Colors: 6  Size: 4.2 KB          │  Size: 4.2 KB            │
│                                     │  Layers: 4 (named)       │
│  [Layers panel ▼]                   │                          │
│                                     │  [Reprocess]             │
└──────────────────┴──────────────────┴──────────────────────────┘
```

### 4.4 Screen 3: Layers panel (the Figma-inspired part)

```
┌─────────────────────────────┐
│  LAYERS                     │
├─────────────────────────────┤
│  👁 ▾ 🎨 Background         │
│       └ Path (1)            │
│  👁 ▾ 🎨 Main Shape         │
│       ├ Outline             │
│       └ Fill                │
│  👁 ▾ 🎨 Details            │
│       ├ Eye (L)             │
│       ├ Eye (R)             │
│       └ Mouth               │
│  👁 ▾ 🎨 Accents            │
│       └ Highlights          │
└─────────────────────────────┘
```

Each layer:
- Toggle visibility (👁)
- Solo mode
- Rename inline
- Color swatch (click to change)
- Drag to reorder
- Right-click: extract to separate SVG

**This is the Figma DNA. Nobody else does this.**

### 4.5 Export flow

Single button, dropdown reveals:

```
Export as:
  ● SVG (recommended)
  ○ SVG (optimized — smallest file)
  ○ PDF
  ○ EPS (Illustrator legacy)
  ○ AI (Illustrator CS6+)
  ○ DXF (CAD)
  ○ Figma-ready (with layer names)
  ○ PNG @ 2x (for comparison)

Options:
  □ Include original as embedded reference
  □ Flatten transforms
  □ Convert text paths to outlines
  □ Minify SVG code
```

### 4.6 Interaction micro-details (the Figma polish)

- **Hover on output path** → highlight corresponding region in input
- **Click path in output** → select it, show properties panel
- **Cmd/Ctrl+Z** → undo any parameter change with live re-render
- **Drag slider** → real-time preview at reduced quality, full render on release
- **Shift+drag slider** → 10x precision
- **Double-click layer name** → rename inline
- **Space + drag** → pan canvas (Figma convention)
- **Cmd+scroll** → zoom (Figma convention)
- **Cmd+0** → fit to view
- **Cmd+1** → 100% zoom
- **Keyboard: [ / ]** → cycle presets

---

## 5. THE ALGORITHMS (the heart of it)

### 5.1 Image Type Classification

**Input:** Raw image
**Output:** One of `[logo, photo, icon, sketch, illustration]`
**Method:** CLIP zero-shot classification with prompts:

```python
prompts = [
    "a company logo with solid colors",
    "a photograph of real world",
    "a simple icon or symbol",
    "a hand-drawn sketch or line art",
    "a digital illustration or artwork"
]
scores = clip.classify(image, prompts)
image_type = argmax(scores)
```

Type determines the **entire downstream pipeline configuration.**

### 5.2 Semantic Segmentation

**SAM 2** in "automatic" mode:
- Grid of prompt points (32×32 default)
- Filter masks by area (min 0.5% of image, max 95%)
- Merge overlapping masks (IoU > 0.85)
- Sort by depth (using Depth Anything V2)

**Result:** Ordered list of semantic regions, each with:
- Mask (binary)
- Bounding box
- Dominant color
- Depth rank (0 = furthest, N = closest)
- Semantic label (via CLIP on cropped region)

### 5.3 Color Quantization (perceptual)

Standard K-means uses RGB Euclidean distance. **Wrong.** Human eye is not linear in RGB.

**Our approach:**
```python
def perceptual_quantize(image, n_colors):
    # Convert to LAB color space (perceptually uniform)
    lab_pixels = rgb_to_lab(image.reshape(-1, 3))
    
    # K-means++ initialization (better than random)
    kmeans = KMeans(n_clusters=n_colors, init='k-means++', 
                    n_init=10, algorithm='elkan')
    kmeans.fit(lab_pixels)
    
    # Snap to "brand" colors if any dominant hue exists
    palette = detect_brand_colors(kmeans.cluster_centers_)
    
    return lab_to_rgb(palette)
```

**Auto color count detection:**
- Analyze histogram peaks
- Merge colors within ΔE < 3 (imperceptible difference)
- Return optimal N

### 5.4 Path Tracing (per-segment)

For each SAM segment:

1. Extract sub-image using mask
2. Apply type-appropriate preprocessing:
   - Logo: Bilateral filter + threshold
   - Photo: Meanshift segmentation
   - Icon: Otsu binarization
   - Sketch: Adaptive threshold
3. Feed to vtracer with tuned params:
   ```
   filter_speckle: 4 (logo) / 12 (photo)
   color_precision: 8 (logo) / 6 (photo)
   layer_difference: 16
   corner_threshold: 60 (logo) / 90 (photo)
   length_threshold: 4.0
   splice_threshold: 45
   ```
4. Get raw SVG paths

### 5.5 Path Simplification (the Adobe secret)

Raw vtracer output has too many nodes. Apply:

**Adaptive Douglas-Peucker:**
```python
def adaptive_simplify(path, detail_level):
    # Detail level 0.0 (max simplify) to 1.0 (preserve all)
    epsilon = 0.5 + (1 - detail_level) * 5.0
    
    # Detect corners first (don't simplify near corners)
    corners = detect_corners(path, angle_threshold=30)
    
    # Simplify between corners
    simplified = []
    for segment in split_at_corners(path, corners):
        simplified.append(douglas_peucker(segment, epsilon))
    
    return merge_segments(simplified, corners)
```

**Bezier curve fitting (Schneider's algorithm):**
- Fit cubic Beziers to polyline segments
- Error tolerance: 0.5 pixels default
- Preserve tangent continuity at joins

### 5.6 Corner Detection

**Why it matters:** Vectorizer.AI rounds every corner. Logos need sharp corners preserved.

```python
def detect_corners(path, angle_threshold=30):
    corners = []
    for i in range(1, len(path) - 1):
        v1 = path[i] - path[i-1]
        v2 = path[i+1] - path[i]
        angle = angle_between(v1, v2)
        if angle > angle_threshold:
            corners.append(i)
    return corners
```

At corners: split path, use sharp junctions (no smoothing across).
At non-corners: smooth freely.

### 5.7 Symmetry Detection

For logos especially — detect if shape has mirror symmetry, then snap to make it perfect.

```python
def detect_symmetry(path):
    # Try horizontal, vertical, diagonal axes
    for axis in [horizontal, vertical, diag1, diag2]:
        reflected = reflect(path, axis)
        error = shape_distance(path, reflected)
        if error < threshold:
            return axis, error
    return None
```

If symmetry found → average the two halves → perfect mirror.

### 5.8 Grid Snapping (for icons)

Icons should snap to pixel grid at their intended size (24px, 32px, etc.):

```python
def snap_to_grid(path, grid_size):
    # Snap nodes to nearest grid point if close enough
    for i, point in enumerate(path):
        nearest = round(point / grid_size) * grid_size
        if distance(point, nearest) < grid_size * 0.15:
            path[i] = nearest
    return path
```

---

## 6. THE FEEDBACK LOOP (long-term moat)

Vectorizer.AI does NOT learn from users. **We will.**

After every export, unobtrusive prompt:

```
How's this result?
[😞] [😐] [🙂] [😍]

Optional: [Report specific issue ▼]
  □ Colors are wrong
  □ Too many nodes
  □ Corners are rounded
  □ Missing details
  □ Extra artifacts
```

Every rating + issue is logged with:
- Input image (with permission)
- Output SVG
- Parameters used
- User's manual fix (if they edited)

**After 6 months:** 100K+ labeled data points → fine-tune a custom model → **we become unbeatable.**

---

## 7. THE BUSINESS MODEL

### 7.1 Pricing tiers

| Tier | Price | Limits |
|---|---|---|
| **Free** | $0 | 100 conversions/mo, watermark on preview, max 2000px |
| **Pro** | $9/mo | Unlimited, no watermark, up to 8000px, all formats, API 100 calls |
| **Studio** | $29/mo | Everything + batch processing, API 5000 calls, priority queue |
| **Enterprise** | Custom | Self-hosted option, SLA, custom training |

**Compare to Vectorizer.AI:** $9.99/mo, 100 credits, per-image billing after.

**Our advantage:** Flat unlimited at $9. Kills their pricing model.

### 7.2 Launch strategy

**Week 1:** ProductHunt launch
**Week 2:** Post to r/graphic_design, r/webdev, r/logodesign
**Week 3:** Twitter/X design community (Julius, Jon Yongfook, etc.)
**Week 4:** LinkedIn to design leaders
**Month 2:** Content marketing — "Vectorizer.AI vs VectorForge" comparisons
**Month 3:** Figma plugin (huge distribution channel)
**Month 4:** Adobe Illustrator extension
**Month 6:** API partnerships with logo tools (Looka, Canva, etc.)

---

## 8. THE 90-DAY BUILD PLAN

### Phase 1: Foundation (Days 1-14)

**Day 1-3:** Repo setup, Next.js scaffold, deploy to Vercel
**Day 4-7:** Python FastAPI service, deploy to HuggingFace Spaces
**Day 8-10:** Integrate vtracer, basic PNG→SVG pipeline (no AI yet)
**Day 11-14:** Frontend upload + basic preview UI

**Deliverable:** Working basic converter, no intelligence yet.

### Phase 2: Intelligence (Days 15-45)

**Day 15-18:** Integrate CLIP for image type classification
**Day 19-25:** Integrate SAM 2 for segmentation
**Day 26-30:** Depth Anything V2 for layering
**Day 31-35:** Per-type preprocessing pipelines
**Day 36-40:** Perceptual color quantization
**Day 41-45:** Corner detection + adaptive simplification

**Deliverable:** Genuinely smart output, better than vtracer alone.

### Phase 3: The Workbench (Days 46-70)

**Day 46-52:** Full workbench UI with sliders + presets
**Day 53-58:** Layers panel with rename, visibility, reorder
**Day 59-63:** Live parameter tweaking with debounced re-render
**Day 64-67:** All export formats (SVG, PDF, EPS, AI, DXF)
**Day 68-70:** Keyboard shortcuts + polish

**Deliverable:** Professional-grade editing experience.

### Phase 4: Polish + Launch (Days 71-90)

**Day 71-75:** Auth, billing (Stripe), user accounts (Supabase)
**Day 76-80:** Landing page, docs, sample gallery
**Day 81-85:** Beta with 20 designer friends, collect feedback
**Day 86-88:** Fix top 10 issues from beta
**Day 89:** ProductHunt scheduled
**Day 90:** 🚀 LAUNCH

---

## 9. FILE / FOLDER STRUCTURE

```
vectorforge/
├── apps/
│   ├── web/                      # Next.js frontend
│   │   ├── app/
│   │   │   ├── (marketing)/
│   │   │   │   ├── page.tsx      # Landing
│   │   │   │   └── pricing/
│   │   │   ├── workbench/
│   │   │   │   └── [id]/page.tsx # Main editor
│   │   │   ├── api/
│   │   │   │   ├── convert/
│   │   │   │   ├── export/
│   │   │   │   └── webhook/stripe/
│   │   │   └── dashboard/
│   │   ├── components/
│   │   │   ├── workbench/
│   │   │   │   ├── Canvas.tsx
│   │   │   │   ├── LayersPanel.tsx
│   │   │   │   ├── ParametersPanel.tsx
│   │   │   │   ├── ExportMenu.tsx
│   │   │   │   └── CompareSlider.tsx
│   │   │   └── ui/               # shadcn components
│   │   ├── lib/
│   │   │   ├── vectorize-client.ts
│   │   │   ├── svg-utils.ts
│   │   │   └── shortcuts.ts
│   │   └── stores/
│   │       └── workbench-store.ts
│   │
│   └── ml-service/               # Python FastAPI
│       ├── app/
│       │   ├── main.py
│       │   ├── routes/
│       │   │   └── convert.py
│       │   ├── pipeline/
│       │   │   ├── classifier.py    # CLIP
│       │   │   ├── segmentation.py  # SAM 2
│       │   │   ├── depth.py         # Depth Anything
│       │   │   ├── preprocess.py
│       │   │   ├── quantize.py
│       │   │   ├── vectorize.py     # vtracer wrapper
│       │   │   ├── simplify.py      # Douglas-Peucker
│       │   │   ├── corners.py
│       │   │   ├── symmetry.py
│       │   │   └── grid_snap.py
│       │   ├── models/
│       │   │   └── loader.py        # Lazy load ML models
│       │   └── exporters/
│       │       ├── svg.py
│       │       ├── pdf.py
│       │       ├── eps.py
│       │       └── dxf.py
│       ├── requirements.txt
│       └── Dockerfile
│
├── packages/
│   ├── shared-types/             # TypeScript types shared
│   └── svg-optimizer/            # Reusable SVG cleanup
│
├── infra/
│   ├── docker-compose.yml
│   └── modal_deploy.py           # Modal.com deployment
│
├── docs/
│   ├── api.md
│   ├── algorithms.md
│   └── contributing.md
│
├── .env.example
├── package.json
├── turbo.json                    # Turborepo
└── README.md
```

---

## 10. KEY CODE STRUCTURES (starter templates)

### 10.1 Main conversion API endpoint (Python)

```python
# apps/ml-service/app/routes/convert.py
from fastapi import APIRouter, UploadFile, HTTPException
from app.pipeline import (
    classify_image, segment_image, quantize_colors,
    vectorize_layers, simplify_paths, detect_corners
)

router = APIRouter()

@router.post("/convert")
async def convert(
    file: UploadFile,
    preset: str = "balanced",
    color_count: int = 0,  # 0 = auto
    smoothness: float = 0.5,
    corner_sharpness: float = 0.7,
    detail: float = 0.6,
    preserve_symmetry: bool = False,
    grid_snap: bool = False,
    remove_bg: bool = False,
):
    image = await load_image(file)
    
    # 1. Classify
    img_type = classify_image(image)
    
    # 2. Preprocess based on type
    processed = preprocess(image, img_type, remove_bg=remove_bg)
    
    # 3. Segment
    layers = segment_image(processed)
    
    # 4. Quantize colors
    n_colors = color_count or auto_color_count(processed)
    palette = quantize_colors(processed, n_colors)
    
    # 5. Vectorize each layer
    svg_layers = []
    for layer in layers:
        paths = vectorize_layers(layer, palette, img_type)
        paths = simplify_paths(paths, detail=detail, smoothness=smoothness)
        paths = detect_corners(paths, sharpness=corner_sharpness)
        if preserve_symmetry:
            paths = enforce_symmetry(paths)
        if grid_snap:
            paths = snap_to_grid(paths, 8)
        svg_layers.append(paths)
    
    # 6. Compose SVG
    svg = compose_svg(svg_layers, palette, image.size)
    
    return {
        "svg": svg,
        "meta": {
            "type": img_type,
            "layers": len(svg_layers),
            "paths": count_paths(svg),
            "nodes": count_nodes(svg),
            "size_bytes": len(svg),
        }
    }
```

### 10.2 Workbench state (Zustand)

```typescript
// apps/web/stores/workbench-store.ts
import { create } from 'zustand'

interface WorkbenchState {
  inputImage: File | null
  outputSvg: string | null
  isProcessing: boolean
  parameters: {
    preset: 'sharp' | 'balanced' | 'smooth' | 'custom'
    colorCount: number
    smoothness: number
    cornerSharpness: number
    detail: number
    noiseRemoval: number
    preserveSymmetry: boolean
    gridSnap: boolean
    mergePaths: boolean
    removeBackground: boolean
  }
  layers: Layer[]
  history: Snapshot[]
  historyIndex: number
  
  setInput: (file: File) => void
  updateParam: <K extends keyof Parameters>(key: K, value: Parameters[K]) => void
  reprocess: () => Promise<void>
  undo: () => void
  redo: () => void
  toggleLayer: (id: string) => void
  renameLayer: (id: string, name: string) => void
  export: (format: ExportFormat) => Promise<Blob>
}

export const useWorkbench = create<WorkbenchState>((set, get) => ({
  // ... implementation
}))
```

### 10.3 Canvas component (Next.js)

```tsx
// apps/web/components/workbench/Canvas.tsx
'use client'
import { useWorkbench } from '@/stores/workbench-store'
import { CompareSlider } from './CompareSlider'

export function Canvas() {
  const { inputImage, outputSvg, isProcessing } = useWorkbench()
  
  if (!inputImage) return <UploadZone />
  
  return (
    <div className="relative h-full bg-[#0D0D0D]">
      <CompareSlider
        before={URL.createObjectURL(inputImage)}
        after={outputSvg ? `data:image/svg+xml;base64,${btoa(outputSvg)}` : null}
        isLoading={isProcessing}
      />
      <ZoomControls />
      <StatsOverlay />
    </div>
  )
}
```

---

## 11. WHAT NOT TO BUILD (discipline)

The Figma/Adobe engineer says NO to:

- ❌ Video vectorization (v2, not now)
- ❌ 3D vectorization (out of scope)
- ❌ Font detection / OCR (separate product)
- ❌ Social login beyond Google (unnecessary complexity)
- ❌ Complex team features in v1 (individual first)
- ❌ Mobile app (web-first, mobile web works fine)
- ❌ Custom AI training in v1 (use pre-trained, train later with real data)
- ❌ Real-time collaboration (feature bloat)

**Focus:** ONE workflow, done better than anyone else on earth.

---

## 12. RISKS & MITIGATIONS

| Risk | Mitigation |
|---|---|
| SAM 2 too slow on CPU | HuggingFace Space GPU (free), Modal.com fallback |
| HuggingFace rate limits | Multiple accounts, round-robin, cache aggressively |
| Vectorizer.AI copies our features | Move faster, build community moat via feedback loop |
| Users don't discover us | Figma plugin (huge distribution), SEO on "X vs Y" |
| Legal — vtracer license | vtracer is MIT, we're clean |
| Model licenses | SAM 2 is Apache 2.0, CLIP is MIT, Depth Anything is Apache — all commercial OK |
| Costs scale before revenue | Aggressive free tier limits (100/mo), hard cap on abuse |

---

## 13. SUCCESS METRICS

**Week 1 post-launch:**
- 1,000 signups
- 100 paid conversions
- 4.5+ ProductHunt rating

**Month 1:**
- 10,000 signups
- 500 paid users ($4,500 MRR)
- Featured in a design newsletter

**Month 6:**
- 100,000 signups
- 3,000 paid users ($27,000 MRR)
- Figma plugin live
- Break-even

**Year 1:**
- 500,000 signups
- 10,000 paid users ($90,000 MRR)
- Team of 3
- Profitable

---

## 14. THE FINAL WORD

Vectorizer.AI won because in 2019 it was the best. But it stopped evolving.

**In 2026, the ingredients to beat them are free.** Meta gave us SAM 2. HuggingFace gave us free hosting. Open source gave us vtracer.

The only missing ingredient was **someone who thinks like Figma + Adobe simultaneously.**

That's the mindset in this doc. Build it exactly like this, and in 90 days you have a product that a professional designer will pay $9/mo for — and cancel Vectorizer.AI.

The moat isn't the tech. The tech is available to everyone. **The moat is:**
1. Semantic understanding (nobody's doing this)
2. Figma-quality UX (nobody's doing this)
3. Feedback loop learning (nobody's doing this)
4. Aggressive pricing (unlimited flat rate)

Ship it.

---

**END OF PLAN — v1.0**

Next document to write after this: `IMPLEMENTATION_STEP_1.md` — literal day-by-day code walkthrough for Days 1-14 (Foundation phase).
