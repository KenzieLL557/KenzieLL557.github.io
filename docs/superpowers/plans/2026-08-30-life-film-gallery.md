# Life Fullscreen Film Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-screen Life page that reproduces the Figma intro panel and presents uncropped photographs in a continuous, draggable, inertial film strip, while refining the Work dialog dimensions.

**Architecture:** Keep the existing React entry point and CSS system, but extract film geometry and wrapping math into a small pure module so motion behavior can be tested independently. `LifeGallery` owns the full-screen route and transition, `LifeIntroPanel` owns the Figma-faithful left column, and `FilmStrip` owns one motion value shared by auto-scroll, wheel input, pointer dragging, and seamless wrapping.

**Tech Stack:** React, JavaScript, Framer Motion, CSS, Vite, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-30-life-film-gallery-design.md`

## Global Constraints

- Every photograph must display all original pixels; use `object-fit: contain` and never `cover`.
- Preserve natural aspect ratios; black letterboxing inside an exposure frame is allowed.
- Do not add a new animation or carousel dependency.
- Use the existing `asset()` helper and commit all production image files locally.
- The left panel must match Figma node `4523:2212` at the `1440 × 900` reference size.
- Life is a full-screen page, not a `FolderWindow` variant.
- The close button remains fixed in the top-left and Escape returns to the portfolio home.
- With `prefers-reduced-motion: reduce`, disable automatic movement and inertia.

---

## File Structure

- Create `src/lifeGallery.js`: aspect classification, frame-width mapping, and seamless offset wrapping.
- Modify `src/main.jsx`: Life photo data, `LifeIntroPanel`, `FilmFrame`, `FilmStrip`, `LifeGallery`, and Life routing.
- Modify `src/styles.css`: Work dialog refinement and all Life full-screen, film, responsive, and reduced-motion styles.
- Create `tests/lifeGallery.test.mjs`: unit tests for aspect classification, no-crop frame geometry, and offset wrapping.
- Modify `tests/aiPageContracts.test.mjs`: integration contracts for Work sizing and Life rendering.
- Create `public/assets/figma/life-profile.png`: exact portrait source exported from Figma.
- Create `public/assets/figma/life-film-roll.png`: exact physical film-roll visual exported from Figma.
- Create `public/assets/life/scenery-01.jpg` through `scenery-05.jpg`: local initial scenic photo set.

---

### Task 1: Refine the Work dialog

**Files:**
- Modify: `src/styles.css:457-525`
- Modify: `tests/aiPageContracts.test.mjs:132-165`

**Interfaces:**
- Consumes: existing `.folder-window-work`, `.folder-window-titlebar`, `.folder-window-body`, and `.folder-file b` selectors.
- Produces: a responsive `1150 × 580px` Work dialog with a `48px` title bar and `14px` project titles.

- [ ] **Step 1: Update the existing Work contract to the new dimensions**

Replace the old width and height assertion and add typography/title-bar assertions:

```js
assert.match(styles, /\.folder-window-work\s*\{[^}]*width:\s*min\(calc\(100%\s*-\s*64px\),\s*1150px\);[^}]*height:\s*min\(calc\(100%\s*-\s*64px\),\s*580px\);/s);
assert.match(styles, /\.folder-window-titlebar\s*\{[^}]*height:\s*48px;/s);
assert.match(styles, /\.folder-window-work \.folder-file b\s*\{[^}]*font-size:\s*14px;/s);
```

- [ ] **Step 2: Run the focused contract and confirm failure**

Run: `node --test --test-name-pattern="folder windows" tests/aiPageContracts.test.mjs`

Expected: FAIL because the current dialog is `1000 × 572px`, its title bar is `54px`, and Work titles inherit `15px`.

- [ ] **Step 3: Apply the Work sizing and typography rules**

```css
.folder-window-work {
  width: min(calc(100% - 64px), 1150px);
  height: min(calc(100% - 64px), 580px);
}

.folder-window-titlebar { height: 48px; }
.folder-window-body { height: calc(100% - 48px); }
.folder-window-work .folder-file b { font-size: 14px; }
```

- [ ] **Step 4: Re-run the focused contract**

Run: `node --test --test-name-pattern="folder windows" tests/aiPageContracts.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the Work dialog change**

```bash
git add src/styles.css tests/aiPageContracts.test.mjs
git commit -m "style: refine work dialog proportions"
```

---

### Task 2: Add testable film geometry and local image assets

**Files:**
- Create: `src/lifeGallery.js`
- Create: `tests/lifeGallery.test.mjs`
- Create: `public/assets/figma/life-profile.png`
- Create: `public/assets/figma/life-film-roll.png`
- Create: `public/assets/life/scenery-01.jpg`
- Create: `public/assets/life/scenery-02.jpg`
- Create: `public/assets/life/scenery-03.jpg`
- Create: `public/assets/life/scenery-04.jpg`
- Create: `public/assets/life/scenery-05.jpg`

**Interfaces:**
- Produces: `classifyPhotoAspect(width, height)`, `getFilmFrameWidth(kind)`, and `wrapFilmOffset(offset, sequenceWidth)`.
- Produces: local, non-expiring image URLs consumed by `LIFE_PHOTOS` in Task 3.

- [ ] **Step 1: Write failing unit tests for aspect classification and wrapping**

Create `tests/lifeGallery.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyPhotoAspect,
  getFilmFrameWidth,
  wrapFilmOffset
} from "../src/lifeGallery.js";

test("classifies natural photo ratios without changing them", () => {
  assert.equal(classifyPhotoAspect(1600, 900), "landscape");
  assert.equal(classifyPhotoAspect(900, 1600), "portrait");
  assert.equal(classifyPhotoAspect(1200, 1100), "square");
});

test("assigns wider exposure cells without cropping source pixels", () => {
  assert.deepEqual(getFilmFrameWidth("landscape"), { width: 312, fit: "contain" });
  assert.deepEqual(getFilmFrameWidth("portrait"), { width: 172, fit: "contain" });
  assert.deepEqual(getFilmFrameWidth("square"), { width: 238, fit: "contain" });
});

test("wraps either direction into one repeated film sequence", () => {
  assert.equal(wrapFilmOffset(1010, 1000), 10);
  assert.equal(wrapFilmOffset(-12, 1000), 988);
  assert.equal(wrapFilmOffset(500, 1000), 500);
});
```

- [ ] **Step 2: Run the new unit test and confirm failure**

Run: `node --test tests/lifeGallery.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lifeGallery.js`.

- [ ] **Step 3: Implement the pure film geometry module**

Create `src/lifeGallery.js`:

```js
const FRAME_GEOMETRY = {
  landscape: { width: 312, fit: "contain" },
  portrait: { width: 172, fit: "contain" },
  square: { width: 238, fit: "contain" }
};

export function classifyPhotoAspect(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return "square";
  const ratio = width / height;
  if (ratio >= 1.2) return "landscape";
  if (ratio <= 0.82) return "portrait";
  return "square";
}

export function getFilmFrameWidth(kind) {
  return FRAME_GEOMETRY[kind] || FRAME_GEOMETRY.square;
}

export function wrapFilmOffset(offset, sequenceWidth) {
  if (!Number.isFinite(sequenceWidth) || sequenceWidth <= 0) return 0;
  return ((offset % sequenceWidth) + sequenceWidth) % sequenceWidth;
}
```

- [ ] **Step 4: Download and localize the exact Figma portrait and scenic images**

Run:

```bash
mkdir -p public/assets/life
curl -L "https://www.figma.com/api/mcp/asset/f17b573b-8470-40ab-9bf3-fb7e10b4a5a8.png" -o public/assets/figma/life-profile.png
curl -L "https://www.figma.com/api/mcp/asset/70a5dc10-d255-49d5-a788-7351caa6056d.png" -o public/assets/figma/life-film-roll.png
curl -L "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=max&w=1800&q=88" -o public/assets/life/scenery-01.jpg
curl -L "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=max&w=1800&q=88" -o public/assets/life/scenery-02.jpg
curl -L "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=max&w=1800&q=88" -o public/assets/life/scenery-03.jpg
curl -L "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=max&w=1800&q=88" -o public/assets/life/scenery-04.jpg
curl -L "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=max&w=1800&q=88" -o public/assets/life/scenery-05.jpg
```

Confirm each file is non-empty with: `find public/assets/life public/assets/figma/life-profile.png public/assets/figma/life-film-roll.png -type f -size +10k -print`

Expected: seven paths are printed.

- [ ] **Step 5: Run the geometry tests**

Run: `node --test tests/lifeGallery.test.mjs`

Expected: 3 tests PASS.

- [ ] **Step 6: Commit geometry and assets**

```bash
git add src/lifeGallery.js tests/lifeGallery.test.mjs public/assets/figma/life-profile.png public/assets/figma/life-film-roll.png public/assets/life
git commit -m "feat: add life film geometry and photo assets"
```

---

### Task 3: Build the full-screen Life page and Figma intro panel

**Files:**
- Modify: `src/main.jsx:1-120, 760-855, 2600-2725`
- Modify: `src/styles.css:430-535`
- Modify: `tests/aiPageContracts.test.mjs`

**Interfaces:**
- Consumes: `classifyPhotoAspect` and `getFilmFrameWidth` from `src/lifeGallery.js`.
- Produces: `LifeGallery({ onClose })`, `LifeIntroPanel()`, `FilmFrame({ photo })`, and `LIFE_PHOTOS`.
- Leaves: Work and Playground on the existing `FolderWindow` path.

- [ ] **Step 1: Add a failing integration contract for full-screen Life routing**

Append a test in `tests/aiPageContracts.test.mjs`:

```js
test("Life opens as a full-screen Figma-based page with uncropped photo frames", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /function LifeGallery\(\{ onClose \}\)/);
  assert.match(source, /function LifeIntroPanel\(\)/);
  assert.match(source, /openedFolder === "life"[\s\S]*<LifeGallery/);
  assert.match(source, /className="life-gallery-close"/);
  assert.match(source, /if \(event\.key === "Escape"\) onClose\(\)/);
  assert.match(styles, /\.life-gallery\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*grid-template-columns:\s*67\.2%\s*32\.8%;/s);
  assert.match(styles, /\.life-intro-panel\s*\{[^}]*background:\s*#dbebe0;/s);
  assert.match(styles, /\.film-frame img\s*\{[^}]*object-fit:\s*contain;/s);
  assert.doesNotMatch(styles, /\.film-frame img\s*\{[^}]*object-fit:\s*cover;/s);
});
```

- [ ] **Step 2: Run the integration contract and confirm failure**

Run: `node --test --test-name-pattern="Life opens" tests/aiPageContracts.test.mjs`

Expected: FAIL because `LifeGallery` does not exist.

- [ ] **Step 3: Add imports and the Life photo collection**

At the top of `src/main.jsx`, add:

```js
import { classifyPhotoAspect, getFilmFrameWidth, wrapFilmOffset } from "./lifeGallery.js";

const LIFE_PHOTOS = [
  ["/assets/life/scenery-01.jpg", "Mountain lake and forest"],
  ["/assets/figma/life-1.png", "Travel sign inside an old building"],
  ["/assets/life/scenery-02.jpg", "Open mountain landscape"],
  ["/assets/figma/life-mango.png", "Green mango held in sunlight"],
  ["/assets/life/scenery-03.jpg", "Forest in soft daylight"],
  ["/assets/life/scenery-04.jpg", "Wide valley view"],
  ["/assets/figma/life-3.png", "Weathered trading company sign"],
  ["/assets/life/scenery-05.jpg", "Road through a distant landscape"]
].map(([src, alt], index) => ({ src, alt, frameNumber: index + 1 }));
```

- [ ] **Step 4: Implement `LifeIntroPanel` and `FilmFrame`**

Add before `FolderWindow`:

```jsx
function LifeIntroPanel() {
  return (
    <motion.section
      className="life-intro-panel"
      initial={{ opacity: 0, x: -32, scale: 0.985 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.99 }}
      transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="life-intro-content">
        <img className="life-profile-photo" src={asset("life-profile.png")} alt="Liao Kongqing" />
        <p className="life-greeting">👋 Hey, I'm Liao Kongqing</p>
        <h1 className="life-title">
          <span>a <mark>designer</mark></span>
          <span>making products</span>
          <span>simple and intuitive.</span>
        </h1>
        <p className="life-bio">When I’m not designing, I’m probably watching a good film, getting a workout in, cycling around the city, or planning my next trip with friends. I love discovering new places, finding great food and sweet treats, and collecting little memories from everywhere I go.</p>
      </div>
      <span className="life-panel-arrow" aria-hidden="true">→</span>
    </motion.section>
  );
}

function FilmFrame({ photo }) {
  const [ratio, setRatio] = useState(photo.ratio || "square");
  const [failed, setFailed] = useState(false);
  const geometry = getFilmFrameWidth(ratio);
  return (
    <figure className={`film-frame film-frame-${ratio} ${failed ? "is-error" : ""}`} style={{ "--film-frame-width": `${geometry.width}px` }}>
      <span className="film-exposure">
        <img
          src={photo.src}
          alt={photo.alt}
          draggable="false"
          onLoad={(event) => {
            if (photo.ratio) return;
            setRatio(classifyPhotoAspect(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight));
          }}
          onError={() => setFailed(true)}
        />
      </span>
      <figcaption aria-hidden="true">{String(photo.frameNumber).padStart(2, "0")} · 36A</figcaption>
    </figure>
  );
}
```

- [ ] **Step 5: Add `LifeGallery` shell and route it separately from `FolderWindow`**

Add the shell with a temporary static film sequence; Task 4 replaces the sequence with `FilmStrip`:

```jsx
function LifeGallery({ onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <motion.div
      className="life-gallery"
      initial={{ opacity: 0, scale: 1.012 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.992 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <button type="button" className="life-gallery-close" onClick={onClose} aria-label="关闭 Life 并返回首页"><Icon name="close" size={20} /></button>
      <LifeIntroPanel />
      <motion.section
        className="life-film-stage"
        aria-label="Life photo film gallery"
        initial={{ opacity: 0, x: 48 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 28 }}
        transition={{ duration: 0.48, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <img className="life-film-roll" src={asset("life-film-roll.png")} alt="" aria-hidden="true" />
        <div className="film-strip-static">{LIFE_PHOTOS.map((photo) => <FilmFrame key={photo.src} photo={photo} />)}</div>
      </motion.section>
    </motion.div>
  );
}
```

Change the existing rendering branch to:

```jsx
{openedFolder === "life" && !activeProject && (
  <LifeGallery key="life-gallery" onClose={() => setOpenedFolder(null)} />
)}
{openedFolder && openedFolder !== "life" && !activeProject && (
  <FolderWindow
    key={`folder-${openedFolder}`}
    folder={openedFolder}
    onClose={() => setOpenedFolder(null)}
    onOpenProject={openProject}
  />
)}
```

- [ ] **Step 6: Add the 1:1 desktop layout and uncropped frame CSS**

```css
.life-gallery {
  position: absolute;
  inset: 0;
  z-index: 120;
  display: grid;
  grid-template-columns: 67.2% 32.8%;
  overflow: hidden;
  background: #fff;
}
.life-intro-panel { position: relative; overflow: hidden; background: #dbebe0; }
.life-intro-content { position: absolute; top: 13.78%; left: 7.34%; width: 87.9%; }
.life-profile-photo { display: block; width: 252px; height: 252px; object-fit: contain; }
.life-greeting { margin: 14px 0 0; color: #111; font: 400 24px/40px Epilogue, sans-serif; }
.life-title { display: grid; margin: 22px 0 0; color: #000; font: 400 clamp(44px, 4.45vw, 64px)/1.075 Epilogue, sans-serif; letter-spacing: -.035em; }
.life-title span { display: block; }
.life-title mark { padding: 0 .05em; color: #dbebe0; background: #000; }
.life-bio { width: min(79.1%, 766px); margin: 42px 0 0; color: #6e695f; font: 400 15px/24.2px Epilogue, sans-serif; }
.life-panel-arrow { position: absolute; top: 49%; right: 10px; font-size: 32px; }
.life-film-stage { position: relative; display: grid; min-width: 0; place-items: center; overflow: hidden; background: #fff; }
.life-film-roll { position: absolute; top: 50%; left: 24px; z-index: 2; width: min(50%, 235px); height: auto; transform: translateY(-50%); pointer-events: none; }
.film-strip-static { display: flex; align-items: center; }
.film-frame { position: relative; flex: 0 0 var(--film-frame-width); width: var(--film-frame-width); margin: 0 10px; }
.film-exposure { display: grid; height: 334px; place-items: center; overflow: hidden; background: #090909; }
.film-frame img { display: block; width: 100%; height: 100%; object-fit: contain; }
.film-frame.is-error .film-exposure::after { color: rgba(255,255,255,.42); font: 500 11px/16px Inter, sans-serif; letter-spacing: .08em; content: "FRAME UNAVAILABLE"; }
```

- [ ] **Step 7: Run the integration contract**

Run: `node --test --test-name-pattern="Life opens" tests/aiPageContracts.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit the full-screen shell and Figma panel**

```bash
git add src/main.jsx src/styles.css tests/aiPageContracts.test.mjs
git commit -m "feat: add fullscreen life gallery shell"
```

---

### Task 4: Implement the continuous film strip, drag, wheel, and inertia

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/styles.css`
- Modify: `tests/aiPageContracts.test.mjs`

**Interfaces:**
- Consumes: `LIFE_PHOTOS`, `FilmFrame`, and `wrapFilmOffset(offset, sequenceWidth)`.
- Produces: `FilmStrip({ photos })` with duplicated sequences, continuous sprocket rhythm, automatic movement, pointer drag, horizontal wheel input, and reduced-motion fallback.

- [ ] **Step 1: Extend the integration test with continuous-strip contracts**

Add assertions to the Life test:

```js
assert.match(source, /function FilmStrip\(\{ photos \}\)/);
assert.match(source, /\[0, 1\]\.map\(\(copy\)/);
assert.match(source, /wrapFilmOffset/);
assert.match(source, /requestAnimationFrame/);
assert.match(source, /onPointerDown=\{startDrag\}/);
assert.match(source, /onWheel=\{handleWheel\}/);
assert.match(styles, /\.film-strip-track::before/);
assert.match(styles, /\.film-strip-track::after/);
assert.match(styles, /repeating-linear-gradient/);
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test --test-name-pattern="Life opens" tests/aiPageContracts.test.mjs`

Expected: FAIL because the static sequence has no duplicated track or motion handlers.

- [ ] **Step 3: Implement `FilmStrip` with one wrapped motion value**

Add to `src/main.jsx`:

```jsx
function FilmStrip({ photos }) {
  const trackRef = useRef(null);
  const sequenceRef = useRef(null);
  const dragging = useRef(false);
  const lastPointerX = useRef(0);
  const lastPointerTime = useRef(0);
  const velocity = useRef(0);
  const resumeAt = useRef(0);
  const offset = useMotionValue(0);
  const trackX = useTransform(offset, (value) => -value);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return undefined;
    let frame;
    let previous = performance.now();
    const tick = (now) => {
      const elapsed = Math.min(40, now - previous);
      previous = now;
      const sequenceWidth = sequenceRef.current?.offsetWidth || 0;
      if (!dragging.current && sequenceWidth > 0) {
        if (Math.abs(velocity.current) > 0.004) {
          offset.set(wrapFilmOffset(offset.get() + velocity.current * elapsed, sequenceWidth));
          velocity.current *= Math.pow(0.92, elapsed / 16.67);
        } else if (now >= resumeAt.current) {
          offset.set(wrapFilmOffset(offset.get() + 0.026 * elapsed, sequenceWidth));
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [offset, shouldReduceMotion]);

  const startDrag = (event) => {
    dragging.current = true;
    velocity.current = 0;
    lastPointerX.current = event.clientX;
    lastPointerTime.current = performance.now();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!dragging.current) return;
    const sequenceWidth = sequenceRef.current?.offsetWidth || 0;
    const now = performance.now();
    const delta = lastPointerX.current - event.clientX;
    const elapsed = Math.max(8, now - lastPointerTime.current);
    offset.set(wrapFilmOffset(offset.get() + delta, sequenceWidth));
    velocity.current = delta / elapsed;
    lastPointerX.current = event.clientX;
    lastPointerTime.current = now;
  };

  const endDrag = () => {
    dragging.current = false;
    resumeAt.current = performance.now() + 800;
    if (shouldReduceMotion) velocity.current = 0;
  };

  const handleWheel = (event) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    const sequenceWidth = sequenceRef.current?.offsetWidth || 0;
    offset.set(wrapFilmOffset(offset.get() + event.deltaX, sequenceWidth));
    velocity.current = shouldReduceMotion ? 0 : event.deltaX / 18;
    resumeAt.current = performance.now() + 800;
  };

  return (
    <div
      className="film-strip-viewport"
      ref={trackRef}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={handleWheel}
    >
      <motion.div className="film-strip-track" style={{ x: trackX }}>
        {[0, 1].map((copy) => (
          <div className="film-strip-sequence" ref={copy === 0 ? sequenceRef : undefined} key={copy} aria-hidden={copy === 1}>
            {photos.map((photo) => <FilmFrame key={`${copy}-${photo.src}`} photo={photo} />)}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
```

Replace `film-strip-static` inside `LifeGallery` with `<FilmStrip photos={LIFE_PHOTOS} />`.

- [ ] **Step 4: Add the continuous film material, sprockets, and edge numbering**

```css
.film-strip-viewport { width: 100%; overflow: hidden; touch-action: pan-y; cursor: grab; }
.film-strip-viewport:active { cursor: grabbing; }
.film-strip-track {
  position: relative;
  display: flex;
  width: max-content;
  min-height: 460px;
  align-items: center;
  padding: 58px 0;
  color: rgba(255,255,255,.72);
  background: linear-gradient(#111, #050505 48%, #0c0c0c);
  box-shadow: 0 18px 42px rgba(10,10,10,.18), inset 0 1px rgba(255,255,255,.12);
  user-select: none;
  will-change: transform;
}
.film-strip-track::before,
.film-strip-track::after {
  position: absolute;
  right: 0;
  left: 0;
  height: 24px;
  background: repeating-linear-gradient(90deg, transparent 0 9px, #f7f7f2 9px 23px, transparent 23px 32px);
  content: "";
}
.film-strip-track::before { top: 13px; }
.film-strip-track::after { bottom: 13px; }
.film-strip-sequence { display: flex; flex: 0 0 auto; align-items: center; padding: 0 8px; }
.film-frame { position: relative; flex: 0 0 var(--film-frame-width); width: var(--film-frame-width); margin: 0 10px; }
.film-exposure { display: grid; height: 334px; place-items: center; overflow: hidden; border: 2px solid #262626; background: #090909; }
.film-frame img { display: block; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
.film-frame figcaption { position: absolute; right: 3px; bottom: -35px; margin: 0; font: 500 9px/12px Inter, sans-serif; letter-spacing: .13em; }
```

- [ ] **Step 5: Run the focused integration and unit tests**

Run: `node --test tests/lifeGallery.test.mjs tests/aiPageContracts.test.mjs`

Expected: all selected tests PASS.

- [ ] **Step 6: Commit the continuous film implementation**

```bash
git add src/main.jsx src/styles.css tests/aiPageContracts.test.mjs
git commit -m "feat: add continuous inertial film strip"
```

---

### Task 5: Add responsive behavior, reduced motion, and complete verification

**Files:**
- Modify: `src/styles.css`
- Modify: `tests/aiPageContracts.test.mjs`

**Interfaces:**
- Consumes: completed `LifeGallery` and `FilmStrip`.
- Produces: mobile stacking, keyboard-visible close control, reduced-motion behavior, and final verified build.

- [ ] **Step 1: Add failing responsive and accessibility contracts**

Extend the Life integration test:

```js
assert.match(styles, /@media \(max-width:\s*760px\)[\s\S]*\.life-gallery\s*\{[^}]*grid-template-columns:\s*1fr;/s);
assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.film-strip-track/s);
assert.match(styles, /\.life-gallery-close:focus-visible/);
```

- [ ] **Step 2: Run the focused contract and confirm failure**

Run: `node --test --test-name-pattern="Life opens" tests/aiPageContracts.test.mjs`

Expected: FAIL until the responsive and reduced-motion rules are present.

- [ ] **Step 3: Add fixed close-button, responsive, and reduced-motion CSS**

```css
.life-gallery-close {
  position: fixed;
  top: 24px;
  left: 24px;
  z-index: 5;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(17,17,17,.1);
  border-radius: 50%;
  color: #111;
  background: rgba(255,255,255,.68);
  box-shadow: 0 8px 24px rgba(17,17,17,.08);
  backdrop-filter: blur(14px);
  cursor: pointer;
}
.life-gallery-close:hover { background: rgba(255,255,255,.88); transform: rotate(4deg); }
.life-gallery-close:focus-visible { outline: 2px solid #111; outline-offset: 3px; }

@media (max-width: 760px) {
  .life-gallery { grid-template-columns: 1fr; grid-template-rows: minmax(640px, 100dvh) 520px; overflow-y: auto; }
  .life-intro-content { top: 112px; left: 24px; width: calc(100% - 48px); }
  .life-profile-photo { width: 176px; height: 176px; }
  .life-title { font-size: clamp(40px, 12vw, 58px); }
  .life-bio { width: 100%; margin-top: 32px; }
  .life-panel-arrow { display: none; }
  .life-film-stage { min-height: 520px; }
}

@media (prefers-reduced-motion: reduce) {
  .life-gallery, .life-intro-panel, .film-strip-track { transition-duration: .01ms !important; animation: none !important; }
  .film-strip-viewport { scroll-behavior: auto; }
}
```

- [ ] **Step 4: Run the complete automated suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Build production assets**

Run: `npm run build`

Expected: Vite completes without errors and emits `dist/assets` bundles.

- [ ] **Step 6: Perform desktop visual verification**

Run the existing dev server and open `http://127.0.0.1:5173/`. Verify:

1. Work dialog measures approximately `1150 × 580px` at the design canvas scale, has a shorter title bar, and uses `14px` project titles.
2. Life enters full screen without showing the folder modal backdrop or title bar.
3. The left panel matches the Figma screenshot: `#DBEBE0`, portrait at the same start point, three-line title, black reversed `designer`, and matching body-copy width.
4. Every film photo is fully visible, including all four image edges; any unused exposure area is black.
5. Sprocket holes remain continuous across variable-width exposure frames.
6. Dragging temporarily owns the strip, releases with mild inertia, and returns to steady automatic movement.
7. The fixed close button and Escape both return to the unchanged home scene.

- [ ] **Step 7: Perform narrow-screen and reduced-motion verification**

At a viewport narrower than `760px`, confirm the intro stacks above the film without horizontal page overflow. Emulate reduced motion and confirm the strip remains draggable but does not move automatically after release.

- [ ] **Step 8: Commit final responsive and accessibility polish**

```bash
git add src/styles.css tests/aiPageContracts.test.mjs
git commit -m "fix: complete life gallery responsive behavior"
```
