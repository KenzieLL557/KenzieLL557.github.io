import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("AI project review fixes remain represented in page copy and styles", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /我整理了相关提示词与流程，并在组会上向团队内部成员分享/);
  assert.match(styles, /\.ai-section blockquote\s*\{[^}]*border-radius:\s*0;/s);
  assert.match(styles, /\.ai-kicker em\s*\{[^}]*margin-left:\s*5px;/s);
  assert.match(styles, /\.ai-aigc-carousel-stage img\s*\{[^}]*object-fit:\s*contain;[^}]*border-radius:\s*12px;/s);
  assert.match(styles, /\.ai-role-impact-list article\s*\{[^}]*border:\s*1px solid var\(--ai-line\);[^}]*border-radius:\s*12px;/s);
});

test("AI before-after handle mirrors the Xiaoluo two-arrow control", async () => {
  const styles = await readFile(new URL("src/styles.css", root), "utf8");

  assert.match(styles, /\.ai-compare-handle\s*\{[^}]*top:\s*0;[^}]*bottom:\s*0;[^}]*border:\s*0;[^}]*background:\s*transparent;/s);
  assert.match(styles, /\.ai-compare-handle span\s*\{[^}]*width:\s*38px;[^}]*height:\s*38px;/s);
  assert.match(styles, /\.ai-compare-handle span::after\s*\{[^}]*right:\s*10px;[^}]*rotate\(135deg\)/s);
});

test("latest AI article content and presentation feedback is preserved", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /从零散尝试，到可复用的设计方法/);
  assert.match(source, /各大厂商也在持续更新 AI Chat 组件体系/);
  assert.match(source, /一天内完成一套可用于后续设计与开发协作的基础规范/);
  assert.match(source, /aigc-health-exam-flow\.webp/);
  assert.match(source, /aigc-digital-care-scenes\.webp/);
  assert.match(source, /className="ai-compare-caption">Before\/After/);
  assert.match(source, /<h4>可利用 AI<\/h4>/);
  assert.match(source, /<h4>需要注意<\/h4>/);
  assert.doesNotMatch(source, /AI 加速需求梳理与生成，设计师负责判断和质量控制/);
  assert.match(styles, /\.ai-section \.section-copy\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*none;/s);
  assert.match(styles, /\.ai-solution-compare\s*\{[^}]*border:\s*0;/s);
});

test("homepage social links use the approved proximity dock interaction", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /const TOP_DOCK = \{ size: 36, magnification: 46, distance: 120 \};/);
  assert.match(source, /function TopDockLink/);
  assert.match(source, /useMotionValue\(Infinity\)/);
  assert.match(source, /useTransform\(\s*distance,\s*\[-TOP_DOCK\.distance, 0, TOP_DOCK\.distance\]/);
  assert.match(source, /top-dock-link/);
  assert.match(styles, /\.top-nav nav\s*\{[^}]*height:\s*42px;[^}]*background:\s*rgba\(255, 255, 255, \.1\);/s);
  assert.match(source, /style=\{\{ width: itemSize, height: TOP_DOCK\.size \}\}/);
  assert.match(styles, /\.top-dock-link\s*\{[^}]*will-change:\s*width, height;/s);
});

test("latest AI copy edits and AIGC image removal are preserved", async () => {
  const source = await readFile(new URL("src/main.jsx", root), "utf8");

  assert.match(source, /因此我们也开始着手搭建自己的组件库/);
  assert.match(source, /在基础组件与设计规范建设中/);
  assert.match(source, /以小罗项目为例/);
  assert.doesNotMatch(source, /aigc-avatar-doctor\.webp/);
});

test("QF and XT image projects are wired into the work folder and lazy gallery", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /\["轻流", "低代码业务系统搭建平台", "qf"/);
  assert.match(source, /\["心田花开", "教育产品体验设计与品牌升级", "xt"/);
  assert.match(source, /#work\/qf/);
  assert.match(source, /#work\/xt/);
  assert.match(source, /function ImageArchiveProjectDetail/);
  assert.match(source, /loading=\{index === 0 \? "eager" : "lazy"\}/);
  assert.match(styles, /\.image-archive-gallery\s*\{[^}]*display:\s*grid;/s);
});

test("homepage dock expands spacing while icons stay fixed inside a bounded hover circle", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.doesNotMatch(source, /style=\{\{ scale \}\}/);
  assert.match(source, /const targetSize = useTransform/);
  assert.doesNotMatch(source, /targetIconSize/);
  assert.match(source, /style=\{\{ width: itemSize, height: TOP_DOCK\.size \}\}/);
  assert.match(source, /className="top-dock-icon-shell"/);
  assert.match(styles, /\.top-dock-link\s*\{[^}]*min-width:\s*36px;[^}]*min-height:\s*36px;[^}]*background:\s*transparent;/s);
  assert.match(styles, /\.top-dock-icon-shell\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px;[^}]*border-radius:\s*50%;/s);
  assert.match(styles, /\.top-dock-link:hover \.top-dock-icon-shell\s*\{[^}]*background:\s*rgba\(255, 255, 255, \.18\);/s);
  assert.match(styles, /\.top-dock-icon\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;[^}]*object-fit:\s*contain;/s);
  assert.match(source, /label="wechat"/);
  assert.match(source, /const \[qrOpen, setQrOpen\] = useState\(false\);/);
  assert.match(source, /aria-expanded=\{qrCode \? qrOpen : undefined\}/);
  assert.match(source, /home-wechat-qr\.webp/);
  assert.doesNotMatch(source, /top-dock-tooltip/);
  assert.match(styles, /\.top-dock-qr-popover\s*\{[^}]*opacity:\s*0;/s);
  assert.match(styles, /\.top-dock-link\.is-qr-open \.top-dock-qr-popover[^}]*opacity:\s*1;/s);
  assert.doesNotMatch(styles, /\.top-dock-link:hover \.top-dock-qr-popover/);
  assert.match(styles, /\.top-nav nav\s*\{[^}]*transform:\s*translateY\(0\);/s);
});

test("Playground opens without a live full-screen blur and pauses the animated desktop", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  const folderModalRule = styles.match(/\.folder-modal\s*\{[^}]*\}/s)?.[0] || "";
  assert.match(folderModalRule, /cursor:\s*default;/);
  assert.doesNotMatch(folderModalRule, /backdrop-filter:/);
  assert.match(source, /<PixelCowCat paused=\{Boolean\(openedFolder \|\| resumeOpen \|\| activeProject\)\}\s*\/>/);
});

test("the cat reacts while held and the Life folder uses contrasting clean photos", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /function PixelCowCat\(\{ paused = false \}\)/);
  assert.match(source, /className="pixel-cat-speech"[^>]*>Meow~</);
  assert.match(styles, /\.pixel-cat-runner\.is-held \.pixel-cat-speech\s*\{[^}]*opacity:\s*1;/s);
  assert.match(source, /folder-sheet-back[^\n]*home-life-seaside\.jpg/);
  assert.match(source, /folder-sheet-middle[^\n]*home-life-snow\.jpg/);
  assert.match(source, /folder-cover-life[\s\S]{0,180}home-life-film-03\.jpg/);
  assert.match(styles, /\.pixel-cat-speech\s*\{[^}]*bottom:\s*55px;[^}]*border:\s*1px solid/s);
});

test("homepage and Life gallery defer heavy photo downloads", async () => {
  const source = await readFile(new URL("src/main.jsx", root), "utf8");

  assert.match(source, /\{qrCode && qrOpen && \(/);
  assert.match(source, /previewSrc:\s*`\/assets\/life\/previews\/\$\{previewFile\}`/);
  assert.match(source, /src=\{photo\.previewSrc\}/);
  assert.match(source, /src=\{photo\.src\}/);
});

test("QF and XT archives use fixed project metadata beside a seamless scrolling canvas", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /period:\s*"2022 Q1–Q2"/);
  assert.match(source, /team:\s*"独立设计师"/);
  assert.match(source, /role:\s*"前期调研 · 产品设计"/);
  assert.match(source, /period:\s*"2021 Q1–Q2"/);
  assert.match(source, /team:\s*"3 位设计师合作"/);
  assert.match(source, /className="image-archive-sidebar"/);
  assert.match(source, /className="image-archive-scroll"/);
  assert.match(styles, /\.image-archive-layout\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:/s);
  assert.match(styles, /\.image-archive-scroll\s*\{[^}]*overflow-y:\s*auto;/s);
  assert.match(styles, /\.image-archive-gallery\s*\{[^}]*gap:\s*0;/s);
  assert.match(styles, /\.image-archive-page\s*\{[^}]*border:\s*0;[^}]*border-radius:\s*0;[^}]*box-shadow:\s*none;/s);
});

test("folder windows stay fixed, work projects use five columns, and archive headers use white glass layout space", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  const folderWindowSource = source.slice(
    source.indexOf("function FolderWindow"),
    source.indexOf("function ResumeShortcut")
  );
  assert.doesNotMatch(folderWindowSource, /dragMomentum=\{false\}/);
  assert.doesNotMatch(folderWindowSource, /Selected product design case studies/);
  assert.match(source, /className=\{`folder-window folder-window-\$\{folder\}`\}/);
  assert.doesNotMatch(styles, /\.folder-window:active\s*\{[^}]*cursor:\s*grabbing;/s);
  assert.match(styles, /\.folder-window-work \.folder-file-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/s);
  assert.match(styles, /\.folder-window-work\s*\{[^}]*width:\s*min\(calc\(100%\s*-\s*64px\),\s*1150px\);[^}]*height:\s*min\(calc\(100%\s*-\s*64px\),\s*580px\);/s);
  assert.match(styles, /\.folder-window-titlebar\s*\{[^}]*height:\s*48px;/s);
  assert.match(styles, /\.folder-file-work \.folder-file-copy b\s*\{[^}]*font-size:\s*14px;/s);
  assert.doesNotMatch(folderWindowSource, /\{files\.length\}\s*items/);
  assert.match(source, /<motion\.button[\s\S]*custom=\{index\}[\s\S]*variants=\{workCardVariants\}/);
  assert.match(source, /staggerChildren/);
  assert.match(styles, /\.folder-file-cover\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9;[^}]*height:\s*auto;/s);
  assert.match(styles, /\.folder-file-cover img\s*\{[^}]*object-fit:\s*contain;/s);
  assert.match(source, /image-archive-shell image-archive-\$\{project\} \$\{headerHidden \? "is-header-hidden" : ""\}/);
  assert.match(source, /className=\{`project-header image-archive-header \$\{headerHidden \? "is-hidden" : ""\}`\}/);
  assert.match(styles, /\.image-archive-shell\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*64px\s*minmax\(0,\s*1fr\);/s);
  assert.match(styles, /\.image-archive-shell\s*\{[^}]*background:\s*#fff;/s);
  assert.match(styles, /\.image-archive-shell\.is-header-hidden\s*\{[^}]*grid-template-rows:\s*0\s*minmax\(0,\s*1fr\);/s);
  assert.match(styles, /\.project-header\.image-archive-header\s*\{[^}]*position:\s*relative;[^}]*grid-row:\s*1;[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*\.76\);[^}]*backdrop-filter:\s*blur\(18px\)\s*saturate\(100%\);/s);
  assert.match(styles, /\.project-header\.image-archive-header\.is-hidden\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*translateY\(-72px\);/s);
  assert.match(styles, /\.image-archive-layout\s*\{[^}]*position:\s*relative;[^}]*grid-row:\s*2;/s);
  assert.doesNotMatch(styles, /\.image-archive-back\s*\{[^}]*top:\s*-24px;/s);
  assert.doesNotMatch(styles, /\.image-archive-scroll\s*\{[^}]*padding-top:\s*64px;/s);
  assert.match(styles, /\.image-archive-sidebar\s*\{[^}]*background:\s*#fff;/s);
  assert.match(styles, /\.image-archive-intro h1\s*\{[^}]*font-size:\s*34px;/s);
  assert.match(styles, /\.project-detail-shell\s*\{[^}]*--project-toc-top:\s*96px;[^}]*--project-toc-left:\s*64px;/s);
  assert.match(styles, /\.project-toc\s*\{[^}]*top:\s*var\(--project-toc-top\);[^}]*left:\s*var\(--project-toc-left\);/s);
  assert.match(styles, /\.xiaoluo-toc\s*\{[^}]*top:\s*var\(--project-toc-top\);/s);
  assert.doesNotMatch(source, /className="image-archive-index"/);
  assert.doesNotMatch(source, /title:\s*"心田花开 V8\.0"/);
  assert.doesNotMatch(source, /\["心田花开 V8\.0",/);
});

test("large displays expand dialogs and article canvases without vertically centering archive metadata", async () => {
  const styles = await readFile(new URL("src/styles.css", root), "utf8");

  assert.match(styles, /\.image-archive-intro\s*\{[^}]*margin-top:\s*clamp\(42px,\s*6vh,\s*72px\);/s);
  assert.match(styles, /\.resume-preview\s*>\s*\.mac-window-controls\s*\{[^}]*top:\s*29px;[^}]*transform:\s*translateY\(-50%\);/s);
  assert.match(styles, /\.resume-pdf-stage\s*\{[^}]*padding:\s*24px\s*clamp\(24px,\s*3vw,\s*48px\)\s*36px;/s);
  assert.match(styles, /@media\s*\(min-width:\s*1600px\)[\s\S]*?\.folder-window-work\s*\{[^}]*width:\s*min\(calc\(100%\s*-\s*80px\),\s*1320px\);[^}]*height:\s*min\(calc\(100%\s*-\s*80px\),\s*680px\);/s);
  assert.match(styles, /@media\s*\(min-width:\s*1600px\)[\s\S]*?\.resume-preview\s*\{[^}]*width:\s*min\(1360px,\s*calc\(100vw\s*-\s*96px\)\);[^}]*height:\s*min\(920px,\s*calc\(100dvh\s*-\s*72px\)\);/s);
  assert.match(styles, /@media\s*\(min-width:\s*1600px\)[\s\S]*?\.project-detail\s*>\s*section,[\s\S]*?width:\s*min\(1240px,\s*calc\(100vw\s*-\s*440px\)\);/s);
});

test("Life opens as a full-screen Figma-based page with uncropped photo frames", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /function LifeGallery\(\{ onClose \}\)/);
  assert.match(source, /function LifeIntroPanel\(\{ onExplore \}\)/);
  assert.match(source, /openedFolder === "life"[\s\S]*<LifeGallery/);
  const lifeSource = source.slice(source.indexOf("function FilmFrame"), source.indexOf("function FolderWindow"));
  const filmFrameSource = source.slice(source.indexOf("function FilmFrame"), source.indexOf("function FilmStrip"));
  assert.match(lifeSource, /role="dialog"/);
  assert.match(lifeSource, /aria-modal="true"/);
  assert.match(lifeSource, /aria-label="Life photo gallery"/);
  assert.match(lifeSource, /className="life-gallery-close"/);
  assert.match(lifeSource, /if \(event\.key === "Escape"\)/);
  assert.match(lifeSource, /if \(selectedPhoto\) setSelectedPhoto\(null\);\s*else onClose\(\);/s);
  assert.match(lifeSource, /function LifePhotoLightbox\(\{ photo, direction, onClose, onPrevious, onNext, shouldReduceMotion \}\)/);
  assert.doesNotMatch(lifeSource, /layoutId=\{`life-photo-\$\{photo\.frameNumber\}`\}/);
  assert.match(lifeSource, /const closeButtonRef = useRef\(null\);/);
  assert.match(lifeSource, /closeButtonRef\.current\?\.focus\(\);/);
  assert.match(lifeSource, /document\.addEventListener\("keydown", trapFocus\);/);
  assert.match(lifeSource, /previouslyFocusedElement\.current\?\.focus\(\);/);
  assert.match(filmFrameSource, /className="film-frame-fallback"/);
  assert.match(filmFrameSource, /aria-label=\{`Photo unavailable: \$\{photo\.alt\}`\}/);
  assert.match(source, /function FilmCanister\(\)/);
  for (const label of ["36", "CA135", "200", "FUJIFILM", "SUPERIA"]) {
    assert.match(source, new RegExp(`>${label}<`));
  }
  assert.match(lifeSource, /className="life-scroll-viewport"/);
  assert.match(lifeSource, /className="life-scroll-track"/);
  assert.match(lifeSource, /onWheel=\{handleLifeWheel\}/);
  assert.match(lifeSource, /onPointerDown=\{startLifeDrag\}/);
  assert.match(lifeSource, /onLostPointerCapture=\{endLifeDrag\}/);
  assert.match(lifeSource, /getLifeWheelScrollState/);
  assert.match(lifeSource, /getLifeKeyboardScrollTarget/);
  assert.match(lifeSource, /canStartLifeDrag/);
  assert.match(lifeSource, /getLifeFocusLoopTarget/);
  assert.match(lifeSource, /getLifeResetOptions/);
  assert.match(lifeSource, /event\.preventDefault\(\);/);
  assert.match(lifeSource, /scrollTo\(getLifeResetOptions\(shouldReduceMotion\)\)/);
  assert.match(lifeSource, /aria-label="回到起点"/);
  assert.match(source, /className="life-profile-photo"[^>]*draggable="false"/);
  assert.match(lifeSource, /requestAnimationFrame/);
  assert.doesNotMatch(lifeSource, /\[0, 1\]\.map/);
  assert.doesNotMatch(lifeSource, /life-film-roll/);
  assert.doesNotMatch(lifeSource, /wrapFilmOffset/);
  assert.match(styles, /\.life-scroll-track\s*\{[^}]*display:\s*flex;[^}]*width:\s*max-content;/s);
  assert.match(styles, /\.life-scroll-viewport\s*\{[^}]*overflow-y:\s*hidden;/s);
  assert.match(styles, /\.life-intro-panel\s*\{[^}]*overflow:\s*hidden;/s);
  assert.doesNotMatch(styles, /@media \(max-height:\s*720px\)[\s\S]*min-height:\s*860px;/s);
  assert.match(styles, /\.life-intro-panel\s*\{[^}]*flex:\s*0 0 69\.45vw;/s);
  assert.match(styles, /\.life-intro-panel\s*\{[^}]*background:\s*transparent;/s);
  assert.match(styles, /\.life-gallery\s*\{[^}]*--life-paper:\s*#dbebe0;/s);
  assert.match(source, /className="life-gallery-scenery"[^>]*life-hills\.webp/);
  assert.match(styles, /\.film-canister-art/);
  assert.doesNotMatch(source, /function FilmSprocketRow\(\{ position \}\)/);
  assert.doesNotMatch(source, /className=\{`film-sprocket-row film-sprocket-row-\$\{position\}`\}/);
  assert.match(styles, /\.film-strip-sequence::before\s*\{[^}]*background-repeat:\s*repeat-x/s);
  assert.match(styles, /--film-hole-pitch:/);
  assert.match(styles, /\.film-exposure\s*\{[^}]*border-radius:\s*0;/s);
  assert.doesNotMatch(styles, /grid-template-columns:\s*repeat\(6, var\(--film-hole-size\)\)/);
  assert.match(styles, /\.life-film-stage\s*\{[^}]*background:\s*rgba\(239,\s*247,\s*241,\s*\.42\);[^}]*backdrop-filter:\s*blur\(24px\)\s*saturate\(122%\)/s);
  assert.match(styles, /repeating-linear-gradient/);
  assert.match(styles, /\.film-frame img\s*\{[^}]*object-fit:\s*contain;/s);
  assert.doesNotMatch(styles, /\.film-frame img\s*\{[^}]*object-fit:\s*cover;/s);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.film-strip-track/s);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.life-gallery-close/s);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.life-gallery-close:hover\s*\{[^}]*transform:\s*none;/s);
  assert.match(styles, /\.folder-window-work\s*\{[^}]*min-height:\s*0;[^}]*max-height:\s*calc\(100%\s*-\s*64px\);/s);
  assert.match(styles, /\.life-gallery-close:focus-visible/);
  assert.match(styles, /\.folder-file-work \.folder-file-copy b\s*\{[^}]*font-size:\s*14px;/s);
});

test("Life gallery adds restrained guidance, inertial motion, continuous photo viewing, and layered image loading", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);
  const lifeSource = source.slice(source.indexOf("function LifeIntroPanel"), source.indexOf("function FolderWindow"));

  assert.match(styles, /@keyframes life-arrow-nudge/);
  assert.match(styles, /\.life-panel-arrow\s*\{[^}]*animation:\s*life-arrow-nudge/s);
  assert.doesNotMatch(lifeSource, /Scroll to explore|拖动浏览|\d+\s*\/\s*\d+.*life-panel-arrow/);
  assert.match(lifeSource, /getDampedScrollStep/);
  assert.match(lifeSource, /getLifeMomentumTarget/);
  assert.match(lifeSource, /aria-label="上一张照片"/);
  assert.match(lifeSource, /aria-label="下一张照片"/);
  assert.match(lifeSource, /event\.key === "ArrowLeft"/);
  assert.match(lifeSource, /event\.key === "ArrowRight"/);
  assert.match(lifeSource, /previewSrc/);
  assert.match(lifeSource, /loading="lazy"/);
  assert.match(lifeSource, /decoding="async"/);
  assert.match(lifeSource, /inert=\{Boolean\(selectedPhoto\)\}/);
  assert.match(styles, /--life-canister-tilt/);
  assert.match(styles, /--life-film-sheen-x/);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.life-panel-arrow/s);
});

test("Life gallery uses a clickable organic cue and a Figma-matched glass stage", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);
  const lifeSource = source.slice(source.indexOf("function LifeIntroPanel"), source.indexOf("function FolderWindow"));

  assert.match(lifeSource, /function LifeIntroPanel\(\{ onExplore \}\)/);
  assert.match(lifeSource, /className="life-panel-arrow"[^>]*onClick=\{onExplore\}/s);
  assert.match(lifeSource, /aria-label="浏览 Life 照片"/);
  assert.match(lifeSource, /animateLifeScrollTo\(Math.ceil\(filmStage\?\.offsetLeft/);
  assert.match(styles, /\.life-title mark\s*\{[^}]*transparent 0 24%,\s*var\(--life-ink\) 24% 78%,\s*transparent 78% 100%/s);
  assert.match(styles, /\.life-title-word::after\s*\{[^}]*clip-path:\s*inset\(24% 0 22% 0\)/s);
  assert.match(styles, /\.life-panel-arrow\s*\{[^}]*right:\s*28px;/s);
  assert.match(styles, /\.life-panel-arrow\s*\{[^}]*animation:\s*life-arrow-nudge\s+1600ms\s+ease-in-out\s+infinite;/s);
  assert.match(styles, /@keyframes life-arrow-nudge\s*\{\s*0%,\s*100%\s*\{[^}]*translate3d\(-2px,[^}]*\}\s*50%\s*\{[^}]*translate3d\(3px,/s);
  assert.match(styles, /\.life-film-stage\s*\{[^}]*background:\s*rgba\(239,\s*247,\s*241,\s*\.42\);[^}]*backdrop-filter:\s*blur\(24px\)\s*saturate\(122%\)/s);
  assert.match(styles, /\.life-story-copy\s*\{[^}]*left:\s*var\(--life-story-x,/s);
  assert.match(source, /function LifeStoryCopy\(\{ expanded \}\)/);
  assert.match(source, /const LIFE_STORY_TYPED_PREFIX = "I’m probably ";/);
  assert.match(source, /LIFE_STORY_BODY\.slice\(0, visibleCharacters\)/);
  assert.match(source, /animateLifeScrollTo\(Math.ceil\(filmStage\?\.offsetLeft[^\n]*,\s*\.19,\s*900\)/);
  const storySource = source.slice(source.indexOf("function LifeStoryCopy"), source.indexOf("function LifeIntroPanel"));
  assert.doesNotMatch(storySource, /AnimatePresence|key="life-story-/);
  assert.match(lifeSource, /onScroll=\{handleLifeScroll\}/);
  assert.match(styles, /\.film-strip-sequence\s*\{[^}]*repeating-linear-gradient/s);
  assert.match(styles, /\.film-canister-art\s*\{[^}]*margin:\s*clamp\(-17px,\s*-1\.93vh,\s*-10px\)\s+clamp\(8px,\s*1\.7vh,\s*15px\)\s+0\s+-20px;/s);
  assert.doesNotMatch(lifeSource, /layoutId=\{`life-photo-/);
});

test("Life restores the authored film scale, expands scenery responsively, and project home images never crop", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(styles, /\.film-strip-track\s*\{[^}]*--film-strip-height:\s*clamp\(340px,\s*56vh,\s*504px\);[^}]*--film-cap:\s*clamp\(62px,\s*8\.6vh,\s*78px\);/s);
  assert.match(styles, /\.film-canister-lead\s*\{[^}]*height:\s*clamp\(500px,\s*82\.56vh,\s*729px\);/s);
  assert.match(styles, /\.life-gallery-scenery\s*\{[^}]*left:\s*0;[^}]*bottom:\s*clamp\(-42px,\s*-3vh,\s*-22px\);[^}]*width:\s*100vw;/s);
  assert.match(styles, /@media \(min-width:\s*1600px\)[\s\S]*\.life-intro-content\s*\{[^}]*top:\s*50%;[^}]*transform:\s*translateY\(-50%\);/s);
  assert.match(styles, /\.dayi-detail \.project-hero,\s*\.xiaoluo-hero\s*\{[^}]*padding-top:\s*32px;/s);
  assert.match(styles, /\.xiaoluo-home-drafts button\s*\{[^}]*aspect-ratio:\s*8\s*\/\s*5;/s);
  assert.match(styles, /\.xiaoluo-home-drafts img\s*\{[^}]*object-fit:\s*contain;/s);
  assert.match(styles, /\.xiaoluo-compare-frame\s*\{[^}]*aspect-ratio:\s*8\s*\/\s*5;/s);
  assert.match(styles, /\.xiaoluo-compare-frame img\s*\{[^}]*object-fit:\s*contain;/s);
  assert.match(styles, /\.xiaoluo-after-interactive\s*\{[^}]*aspect-ratio:\s*8\s*\/\s*5;/s);
  assert.match(styles, /\.xiaoluo-after-interactive > img\s*\{[^}]*object-fit:\s*contain;/s);
  assert.match(source, /LIFE_STORY_TYPED_PREFIX\.length/);
  assert.match(styles, /@media \(max-height:\s*760px\)[\s\S]*\.life-story-copy\s*\{[^}]*top:\s*78px;/s);
});

test("work projects use the five supplied covers with supporting copy and tags", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  for (const cover of ["work-dayi.webp", "work-xiaoluo.webp", "work-ai.webp", "work-qf.webp", "work-xt.webp"]) {
    assert.match(source, new RegExp(cover.replace(".", "\\.")));
  }

  assert.match(source, /folder-file-work/);
  assert.match(source, /folder === "work"[^?]*\?[^:]*WORK_COVER_IMAGES\[cover\]/s);
  assert.match(source, /<small>\{description\}<\/small>/);
  assert.match(source, /<span className="folder-file-tags">\{tags\.map/);
  assert.match(styles, /\.folder-file-work\s*\{[^}]*border:\s*0;[^}]*box-shadow:\s*none;[^}]*text-align:\s*left;/s);
  assert.match(styles, /\.folder-file-work:hover\s*\{[^}]*background:\s*#e7edf4;[^}]*transform:\s*none;/s);
  assert.doesNotMatch(source, /folder-window-glyph/);
  assert.match(styles, /\.folder-file-work \.folder-file-copy small\s*\{[^}]*min-height:\s*0;[^}]*margin-top:\s*2px;/s);
  assert.match(styles, /\.folder-file-work \.folder-file-cover\s*\{[^}]*aspect-ratio:\s*8\s*\/\s*5;/s);
  assert.match(styles, /\.folder-file-work \.folder-file-cover img\s*\{[^}]*object-fit:\s*cover;/s);
  assert.match(styles, /\.folder-file-work:hover \.folder-file-cover img\s*\{[^}]*transform:\s*scale\(1\.04\);/s);
});

test("homepage shortcuts use the supplied objects with purposeful hover motion", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /home-work-typewriter-base\.webp/);
  assert.match(source, /home-playground-vinyl\.webp/);
  assert.match(source, /home-resume-notepad\.webp/);
  assert.doesNotMatch(source, /home-work-paper/);
  assert.doesNotMatch(styles, /home-typewriter-paper-out/);
  assert.match(styles, /\.home-work-typewriter\s*\{[^}]*width:\s*141px;[^}]*transition:\s*transform/s);
  assert.match(styles, /\.folder-work:hover \.home-work-typewriter\s*\{[^}]*transform:\s*rotate\(-15deg\)/s);
  assert.match(styles, /\.folder-playground:hover \.home-playground-vinyl\s*\{[^}]*animation:\s*home-vinyl-spin/s);
  assert.match(styles, /\.resume-shortcut:hover \.home-resume-notepad\s*\{[^}]*transform:\s*rotate\(15deg\)/s);
  assert.match(styles, /\.resume-shortcut:hover > span\s*\{[^}]*transform:\s*translateY\(-3px\)/s);
  assert.match(source, /function PixelCowCat\(\{ paused = false \}\)/);
  assert.match(source, /className="pixel-cat-patrol"/);
  assert.match(source, /const CAT_SPRITE_FRAMES\s*=\s*\[/);
  assert.match(source, /home-cow-cat-sprite\.webp/);
  assert.match(source, /<canvas[^>]*className="pixel-cat-sprite"/s);
  assert.match(source, /requestAnimationFrame\(drawFrame\)/);
  assert.doesNotMatch(source, /pixel-cow-cat-tail/);
  assert.doesNotMatch(source, /className="pixel-cow-cat"/);
  assert.match(source, /const CAT_PATROL_DURATION\s*=\s*28000/);
  assert.match(source, /dragConstraints=\{catDragConstraints\}/);
  assert.match(source, /animateMotion\(catY,\s*0,\s*\{[\s\S]*type:\s*"spring"/);
  assert.doesNotMatch(styles, /@keyframes pixel-cat-patrol/);
  assert.match(styles, /\.pixel-cat-sprite\s*\{[^}]*image-rendering:\s*pixelated;/s);
  assert.doesNotMatch(styles, /pixel-cat-(?:bob|tail|step)/);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*home-playground-vinyl/s);
});

test("clicking the desktop trees releases two pixel bees", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /function PixelBee\(/);
  assert.match(source, /function BeeBurst\(/);
  assert.match(source, /setBeeBurstKey\(\(key\) => key \+ 1\)/);
  assert.match(source, /\[0,\s*1\]\.map/);
  assert.match(styles, /\.pixel-bee\.pixel-bee-a/);
  assert.match(styles, /\.pixel-bee\.pixel-bee-b/);
  assert.match(styles, /@keyframes pixel-bee-flight-a/);
  assert.match(styles, /@keyframes pixel-bee-flight-b/);
});

test("homepage dialogs use mac controls with only the red dot wired to close", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /function MacWindowControls\(\{ onClose, label \}\)/);
  assert.match(source, /className="mac-window-dot mac-window-dot-close"/);
  assert.match(source, /<span className="mac-window-dot mac-window-dot-minimize"/);
  assert.match(source, /<span className="mac-window-dot mac-window-dot-zoom"/);
  assert.match(source, /<MacWindowControls onClose=\{onClose\} label="Close folder"/);
  assert.match(source, /<MacWindowControls onClose=\{onClose\} label="关闭简历预览"/);
  assert.doesNotMatch(source, /className="resume-preview-close"/);
  assert.match(styles, /\.mac-window-controls\s*\{[^}]*display:\s*flex;/s);
  assert.match(styles, /\.resume-preview-toolbar\s*\{[^}]*display:\s*flex;/s);
});

test("resume preview defaults to Chinese with a clean top toolbar and icon actions", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8")
  ]);

  assert.match(source, /const RESUME_DOCS = \[\s*\{\s*id:\s*"zh"/s);
  assert.match(source, /className="resume-language-switch"/);
  assert.doesNotMatch(source, /className="resume-preview-sidebar"/);
  assert.doesNotMatch(source, /English Resume/);
  assert.match(source, /data-tooltip="下载 PDF"/);
  assert.match(source, /data-tooltip="在新窗口打开"/);
  assert.match(source, /<Icon name="download"/);
  assert.match(source, /<Icon name="external"/);
  assert.match(source, /previewSrc:\s*"\/assets\/resume\/liao-kongqing-cn\.webp"/);
  assert.match(source, /className="resume-document-image"/);
  assert.doesNotMatch(source, /<iframe[\s\S]*?src=\{pdfSrc\}/);
  assert.match(styles, /\.resume-preview\s*\{[^}]*height:\s*min\(820px,/s);
  assert.match(styles, /\.resume-pdf-stage\s*\{[^}]*background:\s*#fff;/s);
  assert.match(styles, /\.resume-icon-action\[data-tooltip\]::after/);
});

test("Life gallery uses the approved green glass stage and centered designer highlight", async () => {
  const styles = await readFile(new URL("src/styles.css", root), "utf8");

  assert.match(styles, /\.life-film-stage\s*\{[^}]*background:\s*rgba\(239,\s*247,\s*241,\s*\.42\)/s);
  assert.match(styles, /\.life-title mark\s*\{[^}]*transparent 0 24%,\s*var\(--life-ink\) 24% 78%,\s*transparent 78% 100%/s);
  assert.match(styles, /\.life-title-word::after\s*\{[^}]*clip-path:\s*inset\(24% 0 22% 0\);/s);
});
