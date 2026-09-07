import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AnimatePresence,
  animate as animateMotion,
  motion,
  MotionConfig,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform
} from "framer-motion";
import { buildDotPattern } from "./aiPattern.js";
import { clampComparisonSplit } from "./imageInteractions.js";
import { easeOutCubic, parseMetricTarget, formatMetricCount } from "./countUp.js";
import { advanceCarouselIndex } from "./carousel.js";
import {
  canStartLifeDrag,
  classifyPhotoAspect,
  getDampedScrollStep,
  getFilmFrameWidth,
  getLifeFocusLoopTarget,
  getLifeKeyboardScrollTarget,
  getLifeMomentumTarget,
  getLifeResetOptions,
  getLifeWheelScrollState,
  getWrappedPhotoIndex
} from "./lifeGallery.js";
import "./styles.css";

const asset = (name) => `/assets/figma/${name}`;
const CANVAS = { width: 1512, height: 982 };
const TOP_DOCK = { size: 36, magnification: 46, distance: 120 };
const CAT_SPRITE_FRAMES = [
  { x: 20, y: 145, width: 360, height: 340 },
  { x: 380, y: 145, width: 360, height: 340 },
  { x: 740, y: 145, width: 360, height: 340 },
  { x: 1080, y: 145, width: 368, height: 340 },
  { x: 20, y: 555, width: 360, height: 350 },
  { x: 380, y: 555, width: 360, height: 350 },
  { x: 740, y: 555, width: 360, height: 350 },
  { x: 1080, y: 555, width: 368, height: 350 }
];
const CAT_PATROL_DURATION = 28000;
const CAT_FRAME_DURATION = 165;
const LIFE_PHOTOS = [
  ["c3421d9d97032cac95431e73b16b5305.JPG", "Cliff valley walk"],
  ["11268f2db03c5ce4efb7d95d780672a8.jpg", "Mountain road under clouds"],
  ["80e15d77245fbae533b3ecc659e92a8f.jpg", "Terraced fields in the mist"],
  ["31e0d4286c938a58c7125563aa3134f6.jpg", "A quiet bench in the woods"],
  ["437b610595fb3ca76229f044b8ead688.jpg", "Walking beneath a great tree"],
  ["b22e3e539e5a7f8a80b4885a1a1e6720.jpg", "Rainy lakeside garden"],
  ["90f6262046b91f94ff9c8194caafb8f8.jpg", "Moss garden after rain"],
  ["909e6de8ca3866f94c43705e1cd8065e.jpg", "Autumn trees by the water"],
  ["life-tropical-forest.jpg", "Sunlight through a tropical forest"],
  ["life-tea-mountains.jpg", "Tea fields beneath misty mountains"],
  ["life-mountain-road.jpg", "A quiet road beneath stormy mountains"],
  ["life-snow-cycling.jpeg", "Cyclists crossing a snowy mountain pass"],
  ["life-seaside-sunset.jpg", "Watching the sunset by the sea"],
  ["life-blue-sky-tree.jpg", "A winter tree against the blue sky"],
  ["a8e25e4545e3b1bfd01bcfc668b39a47.jpg", "Small white flowers"],
  ["ba72c9235a99df64ee982bc760e7523b.jpg", "A figure in a green garden"],
  ["4bc6f662f1a7d1d9934829d9634895f4.jpg", "Sunset rower on the lake"],
  ["5fab4c2c7f4be7e1c00ae385a613e822.jpg", "A quiet urban moment"],
  ["fbf10f2c0de46937a3a2dbd702ea8403.jpg", "The duck keeper"],
  ["de03c7c33596c6a66562c17eb3f553e6.jpg", "Crossing an old city street"],
  ["723a45f5d032e1b5eb457278c8720b07.jpg", "Blue sky between buildings"],
  ["61139c60498c6583b9c7dee5bb30f02c.jpg", "Blue and white street corner"],
  ["b51de30429e76b33d08cfa8b9935c3fc.jpg", "Blue wall notes"],
  ["bd800f217b495034771e5ae1db9d755c.jpg", "Night street lights"],
  ["C4B05D2B-287B-40F2-B993-8A5670224187.JPG", "City evening in film color"],
  ["life-hongkong-street.jpeg", "Red taxis on a Hong Kong street"],
  ["life-church-window.jpg", "Light through a stained-glass window"],
  ["life-aquarium.jpg", "Fish drifting through blue water"],
  ["life-cycling-bike.jpg", "A cycling day in yellow"],
  ["life-music-player.jpg", "A favorite album and music player"],
  ["life-new-yorker-puzzle.jpg", "A finished New Yorker winter puzzle"],
  ["17e5de604d0d608f885d80310065fddb.jpg", "Records in a late-night shop"]
].map(([file, alt], index) => {
  const optimizedFile = file.replace(/\.(?:jpe?g|png)$/i, ".webp");
  const src = `/assets/life/user-photos/${optimizedFile}`;
  return { src, previewSrc: src, alt, frameNumber: index + 1 };
});
const workGridVariants = {
  hidden: {},
  show: { transition: { delayChildren: 0.06, staggerChildren: 0.055 } }
};
const workCardVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 8 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.72 }
  }
};
const dayiModules = import.meta.glob("../work/dayi-agent-platform/*", {
  eager: true,
  query: "?url",
  import: "default"
});
const dayiAsset = (name) => dayiModules[`../work/dayi-agent-platform/${name}`];
const xiaoluoModules = import.meta.glob("../work/xiaoluo-zhiduoxing/assets/*", {
  eager: true,
  query: "?url",
  import: "default"
});
const xiaoluoAsset = (name) => xiaoluoModules[`../work/xiaoluo-zhiduoxing/${name}`];

const dragProps = {
  drag: true,
  dragMomentum: false,
  dragElastic: 0.06,
  whileDrag: { scale: 1.02, zIndex: 50, cursor: "grabbing" }
};

function useCanvasScale() {
  const [metrics, setMetrics] = useState({ scale: 1, stageHeight: CANVAS.height });

  useEffect(() => {
    const update = () => {
      // The workspace owns the full browser window. It scales with width like
      // a conventional desktop canvas instead of becoming a centered postcard.
      const scale = window.innerWidth / CANVAS.width;
      setMetrics({ scale, stageHeight: window.innerHeight / scale });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return metrics;
}

const FOLDER_CONTENT = {
  work: {
    title: "Work",
    files: [
      ["大医智能体平台", "医疗垂类 AI Agent 开发管理平台", "dayi", ["AI Agent", "医疗 SaaS"]],
      ["小罗智多星", "医学科研 AI 助手产品", "xiaoluo", ["AI 科研", "Roche"]],
      ["AI 设计探索", "从项目实践到可复用能力", "ai", ["AI Design", "Workflow"]],
      ["轻流", "低代码业务系统搭建平台", "qf", ["Product Design", "SaaS"]],
      ["心田花开", "教育产品体验设计与品牌升级", "xt", ["Education", "UX/UI"]]
    ]
  },
  life: {
    title: "Life",
    files: [
      ["Mango season", "A small sunny moment", "mango", ["Photo", "Summer"]],
      ["Weekend notes", "Places, meals, and ideas", "notes", ["Journal", "Life"]],
      ["Photo roll", "A collection of snapshots", "archive", ["Photo", "Album"]]
    ]
  },
  playground: {
    title: "Playground",
    files: [
      ["形外", "美学概念检索工具", "aesthetic-index", [], "https://kenziell557.github.io/aesthetic-index/index.html"]
    ]
  }
};

const WORK_COVER_IMAGES = {
  dayi: "work-dayi.png",
  xiaoluo: "work-xiaoluo.png",
  ai: "work-ai.png",
  qf: "work-qf.png",
  xt: "work-xt.png"
};

const PROJECT_NAV = [
  ["overview", "项目概览"],
  ["background", "业务背景"],
  ["goals", "核心目标"],
  ["users", "用户角色"],
  ["insights", "关键洞察"],
  ["architecture", "信息架构"],
  ["strategy", "设计策略"],
  ["others", "其他界面"],
  ["summary", "项目总结"]
];

const ROCHE_NAV = [
  ["roche-overview", "项目总览"],
  ["roche-map", "产品关系"],
  ["roche-star", "小罗制作星"],
  ["roche-pen", "神笔小罗"],
  ["roche-summary", "项目总结"]
];

const AI_NAV = [
  ["ai-overview", "探索概览"],
  ["ai-chat-system", "AI Chat"],
  ["ai-foundation", "基础规范"],
  ["ai-prototype", "AI 工作流"],
  ["ai-aigc", "AIGC"],
  ["ai-impact", "结果影响"],
  ["ai-reflection", "思考沉淀"]
];

const XIAOLUO_NAV = [
  ["xl-overview", "项目概览"],
  ["xl-background", "业务背景"],
  ["xl-goals", "核心目标"],
  ["xl-users", "用户角色"],
  ["xl-cycle", "科研流程"],
  ["xl-process", "设计过程"],
  ["xl-result", "项目总结"]
];

const SHENBI_NAV = [
  ["shenbi-coop", "项目合作模式"],
  ["shenbi-overview", "项目概览"]
];

const XIAOLUO_META = [
  ["时间线", "2025.03 - 2025.05"],
  ["角色", "用户体验设计师"],
  ["团队", "3 个设计师 / 分别负责不同模块"],
  ["Tools", "Sketch"],
  ["挑战", "第一次作为乙方参与项目制产品，需要在有限时间内产出让客户认可的方案"],
  ["主要负责模块", "首页、PubMed 检索、AI 智能检索、文献结构化提取、模块化组件设计"]
];

const XIAOLUO_PERSONAS = [
  ["persona-doctor.png", "医院-临床医生", "临床科研或案例报告撰写，需要快速检索医学文献，也需要合理规划实验设计与数据分析"],
  ["persona-researcher.png", "科研院所、实验室科研人员", "需要大量文献检索、数据分析与论文写作，渴望提高研究效率、快速掌握领域新进展。"],
  ["persona-enterprise.png", "医药企业/其他领域客户", "需要内部研究与创新，加速成果产出，亦可通过私有化部署或API集成进行企业级管理。"]
];

const XIAOLUO_HOME_THEMES = [
  ["blue", "蓝色", "home-after-blue.png", "#0b55d9"],
  ["purple", "紫色", "home-after-purple.png", "#6b4ce6"],
  ["orange", "橙色", "home-after-orange.png", "#ff6a2f"]
];

const XIAOLUO_HOME_NOTES = {
  a: {
    title: "a. 重构功能入口的展示方式",
    body: [
      "工具入口缺少分类与扩展机制，当前平铺方式当入口增加后，首页会不断向下延伸。",
      "新老功能同时展示，用户难以快速找到高频入口。"
    ],
    direction: "right",
    dot: [50, 59.2]
  },
  b: {
    title: "b.优化整体视觉和统一规范",
    body: [
      "页面视觉重量偏高，信息焦点分散，应用入口样式不明显。",
      "方案A背景对比度过高会有些刺眼，方案B信息过多又容易找不到重点。"
    ],
    direction: "left",
    dot: [78.8, 13.6]
  }
};

const XIAOLUO_FLOW_COLUMNS = [
  {
    title: "研究准备",
    desc: "明确方向，奠定研究基础",
    color: "#f2663d",
    items: [
      ["01", "确定研究问题", "从临床需求与知识空白中提炼可验证的命题。", ["智能选题"]],
      ["02", "文献调研与综述", "建立证据地图，辨识已有结论与研究缺口。", ["PubMed检索", "AI 智能检索", "文献解读", "文献结构化"]],
      ["03", "确定研究设计", "选择匹配问题的研究类型、样本与变量路径。", ["样本估算"]]
    ]
  },
  {
    title: "研究实施",
    desc: "规范执行，获取可信证据",
    color: "#3479ee",
    items: [
      ["04", "伦理审批与注册", "完成伦理审查与临床研究注册，确保全程合规。", []],
      ["05", "实施研究", "按方案招募、执行并持续记录关键研究数据。", []],
      ["06", "数据分析", "完成清洗、统计与结果解释，形成可复核结论。", ["智能读图", "科研问答"]]
    ]
  },
  {
    title: "产出与转化",
    desc: "总结传播，推动价值应用",
    color: "#27a961",
    items: [
      ["07", "撰写论文与报告", "将研究发现组织为清晰、可传播的成果表达。", ["论文写作", "全文润色", "全文翻译"]],
      ["08", "投稿与发表", "匹配期刊、回应评审，并完成修改与发表。", ["模拟评审", "智文妙画"]],
      ["09", "成果转化应用", "把证据带回临床实践，持续追踪真实影响。", []]
    ]
  }
];

const AI_OVERVIEW_CARDS = [
  ["01", "AI Chat 组件", "团队从 Bots 与小罗智多星项目中提取共性，沉淀 AI Chat 组件库，我负责其中的输入框模块。"],
  ["02", "基础组件与视觉规范", "借助 Codex、Cursor 参与基础规范与组件建设，重点负责基础视觉规范和大部分基础组件。"],
  ["03", "原型 Prompt 与 AI 工作流", "使用 Figma Make 快速搭建可交互原型，并根据项目经验整理 Prompt 与 AI 辅助设计流程。"],
  ["04", "AIGC 应用", "尝试小罗 IP 场景插图与医院数字人形象，探索生成内容在真实产品场景中的应用。"]
];

const AI_PROTOTYPE_STEPS = [
  ["01", "AI 辅助梳理需求", "明确目标、用户、流程与业务边界"],
  ["02", "生成初版 Prompt", "将页面结构与关键状态转成可执行描述"],
  ["03", "可交互初稿", "快速形成可操作的体验骨架"],
  ["04", "比较方案", "对照路径、信息层级与关键状态"],
  ["05", "人工收敛与细节优化", "统一视觉语言并补齐边界与交互细节"],
  ["06", "交付开发代码", "前端承接代码包、完成接口联调并上线"]
];

const AI_AIGC_IMAGES = [
  ["aigc-health-exam-flow.png", "智能体检方案、健康摘要、到院指南与检前注意事项界面"],
  ["aigc-xiaoluo-cases.png", "神笔小罗产品场景、生成状态与额度提示设计"],
  ["aigc-digital-care-scenes.png", "数字医护助手语音咨询与医院一体机界面"]
];

const IMAGE_PROJECTS = {
  qf: {
    index: "04",
    title: "轻流",
    kicker: "QINGFLOW · PRODUCT DESIGN ARCHIVE",
    subtitle: "低代码业务系统搭建平台 · Onboarding 体验设计",
    period: "2022 Q1–Q2",
    team: "独立设计师",
    role: "前期调研 · 产品设计",
    accent: "#605cf2",
    pages: [1, 2, 3, 4, 5, 6, 7, 8, 10].map((page) => `/assets/projects/qf/${page}.png`)
  },
  xt: {
    index: "05",
    title: "心田花开",
    kicker: "XINTIAN HUAKAI · PRODUCT DESIGN ARCHIVE",
    subtitle: "教育产品体验设计 × 品牌视觉升级",
    period: "2021 Q1–Q2",
    team: "3 位设计师合作",
    role: "体验设计 · 视觉升级",
    accent: "#e9b91b",
    pages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((page) => `/assets/projects/xt/${page}.png`)
  }
};

const AI_ROLE_IMPACTS = [
  ["01", "产品", "在投入完整设计与研发前，通过可交互原型更早验证业务方向、核心逻辑与范围边界。"],
  ["02", "设计", "减少重复搭建和初稿整理，把更多精力放在问题判断、体验收敛、视觉质量与能力边界上。"],
  ["03", "前端", "获得更接近最终效果的原型或代码基础，降低还原沟通成本，更快进入接口联调与工程完善。"],
  ["04", "团队", "将组件规则、Prompt 模板和协作方式沉淀为跨项目可复用的过程资产，形成共同语言。"]
];

const ROCHE_PRODUCTS = {
  star: {
    name: "小罗制作星",
    label: "内容生产效率工具",
    role: "参与部分核心流程与页面体验设计",
    tone: "更偏向“从想法到成稿”的生产链路",
    points: ["选题 / brief 输入", "AI 生成初稿", "编辑优化", "素材与模板复用"],
    color: "#f2d869"
  },
  pen: {
    name: "神笔小罗",
    label: "医学内容智能写作助手",
    role: "参与局部能力梳理与交互落地",
    tone: "更偏向“专业内容表达”的辅助写作",
    points: ["结构化写作", "医学语气调整", "合规表达提示", "多场景文案沉淀"],
    color: "#95c6ff"
  }
};

const RESUME_DOCS = [
  {
    id: "zh",
    language: "中文",
    fileName: "廖孔晴-个人简历.pdf",
    src: "/assets/resume/liao-kongqing-cn.pdf",
    previewSrc: "/assets/resume/liao-kongqing-cn.jpg"
  },
  {
    id: "en",
    language: "English",
    fileName: "Liao-Kongqing-Resume.pdf",
    src: "/assets/resume/liao-kongqing-en.pdf",
    previewSrc: "/assets/resume/liao-kongqing-en.jpg"
  }
];

const HOTSPOT_NOTES = {
  a: {
    title: "a. 强化核心场景入口，提供教程和模板帮助用户快速开始",
    body: [
      ["推荐模板", "快速构建 AI 应用；"],
      ["最近编辑", "继续当前项目，初始状态无内容时引导用户新建项目；"],
      ["新手教程", "帮助用户理解 AI 应用构建流程，解决不会用、不知道从哪开始、不知道做什么的问题；"]
    ],
    direction: "right"
  },
  b: {
    title: "b. 平台结构清晰化，不同角色显示不同的首页模块内容",
    image: "note-b.png",
    direction: "left"
  }
};

function Icon({ name, size = 24 }) {
  const paths = {
    left: <path d="M11.0834 6.99935H2.91675M7.00008 2.91602L2.91675 6.99935L7.00008 11.0827" />,
    right: <path d="M2.91675 6.99935H11.0834M7.00008 2.91602L11.0834 6.99935L7.00008 11.0827" />,
    up: <path d="M12 19V5M19 12L12 5L5 12" />,
    down: <path d="M12 5V19M19 12L12 19L5 12" />,
    restart: <path d="M5 8h10a5 5 0 0 1 0 10h-3M5 8l4-4M5 8l4 4" />,
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    external: (
      <>
        <path d="M14 4h6v6" />
        <path d="m20 4-9 9" />
        <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
      </>
    ),
    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </>
    )
  };
  const isSmallArrow = name === "left" || name === "right";
  const viewBox = isSmallArrow ? "0 0 14 14" : "0 0 24 24";
  const strokeWidth = isSmallArrow ? 1.225 : 2;

  return (
    <svg className={`ui-icon ui-icon-${name}`} width={size} height={size} viewBox={viewBox} aria-hidden="true" strokeWidth={strokeWidth}>
      {paths[name]}
    </svg>
  );
}

function Draggable({ className, children, onClick, onDragStart, ...props }) {
  const wasDragged = useRef(false);

  return (
    <motion.div
      className={className}
      {...dragProps}
      onDragStart={(event, info) => {
        wasDragged.current = true;
        onDragStart?.(event, info);
      }}
      onClick={(event) => {
        if (wasDragged.current) {
          event.preventDefault();
          wasDragged.current = false;
          return;
        }
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function TopDockLink({ label, icon, mouseX, qrCode = null, qrOpen = false, onToggleQr }) {
  const linkRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const distance = useTransform(mouseX, (pointerX) => {
    const bounds = linkRef.current?.getBoundingClientRect();
    if (!bounds) return TOP_DOCK.distance;
    return pointerX - bounds.left - bounds.width / 2;
  });
  const targetSize = useTransform(
    distance,
    [-TOP_DOCK.distance, 0, TOP_DOCK.distance],
    [TOP_DOCK.size, TOP_DOCK.magnification, TOP_DOCK.size]
  );
  const animatedSize = useSpring(targetSize, { mass: 0.1, stiffness: 150, damping: 12 });
  const itemSize = shouldReduceMotion ? TOP_DOCK.size : animatedSize;

  return (
    <motion.a
      ref={linkRef}
      className={`top-dock-link ${qrCode ? "top-dock-link-wechat" : ""} ${qrOpen ? "is-qr-open" : ""}`}
      href="#"
      aria-label={label}
      aria-expanded={qrCode ? qrOpen : undefined}
      style={{ width: itemSize, height: TOP_DOCK.size }}
      onClick={(event) => {
        event.preventDefault();
        if (qrCode) onToggleQr?.();
      }}
    >
      <span className="top-dock-icon-shell">
        <img className="top-dock-icon" src={asset(icon)} alt="" />
      </span>
      {qrCode && (
        <span className="top-dock-qr-popover" aria-hidden={!qrOpen}>
          <img src={asset(qrCode)} alt="" />
        </span>
      )}
    </motion.a>
  );
}

function TopNavigation() {
  const mouseX = useMotionValue(Infinity);
  const [qrOpen, setQrOpen] = useState(false);
  const dockRef = useRef(null);

  useEffect(() => {
    if (qrOpen) mouseX.set(Infinity);
  }, [mouseX, qrOpen]);

  useEffect(() => {
    if (!qrOpen) return undefined;
    const closeQr = (event) => {
      if (event.key === "Escape" || (event.type === "pointerdown" && !dockRef.current?.contains(event.target))) {
        setQrOpen(false);
      }
    };
    window.addEventListener("keydown", closeQr);
    window.addEventListener("pointerdown", closeQr);
    return () => {
      window.removeEventListener("keydown", closeQr);
      window.removeEventListener("pointerdown", closeQr);
    };
  }, [qrOpen]);

  return (
    <header className="top-nav">
      <div className="brand-mark" aria-label="Liao Space">
        <span>LIAO</span><i /><span>SPACE</span>
      </div>
      <nav
        ref={dockRef}
        aria-label="Social links"
        onPointerMove={(event) => {
          if (!qrOpen) mouseX.set(event.clientX);
        }}
        onPointerLeave={() => mouseX.set(Infinity)}
      >
        <TopDockLink label="Dribbble" icon="dribbble.svg" mouseX={mouseX} />
        <TopDockLink label="Figma" icon="figma.svg" mouseX={mouseX} />
        <TopDockLink
          label="wechat"
          icon="linkedin.svg"
          mouseX={mouseX}
          qrCode="home-wechat-qr.png"
          qrOpen={qrOpen}
          onToggleQr={() => setQrOpen((open) => !open)}
        />
      </nav>
    </header>
  );
}

function FigmaFolder({ className, variant, label, onOpen }) {
  return (
    <Draggable
      className={`folder ${className}`}
      whileHover={{ scale: 1.02 }}
      whileDrag={{ scale: 1.05, zIndex: 50, cursor: "grabbing" }}
      transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
      onClick={() => onOpen(variant)}
    >
      <div className={`folder-stack folder-stack-${variant}`} aria-hidden="true">
        {variant === "work" && (
          <i className="home-object home-work-object">
            <img
              className="home-work-typewriter"
              src={asset("home-work-typewriter-base.webp")}
              alt=""
            />
          </i>
        )}
        {variant === "life" && (
          <>
            <i className="folder-sheet folder-sheet-back" />
            <i className="folder-sheet folder-sheet-middle" />
            <i className="folder-cover folder-cover-life">
              <img src={asset("life-mango.png")} alt="" />
            </i>
          </>
        )}
        {variant === "playground" && (
          <i className="home-object home-playground-object">
            <img className="home-playground-vinyl" src={asset("home-playground-vinyl.webp")} alt="" />
          </i>
        )}
      </div>
      <span className="folder-label">{label}</span>
    </Draggable>
  );
}

function removeConnectedSpriteBackground(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let queueStart = 0;
  let queueEnd = 0;

  const isBackground = (pixel) => {
    const offset = pixel * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    return red > 214 && green > 214 && blue > 214 && Math.max(red, green, blue) - Math.min(red, green, blue) < 24;
  };
  const enqueue = (pixel) => {
    if (visited[pixel] || !isBackground(pixel)) return;
    visited[pixel] = 1;
    queue[queueEnd] = pixel;
    queueEnd += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (queueStart < queueEnd) {
    const pixel = queue[queueStart];
    queueStart += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    data[pixel * 4 + 3] = 0;
    if (x > 0) enqueue(pixel - 1);
    if (x < width - 1) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y < height - 1) enqueue(pixel + width);
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function PixelCowCat() {
  const canvasRef = useRef(null);
  const laneRef = useRef(null);
  const draggingRef = useRef(false);
  const directionRef = useRef(1);
  const catX = useMotionValue(0);
  const catY = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();
  const [catDragConstraints, setCatDragConstraints] = useState({ left: 0, right: 820, top: -760, bottom: 0 });

  useEffect(() => {
    const lane = laneRef.current;
    if (!lane) return undefined;
    const updateConstraints = () => {
      const canvas = lane.closest(".portfolio-canvas");
      setCatDragConstraints({
        left: 0,
        right: Math.max(0, lane.clientWidth - 76),
        top: -Math.max(420, (canvas?.clientHeight || 860) - 88),
        bottom: 0
      });
    };
    updateConstraints();
    const observer = new ResizeObserver(updateConstraints);
    observer.observe(lane);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (shouldReduceMotion) return undefined;
    let frameRequest;
    let previousTime = performance.now();
    const patrol = (now) => {
      const maxX = catDragConstraints.right;
      const elapsed = Math.min(40, now - previousTime);
      previousTime = now;
      if (!draggingRef.current && maxX > 0) {
        const speed = maxX / (CAT_PATROL_DURATION / 2);
        let nextX = catX.get() + directionRef.current * speed * elapsed;
        if (nextX >= maxX) {
          nextX = maxX;
          directionRef.current = -1;
        } else if (nextX <= 0) {
          nextX = 0;
          directionRef.current = 1;
        }
        catX.set(nextX);
      }
      frameRequest = requestAnimationFrame(patrol);
    };
    frameRequest = requestAnimationFrame(patrol);
    return () => cancelAnimationFrame(frameRequest);
  }, [catDragConstraints.right, catX, shouldReduceMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    const sprite = new Image();
    let frameRequest;
    let disposed = false;

    sprite.onload = () => {
      if (disposed) return;
      const preparedFrames = CAT_SPRITE_FRAMES.map((frame) => {
        const frameCanvas = document.createElement("canvas");
        frameCanvas.width = frame.width;
        frameCanvas.height = frame.height;
        const frameContext = frameCanvas.getContext("2d");
        frameContext.drawImage(
          sprite,
          frame.x,
          frame.y,
          frame.width,
          frame.height,
          0,
          0,
          frame.width,
          frame.height
        );
        return removeConnectedSpriteBackground(frameCanvas);
      });
      const startedAt = performance.now();
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const drawFrame = (now = startedAt) => {
        const elapsed = Math.max(0, now - startedAt);
        const directionOffset = directionRef.current > 0 ? 0 : 4;
        const walkFrame = Math.floor(elapsed / CAT_FRAME_DURATION) % 4;
        const source = preparedFrames[directionOffset + walkFrame] || preparedFrames[0];
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = false;
        const scale = Math.min(canvas.width / source.width, canvas.height / source.height);
        const drawWidth = source.width * scale;
        const drawHeight = source.height * scale;
        context.drawImage(
          source,
          (canvas.width - drawWidth) / 2,
          canvas.height - drawHeight,
          drawWidth,
          drawHeight
        );
        if (!reducedMotion && !disposed) frameRequest = requestAnimationFrame(drawFrame);
      };

      drawFrame();
    };
    sprite.src = asset("home-cow-cat-sprite.webp");

    return () => {
      disposed = true;
      if (frameRequest) cancelAnimationFrame(frameRequest);
    };
  }, []);

  return (
    <div ref={laneRef} className="pixel-cat-patrol" aria-label="可以拖动的像素小猫">
      <motion.div
        className="pixel-cat-runner"
        style={{ x: catX, y: catY }}
        drag
        dragConstraints={catDragConstraints}
        dragElastic={0.06}
        dragMomentum={false}
        whileDrag={{ scale: 1.04 }}
        onDragStart={() => {
          draggingRef.current = true;
        }}
        onDrag={(_, info) => {
          if (Math.abs(info.delta.x) > 0.05) directionRef.current = info.delta.x > 0 ? 1 : -1;
        }}
        onDragEnd={() => {
          draggingRef.current = false;
          catX.set(Math.min(catDragConstraints.right, Math.max(0, catX.get())));
          if (shouldReduceMotion) {
            catY.set(0);
          } else {
            animateMotion(catY, 0, { type: "spring", stiffness: 320, damping: 21, mass: 0.7 });
          }
        }}
      >
        <canvas ref={canvasRef} className="pixel-cat-sprite" width="180" height="132" />
      </motion.div>
    </div>
  );
}

function PixelBee({ className }) {
  return (
    <svg className={className} viewBox="0 0 28 18" aria-hidden="true" shapeRendering="crispEdges">
      <path fill="#eaf6ff" d="M5 1h7v6H5zM16 0h7v7h-7z" />
      <path fill="#9bc9e8" d="M7 3h5v4H7zM16 3h5v4h-5z" />
      <path fill="#25292d" d="M5 7h18v8H5zM1 9h5v4H1zM23 9h4v4h-4z" />
      <path fill="#f4c542" d="M8 8h4v7H8zM16 8h4v7h-4z" />
      <path fill="#25292d" d="M7 15h4v3H7zM18 15h4v3h-4z" />
      <path fill="#f08ca7" d="M24 10h2v2h-2z" />
    </svg>
  );
}

function BeeBurst({ burstKey }) {
  if (!burstKey) return null;
  return (
    <div className="pixel-bee-burst" key={burstKey} aria-hidden="true">
      {[0, 1].map((bee) => (
        <PixelBee key={bee} className={`pixel-bee pixel-bee-${bee === 0 ? "a" : "b"}`} />
      ))}
    </div>
  );
}

function MacWindowControls({ onClose, label }) {
  return (
    <div className="mac-window-controls" aria-label="Window controls">
      <button
        type="button"
        className="mac-window-dot mac-window-dot-close"
        aria-label={label}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onClose}
      />
      <span className="mac-window-dot mac-window-dot-minimize" aria-hidden="true" />
      <span className="mac-window-dot mac-window-dot-zoom" aria-hidden="true" />
    </div>
  );
}

const LIFE_STORY_LEAD = "When I’m not designing,";
const LIFE_STORY_BODY = "I’m probably watching a good film, getting a workout in, cycling around the city, or planning my next trip with friends. I love discovering new places, finding great food and sweet treats, and collecting little memories from everywhere I go.";
const LIFE_STORY_TYPED_PREFIX = "I’m probably ";

function LifeStoryCopy({ expanded }) {
  const shouldReduceMotion = useReducedMotion();
  const [visibleCharacters, setVisibleCharacters] = useState(
    expanded && shouldReduceMotion ? LIFE_STORY_BODY.length : LIFE_STORY_TYPED_PREFIX.length
  );

  useEffect(() => {
    if (!expanded) {
      setVisibleCharacters(LIFE_STORY_TYPED_PREFIX.length);
      return undefined;
    }
    if (shouldReduceMotion) {
      setVisibleCharacters(LIFE_STORY_BODY.length);
      return undefined;
    }

    setVisibleCharacters(LIFE_STORY_TYPED_PREFIX.length);
    let animationFrame = 0;
    let startTime = 0;
    const delay = window.setTimeout(() => {
      const type = (time) => {
        if (!startTime) startTime = time;
        const progress = Math.min(1, (time - startTime) / 2300);
        const remainingCharacters = LIFE_STORY_BODY.length - LIFE_STORY_TYPED_PREFIX.length;
        setVisibleCharacters(LIFE_STORY_TYPED_PREFIX.length + Math.floor(progress * remainingCharacters));
        if (progress < 1) animationFrame = window.requestAnimationFrame(type);
      };
      animationFrame = window.requestAnimationFrame(type);
    }, 80);

    return () => {
      window.clearTimeout(delay);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [expanded, shouldReduceMotion]);

  const accessibleCopy = expanded
    ? `${LIFE_STORY_LEAD} ${LIFE_STORY_BODY}`
    : `${LIFE_STORY_LEAD} I’m probably...`;

  return (
    <div className={`life-story-copy ${expanded ? "is-expanded" : "is-preview"}`} aria-label={accessibleCopy}>
      <div aria-hidden="true">
        <p>{LIFE_STORY_LEAD}</p>
        <p>
          {expanded ? LIFE_STORY_BODY.slice(0, visibleCharacters) : "I’m probably..."}
          {expanded && <span className="life-story-caret" />}
        </p>
      </div>
    </div>
  );
}

function LifeIntroPanel({ onExplore }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      className="life-intro-panel"
      initial={shouldReduceMotion ? false : { opacity: 0, x: -32, scale: 0.985 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20, scale: 0.99 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.46, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="life-intro-content">
        <img className="life-profile-photo" src={asset("life-profile.webp")} alt="Liao Kongqing" draggable="false" />
        <p className="life-greeting">👋 Hey, I'm Liao Kongqing</p>
        <h1 className="life-title">
          <span>a <mark aria-label="designer"><span className="life-title-word" data-text="designer" aria-hidden="true">designer</span></mark></span>
          <span>making products</span>
          <span>simple and intuitive.</span>
        </h1>
      </div>
      <button type="button" className="life-panel-arrow" onClick={onExplore} aria-label="浏览 Life 照片">
        <span aria-hidden="true">→</span>
      </button>
    </motion.section>
  );
}

function FilmCanister() {
  return (
    <aside className="film-canister-lead" aria-hidden="true">
      <img
        className="film-canister-art"
        src="/assets/life/film-canister-transparent.webp"
        alt=""
        draggable="false"
      />
      <span className="film-canister-accessible-label"><b>36</b><b>CA135</b><b>200</b><b>FUJIFILM</b><b>SUPERIA</b></span>
    </aside>
  );
}

function FilmFrame({ photo, ratio, onResolveRatio, onOpen }) {
  const [failed, setFailed] = useState(false);
  const [naturalRatio, setNaturalRatio] = useState(null);
  const geometry = getFilmFrameWidth(ratio);
  const frameNumber = 23 + photo.frameNumber;
  return (
    <figure
      className={`film-frame film-frame-${ratio} ${failed ? "is-error" : ""}`}
      style={{ "--film-frame-ratio": naturalRatio || geometry.width / 334 }}
    >
      <span className="film-frame-top-meta" aria-hidden="true">
        <b>135</b>
        <b>{frameNumber}</b>
      </span>
      <button
        type="button"
        className="film-exposure"
        onClick={() => !failed && onOpen(photo)}
        aria-label={`放大查看：${photo.alt}`}
      >
        {failed ? (
          <span className="film-frame-fallback" role="img" aria-label={`Photo unavailable: ${photo.alt}`}>Photo unavailable</span>
        ) : (
          <motion.img
            src={photo.previewSrc}
            alt={photo.alt}
            loading="lazy"
            decoding="async"
            draggable="false"
            onLoad={(event) => {
              setNaturalRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight);
              if (photo.ratio) return;
              onResolveRatio(classifyPhotoAspect(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight));
            }}
            onError={() => setFailed(true)}
          />
        )}
      </button>
      <figcaption aria-hidden="true">
        <span className="film-frame-index"><i />{frameNumber}A</span>
        <span className="film-frame-barcode" />
      </figcaption>
    </figure>
  );
}

function FilmStrip({ photos, onRestart, onOpenPhoto }) {
  const [resolvedRatios, setResolvedRatios] = useState(() => Object.fromEntries(
    photos.map((photo) => [photo.src, photo.ratio || "square"])
  ));

  const resolveRatio = (src, ratio) => {
    setResolvedRatios((current) => current[src] === ratio ? current : { ...current, [src]: ratio });
  };

  return (
    <div className="film-strip-track">
      <FilmCanister />
      <div className="film-strip-sequence">
        {photos.map((photo) => (
          <FilmFrame
            key={photo.src}
            photo={photo}
            ratio={resolvedRatios[photo.src]}
            onResolveRatio={(ratio) => resolveRatio(photo.src, ratio)}
            onOpen={onOpenPhoto}
          />
        ))}
        <section className="film-end-panel" aria-label="End of Life photo gallery">
          <span>THE END</span>
          <button type="button" onClick={onRestart} aria-label="回到起点"><Icon name="restart" size={22} /></button>
        </section>
      </div>
    </div>
  );
}

function LifePhotoLightbox({ photo, direction, onClose, onPrevious, onNext, shouldReduceMotion }) {
  const closeRef = useRef(null);
  const frameNumber = 23 + photo.frameNumber;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <motion.div
      className="life-photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`放大照片：${photo.alt}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClose}
    >
      <motion.div
        className="life-photo-viewer"
        initial={shouldReduceMotion ? false : { opacity: 0, scale: .975, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: .985, y: 10 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="life-photo-viewer-meta">
          <span>LIFE ARCHIVE</span>
          <span>135 · {frameNumber}A</span>
        </header>
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.img
            key={photo.src}
            className="life-photo-viewer-image"
            src={photo.src}
            alt={photo.alt}
            decoding="async"
            draggable="false"
            custom={direction}
            initial={shouldReduceMotion ? false : { opacity: 0, x: direction * 30, scale: .985, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -20, scale: .99, filter: "blur(5px)" }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
          />
        </AnimatePresence>
        <footer className="life-photo-viewer-caption">
          <span>{photo.alt}</span>
          <span>{String(photo.frameNumber).padStart(2, "0")} / {String(LIFE_PHOTOS.length).padStart(2, "0")}</span>
        </footer>
      </motion.div>
      <button type="button" className="life-photo-viewer-nav life-photo-viewer-nav-previous" onClick={(event) => { event.stopPropagation(); onPrevious(); }} aria-label="上一张照片">
        <Icon name="left" size={22} />
      </button>
      <button type="button" className="life-photo-viewer-nav life-photo-viewer-nav-next" onClick={(event) => { event.stopPropagation(); onNext(); }} aria-label="下一张照片">
        <Icon name="right" size={22} />
      </button>
      <button ref={closeRef} type="button" className="life-photo-lightbox-close" onClick={onClose} aria-label="关闭照片放大查看">
        <Icon name="close" size={20} />
      </button>
    </motion.div>
  );
}

function LifeGallery({ onClose }) {
  const galleryRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedElement = useRef(null);
  const viewportRef = useRef(null);
  const activePointerId = useRef(null);
  const lastPointerX = useRef(0);
  const lastPointerTime = useRef(0);
  const pointerVelocity = useRef(0);
  const targetScrollLeft = useRef(0);
  const scrollAnimationFrame = useRef(null);
  const feedbackResetTimer = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoDirection, setPhotoDirection] = useState(1);
  const [storyExpanded, setStoryExpanded] = useState(false);

  const positionStory = () => {
    const viewport = viewportRef.current;
    const stage = galleryRef.current?.querySelector('.life-film-stage');
    if (!viewport || !stage) return;
    const stageStart = stage.offsetLeft - viewport.scrollLeft;
    const inset = parseFloat(getComputedStyle(stage).paddingLeft) + 12;
    galleryRef.current.style.setProperty('--life-story-x', `${Math.max(96, inset, stageStart + inset)}px`);
  };

  useEffect(() => {
    const observer = new ResizeObserver(positionStory);
    observer.observe(viewportRef.current);
    positionStory();
    return () => observer.disconnect();
  }, []);

  const showRelativePhoto = (direction) => {
    setPhotoDirection(direction);
    setSelectedPhoto((current) => {
      const currentIndex = Math.max(0, LIFE_PHOTOS.findIndex((photo) => photo.src === current?.src));
      return LIFE_PHOTOS[getWrappedPhotoIndex(currentIndex, direction, LIFE_PHOTOS.length)];
    });
  };

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        if (selectedPhoto) setSelectedPhoto(null);
        else onClose();
        return;
      }
      if (!selectedPhoto) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showRelativePhoto(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showRelativePhoto(1);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, selectedPhoto]);

  useEffect(() => {
    if (!selectedPhoto) return;
    const currentIndex = LIFE_PHOTOS.findIndex((photo) => photo.src === selectedPhoto.src);
    [-1, 1].forEach((direction) => {
      const adjacent = LIFE_PHOTOS[getWrappedPhotoIndex(currentIndex, direction, LIFE_PHOTOS.length)];
      const image = new Image();
      image.src = adjacent.src;
    });
  }, [selectedPhoto]);

  useEffect(() => () => {
    if (scrollAnimationFrame.current) cancelAnimationFrame(scrollAnimationFrame.current);
    if (feedbackResetTimer.current) window.clearTimeout(feedbackResetTimer.current);
  }, []);

  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement;
    closeButtonRef.current?.focus();

    const trapFocus = (event) => {
      if (event.key !== "Tab") return;
      const focusableElements = galleryRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusable = focusableElements
        ? Array.from(focusableElements).filter((element) => (
          element.tabIndex >= 0 && !element.closest("[inert]")
        ))
        : [];
      if (!focusable.length) {
        event.preventDefault();
        galleryRef.current?.focus();
        return;
      }

      const focusTargetIndex = getLifeFocusLoopTarget({
        focusableCount: focusable.length,
        activeIndex: focusable.indexOf(document.activeElement),
        shiftKey: event.shiftKey
      });
      if (focusTargetIndex !== null) {
        event.preventDefault();
        focusable[focusTargetIndex].focus();
      }
    };

    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      previouslyFocusedElement.current?.focus();
    };
  }, []);

  const applyLifeMotionFeedback = (delta) => {
    const viewport = viewportRef.current;
    if (!viewport || shouldReduceMotion) return;
    const tilt = Math.max(-2.2, Math.min(2.2, delta * .018));
    viewport.style.setProperty("--life-canister-tilt", `${tilt}deg`);
    viewport.style.setProperty("--life-film-sheen-x", `${viewport.scrollLeft + (viewport.clientWidth * .42)}px`);
    viewport.style.setProperty("--life-film-sheen-opacity", ".16");
    if (feedbackResetTimer.current) window.clearTimeout(feedbackResetTimer.current);
    feedbackResetTimer.current = window.setTimeout(() => {
      viewport.style.setProperty("--life-canister-tilt", "0deg");
      viewport.style.setProperty("--life-film-sheen-opacity", "0");
    }, 110);
  };

  const animateLifeScrollTo = (target, factor = .19, duration = 0) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (scrollAnimationFrame.current) cancelAnimationFrame(scrollAnimationFrame.current);
    scrollAnimationFrame.current = null;
    targetScrollLeft.current = target;
    if (shouldReduceMotion) {
      viewport.scrollLeft = target;
      return;
    }
    const start = viewport.scrollLeft;
    let startTime;
    const step = (time) => {
      startTime ??= time;
      const current = viewport.scrollLeft;
      const progress = duration ? Math.min(1, (time - startTime) / duration) : 0;
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      const next = duration
        ? { scrollLeft: start + (target - start) * eased, settled: progress === 1 }
        : getDampedScrollStep({ current, target: targetScrollLeft.current, factor });
      viewport.scrollLeft = next.scrollLeft;
      positionStory();
      applyLifeMotionFeedback(next.scrollLeft - current);
      if (next.settled || (!duration && viewport.scrollLeft === current)) {
        viewport.scrollLeft = targetScrollLeft.current;
        positionStory();
        scrollAnimationFrame.current = null;
        return;
      }
      scrollAnimationFrame.current = requestAnimationFrame(step);
    };
    scrollAnimationFrame.current = requestAnimationFrame(step);
  };

  const handleLifeWheel = (event) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const scrollLeft = scrollAnimationFrame.current ? targetScrollLeft.current : viewport.scrollLeft;
    const next = getLifeWheelScrollState({
      scrollLeft,
      scrollWidth: viewport.scrollWidth,
      clientWidth: viewport.clientWidth,
      deltaX: event.deltaX,
      deltaY: event.deltaY
    });
    if (!next.shouldPrevent) return;
    event.preventDefault();
    animateLifeScrollTo(next.scrollLeft);
  };

  const startLifeDrag = (event) => {
    if (activePointerId.current !== null || !canStartLifeDrag({
      isPrimary: event.isPrimary,
      button: event.button,
      target: event.target
    })) return;
    event.preventDefault();
    if (scrollAnimationFrame.current) cancelAnimationFrame(scrollAnimationFrame.current);
    scrollAnimationFrame.current = null;
    activePointerId.current = event.pointerId;
    lastPointerX.current = event.clientX;
    lastPointerTime.current = event.timeStamp;
    pointerVelocity.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveLifeDrag = (event) => {
    if (event.pointerId !== activePointerId.current) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const delta = lastPointerX.current - event.clientX;
    const elapsed = Math.max(8, event.timeStamp - lastPointerTime.current);
    viewport.scrollLeft += delta;
    pointerVelocity.current = delta / elapsed;
    targetScrollLeft.current = viewport.scrollLeft;
    applyLifeMotionFeedback(delta);
    lastPointerX.current = event.clientX;
    lastPointerTime.current = event.timeStamp;
  };

  const endLifeDrag = (event) => {
    if (event.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    const viewport = viewportRef.current;
    if (!viewport) return;
    animateLifeScrollTo(getLifeMomentumTarget({
      scrollLeft: viewport.scrollLeft,
      velocity: pointerVelocity.current,
      scrollWidth: viewport.scrollWidth,
      clientWidth: viewport.clientWidth
    }));
  };

  const handleLifeKeyDown = (event) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const target = getLifeKeyboardScrollTarget({
      key: event.key,
      scrollLeft: viewport.scrollLeft,
      scrollWidth: viewport.scrollWidth,
      clientWidth: viewport.clientWidth
    });
    if (target === null) return;
    event.preventDefault();
    animateLifeScrollTo(target);
  };

  const handleLifeScroll = () => {
    positionStory();
    const viewport = viewportRef.current;
    const filmStage = galleryRef.current?.querySelector(".life-film-stage");
    if (!viewport || !filmStage) return;
    const threshold = Math.max(120, filmStage.offsetLeft * .56);
    setStoryExpanded((current) => {
      const next = viewport.scrollLeft >= threshold;
      return current === next ? current : next;
    });
  };

  const restartLife = () => {
    setStoryExpanded(false);
    viewportRef.current?.scrollTo(getLifeResetOptions(shouldReduceMotion));
  };

  const jumpToLifeFilm = () => {
    const filmStage = galleryRef.current?.querySelector(".life-film-stage");
    animateLifeScrollTo(Math.ceil(filmStage?.offsetLeft || viewportRef.current?.clientWidth || 0) + 1, .19, 900);
  };

  return (
    <motion.div
      ref={galleryRef}
      className="life-gallery"
      role="dialog"
      aria-modal="true"
      aria-label="Life photo gallery"
      tabIndex={-1}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 1.012 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.992 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <img className="life-gallery-scenery" src="/assets/life/life-hills.png" alt="" aria-hidden="true" draggable="false" />
      <LifeStoryCopy expanded={storyExpanded} />
      <button ref={closeButtonRef} type="button" className="life-gallery-close" tabIndex={selectedPhoto ? -1 : 0} onClick={onClose} aria-label="关闭 Life 并返回首页"><Icon name="close" size={20} /></button>
      <div
        ref={viewportRef}
        className="life-scroll-viewport"
        inert={Boolean(selectedPhoto)}
        tabIndex={0}
        aria-label="Life photo story. Use arrow keys, mouse wheel, or drag to explore."
        onScroll={handleLifeScroll}
        onWheel={handleLifeWheel}
        onPointerDown={startLifeDrag}
        onPointerMove={moveLifeDrag}
        onPointerUp={endLifeDrag}
        onPointerCancel={endLifeDrag}
        onLostPointerCapture={endLifeDrag}
        onKeyDown={handleLifeKeyDown}
      >
        <div className="life-scroll-track">
          <LifeIntroPanel onExplore={jumpToLifeFilm} />
          <motion.section
            className="life-film-stage"
            aria-label="Life photo film gallery"
            initial={shouldReduceMotion ? false : { opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.48, delay: shouldReduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <FilmStrip photos={LIFE_PHOTOS} onRestart={restartLife} onOpenPhoto={setSelectedPhoto} />
          </motion.section>
        </div>
      </div>
      <AnimatePresence>
        {selectedPhoto && (
          <LifePhotoLightbox
            key="life-photo-lightbox"
            photo={selectedPhoto}
            direction={photoDirection}
            onClose={() => setSelectedPhoto(null)}
            onPrevious={() => showRelativePhoto(-1)}
            onNext={() => showRelativePhoto(1)}
            shouldReduceMotion={shouldReduceMotion}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FolderWindow({ folder, onClose, onOpenProject }) {
  const { title, files } = FOLDER_CONTENT[folder];

  return (
    <motion.div
      className="folder-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        className={`folder-window folder-window-${folder}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} files`}
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="folder-window-titlebar">
          <MacWindowControls onClose={onClose} label="Close folder" />
          <div className="folder-window-title">
            <strong>{title}</strong>
          </div>
        </header>
        <div className="folder-window-body">
          {folder === "life" && <p>A growing collection — more contents will be added here.</p>}
          <motion.div
            className="folder-file-grid"
            variants={folder === "work" ? workGridVariants : undefined}
            initial={folder === "work" ? "hidden" : false}
            animate={folder === "work" ? "show" : undefined}
          >
            {files.map(([name, description, cover, tags, href], index) => (
              <motion.button
                type="button"
                className={`folder-file ${folder === "work" ? "folder-file-work" : ""}`}
                key={name}
                custom={index}
                variants={workCardVariants}
                onClick={() => {
                  if (href) {
                    window.open(href, "_blank", "noopener,noreferrer");
                    return;
                  }
                  if (folder !== "work") return;
                  if (index === 0) onOpenProject("dayi");
                  if (index === 1) onOpenProject("xiaoluo");
                  if (index === 2) onOpenProject("ai");
                  if (index === 3) onOpenProject("qf");
                  if (index === 4) onOpenProject("xt");
                }}
              >
                <i className={`folder-file-cover folder-file-cover-${cover}`}>
                  {folder === "work" ? (
                    <img src={asset(WORK_COVER_IMAGES[cover])} alt="" />
                  ) : null}
                  {folder !== "work" && cover === "aesthetic-index" && (
                    <span className="aesthetic-index-cover-logo" aria-hidden="true">
                      <b>形外</b>
                      <i>形 · 色 · 质 · 序</i>
                    </span>
                  )}
                  {folder !== "work" && cover === "mango" && <img src={asset("life-mango.png")} alt="" />}
                  {folder !== "work" && cover === "hero" && <img src={asset("hero-frame.webp")} alt="" />}
                  {folder !== "work" && cover === "dayi" && (
                    <span className="folder-dayi-cover-composite">
                      <img src={dayiAsset("image-604.png")} alt="" />
                      <img src={dayiAsset("home-empty.png")} alt="" />
                    </span>
                  )}
                  {folder !== "work" && cover === "roche" && (
                    <span className="roche-cover-art">
                      <b>Roche</b>
                      <em>2 products</em>
                    </span>
                  )}
                  {folder !== "work" && cover === "xiaoluo" && (
                    <span className="folder-xiaoluo-cover-composite">
                      <img src={xiaoluoAsset("assets/hero-bg.png")} alt="" />
                      <img src={xiaoluoAsset("assets/hero-ui.png")} alt="" />
                    </span>
                  )}
                </i>
                <span className="folder-file-copy"><b>{name}</b><small>{description}</small></span>
                <span className="folder-file-tags">{tags.map((tag) => <em key={tag}>{tag}</em>)}</span>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function ProjectImage({ src, alt, className = "", onZoom }) {
  return (
    <button type="button" className={`project-image-button ${className}`} onClick={() => onZoom(src, alt)}>
      <img src={src} alt={alt} />
    </button>
  );
}

function XiaoluoHomeCompare({ xlImg }) {
  const frameRef = useRef(null);
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [themeId, setThemeId] = useState("blue");
  const [activeNote, setActiveNote] = useState(null);
  const theme = XIAOLUO_HOME_THEMES.find(([id]) => id === themeId) || XIAOLUO_HOME_THEMES[0];
  const note = activeNote ? XIAOLUO_HOME_NOTES[activeNote] : null;

  const updateSplit = (clientX) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(100, Math.max(0, next)));
  };

  useEffect(() => {
    if (!dragging) return undefined;
    const handleMove = (event) => updateSplit(event.clientX);
    const handleUp = () => setDragging(false);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [dragging]);

  const startDrag = (event) => {
    event.preventDefault();
    setDragging(true);
    updateSplit(event.clientX);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const stopDrag = () => setDragging(false);
  const toggleNote = (key) => setActiveNote((current) => current === key ? null : key);
  const switchNote = () => setActiveNote((current) => current === "a" ? "b" : "a");

  return (
    <div className="xiaoluo-home-compare">
      <div
        className={`xiaoluo-compare-frame ${dragging ? "is-dragging" : ""}`}
        ref={frameRef}
        style={{ "--split": `${split}%`, "--after-clip": `${100 - split}%`, "--theme": theme[3] }}
      >
        <img className="xiaoluo-compare-before" src={xlImg("home-after-blue.png")} alt="首页优化后方案" />
        <div className="xiaoluo-compare-after">
          <img src={xlImg("home-a.png")} alt="首页优化前方案" />
        </div>
        <div className="xiaoluo-compare-divider" style={{ left: `${split}%` }} />
        <button
          type="button"
          className="xiaoluo-compare-handle"
          style={{ left: `${split}%` }}
          onPointerDown={startDrag}
          onPointerMove={(event) => dragging && updateSplit(event.clientX)}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          aria-label="拖动查看首页优化前后对比"
        >
          <span />
        </button>
      </div>
      <p className="xiaoluo-compare-caption">Before/After</p>
      <div className="xiaoluo-after-interactive" style={{ "--theme": theme[3] }} onClick={() => setActiveNote(null)}>
        <img src={xlImg(theme[2])} alt={`首页最终方案-${theme[1]}`} />
        {Object.entries(XIAOLUO_HOME_NOTES).map(([id, item]) => (
          <button
            key={id}
            type="button"
            className={`xiaoluo-home-hotspot ${activeNote === id ? "is-active" : ""}`}
            style={{ left: `${item.dot[0]}%`, top: `${item.dot[1]}%` }}
            onClick={(event) => {
              event.stopPropagation();
              toggleNote(id);
            }}
            aria-label={`查看标注 ${id}`}
          >
            <span>{id}</span>
          </button>
        ))}
        {note && (
          <aside
            className={`xiaoluo-home-note xiaoluo-home-note-${activeNote}`}
            onClick={(event) => event.stopPropagation()}
          >
            <strong>{note.title}</strong>
            <div className="xiaoluo-home-note-body">
              {note.body.map((copy) => <p key={copy}>{copy}</p>)}
            </div>
            <button type="button" className="xiaoluo-home-note-arrow" onClick={switchNote} aria-label="切换标注">
              <Icon name={note.direction === "left" ? "left" : "right"} size={16} />
            </button>
          </aside>
        )}
      </div>
      <div className="xiaoluo-theme-switcher" aria-label="切换首页主题色">
        {XIAOLUO_HOME_THEMES.map(([id, label, , color]) => (
          <button
            key={id}
            type="button"
            className={themeId === id ? "is-active" : ""}
            style={{ "--theme": color }}
            onClick={() => {
              setThemeId(id);
              setActiveNote(null);
            }}
            aria-label={`切换为${label}主题`}
          />
        ))}
      </div>
    </div>
  );
}

function XiaoluoHomeDrafts({ xlImg, openZoom }) {
  const drafts = [
    ["home-a.png", "初版主题A"],
    ["home-b.png", "初版主题B"]
  ];

  return (
    <div className="xiaoluo-home-drafts">
      {drafts.map(([src, label]) => (
        <figure key={label}>
          <button type="button" onClick={() => openZoom(xlImg(src), label)}>
            <img src={xlImg(src)} alt={label} />
          </button>
          <figcaption>{label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function HotspotDemo({ onZoom }) {
  const [active, setActive] = useState(null);
  const note = active ? HOTSPOT_NOTES[active] : null;
  const toggleNote = (key) => setActive((current) => current === key ? null : key);
  const switchNote = () => setActive((current) => current === "a" ? "b" : "a");

  return (
    <div className="hotspot-demo" onClick={() => setActive(null)}>
      <img src={dayiAsset("home-empty.png")} alt="平台首页空状态" />
      {["a", "b"].map((key) => (
        <button
          type="button"
          key={key}
          className={`hotspot-dot hotspot-${key} ${active === key ? "is-active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            toggleNote(key);
          }}
          aria-label={`查看标注 ${key}`}
        >
          <span>{key}</span>
        </button>
      ))}
      {note && (
        <aside
          className={`sticky-note sticky-note-${active}`}
          onClick={(event) => event.stopPropagation()}
        >
          <strong>{note.title}</strong>
          {note.body && (
            <div className="sticky-note-body">
              {note.body.map(([label, copy]) => (
                <p key={label}><b>{label}</b>-{copy}</p>
              ))}
            </div>
          )}
          {note.image && (
            <button type="button" className="sticky-note-image" onClick={() => onZoom(dayiAsset(note.image), "便签截图")}>
              <img src={dayiAsset(note.image)} alt="便签截图" />
            </button>
          )}
          <button type="button" className="sticky-note-arrow" onClick={switchNote} aria-label="切换标注">
            <Icon name={note.direction === "left" ? "left" : "right"} size={16} />
          </button>
        </aside>
      )}
    </div>
  );
}

function InsightItem({ number, title, children, emphasis = false }) {
  return (
    <article className={emphasis ? "is-emphasis" : ""}>
      <b>{number}</b>
      <span>{title}</span>
      {children && <p>{children}</p>}
    </article>
  );
}

const PROJECT_SEQUENCE = [
  ["dayi", "大医智能体平台"],
  ["xiaoluo", "小罗智多星"],
  ["ai", "AI 设计探索"],
  ["qf", "轻流"],
  ["xt", "心田花开"]
];

function ProjectFooter({ project, onNavigate, onTop }) {
  const index = PROJECT_SEQUENCE.findIndex(([id]) => id === project);
  const previous = index > 0 ? PROJECT_SEQUENCE[index - 1] : null;
  const next = index >= 0 && index < PROJECT_SEQUENCE.length - 1 ? PROJECT_SEQUENCE[index + 1] : null;
  return (
    <footer className="project-footer">
      <span>{previous && <button type="button" className="project-footer-nav" onClick={() => onNavigate(previous[0])}><Icon name="left" size={16} />{previous[1]}</button>}</span>
      <button type="button" className="project-footer-top" onClick={onTop} aria-label="回到顶部"><Icon name="up" size={16} /></button>
      <span>{next && <button type="button" className="project-footer-nav" onClick={() => onNavigate(next[0])}>{next[1]}<Icon name="right" size={16} /></button>}</span>
    </footer>
  );
}

function ProjectDetail({ onBack, onHome, onNavigate }) {
  const scrollerRef = useRef(null);
  const [zoom, setZoom] = useState(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const lastScrollTop = useRef(0);
  const openZoom = (src, alt) => setZoom({ src, alt });
  const scrollTo = (id) => {
    const target = scrollerRef.current?.querySelector(`#${id}`);
    setActiveSection(id);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
      const handleScroll = () => {
      const current = scroller.scrollTop;
      const delta = current - lastScrollTop.current;
      if (current < 24) {
        setHeaderHidden(false);
      } else if (delta > 7) {
        setHeaderHidden(true);
      } else if (delta < -7) {
        setHeaderHidden(false);
      }

      const sections = PROJECT_NAV
        .map(([id]) => scroller.querySelector(`#${id}`))
        .filter(Boolean);
      const nextActive = sections.reduce((currentActive, section) => {
        const top = section.offsetTop - 140;
        return current >= top ? section.id : currentActive;
      }, null);
      setActiveSection(nextActive);
      if (current > 0) sessionStorage.setItem("dayiProjectScrollTop", String(current));
      lastScrollTop.current = current;
    };
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const savedTop = Number(sessionStorage.getItem("dayiProjectScrollTop") || 0);
    if (!savedTop) return undefined;
    const frame = requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({ top: savedTop, behavior: "auto" });
      lastScrollTop.current = savedTop;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!zoom) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoom]);

  return (
    <motion.div
      className="project-detail-shell"
      initial={{ opacity: 0, y: 72, scale: 0.985, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 36, scale: 0.992, filter: "blur(6px)" }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className={`project-header ${headerHidden ? "is-hidden" : ""}`}>
        <button type="button" className="project-logo" onClick={onHome}>LIAO</button>
        <button type="button" className="project-close" onClick={onBack} aria-label="关闭"><Icon name="close" size={24} /></button>
      </header>

      <aside className="project-toc">
        <button type="button" className="project-back" onClick={onBack}><Icon name="left" size={14} /> 返回</button>
        <nav aria-label="项目目录">
          {PROJECT_NAV.map(([id, label]) => (
            <button type="button" key={id} className={activeSection === id ? "is-active" : ""} onClick={() => scrollTo(id)}>{label}</button>
          ))}
        </nav>
      </aside>

      <main className="project-detail dayi-detail" ref={scrollerRef}>
        <section className="project-hero">
          <h1>大医智能体平台</h1>
          <p>一个医疗垂类 AI Agent 开发管理平台，以大模型为核心能力，通过标准化的工具调用、知识接入和工作流编排，助力快速构建符合医院评审要求的医疗 AI 助手，实现医疗服务的数智化转型。</p>
          <div className="project-tags">
            {["AI Agent", "医疗 SaaS", "工作流设计", "平台化产品"].map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <button type="button" className="project-hero-image" onClick={() => openZoom(dayiAsset("home-empty.png"), "大医智能体平台首页")}>
            <img src={dayiAsset("image-604.png")} alt="" />
            <img src={dayiAsset("home-empty.png")} alt="大医智能体平台首页" />
          </button>
        </section>

        <section id="overview" className="project-section">
          <h2>项目概览</h2>
          <div className="overview-card">
            {[
              ["时间线", "2024.11-2025.1"],
              ["角色", "用户体验设计师"],
              ["团队", "3 个设计师 分别负责不同模块"],
              ["Tools", "Sketch"],
              ["挑战", "在需求模糊的情况下从0开始了解 AI Agent 平台，2个月完成MVP设计。"],
              ["策略", "发散探索，竞品使用调研，快速收敛到最小成本方案。"]
            ].map(([label, value]) => (
              <div key={label}><span>{label}</span><p>{value}</p></div>
            ))}
          </div>
        </section>

        <section id="background" className="project-section">
          <h2>所以...为什么要做智能体平台？</h2>
          <div className="number-list">
            <InsightItem number="01" title="市场层面">随着《三级医院评审标准》的持续推进，智慧医院建设越来越成为医院必须完成的任务。医院需要一套能落地、能集成、符合医疗要求的 AI 产品。同时，大模型在医疗行业的应用不断发展，但通用型产品很难直接满足医疗场景对专业性、准确性和安全性的要求。</InsightItem>
            <InsightItem number="02" title="业务问题">当前公司虽然已经为部分医院交付过症状自诊、用药咨询等 AI 功能，但这些能力大多以单个项目定制开发的方式存在，导致功能分散、复用困难、维护成本高、交付效率低，难以支撑后续更多医院场景的快速复制和规模化落地。</InsightItem>
            <InsightItem number="03" title="机会判断" emphasis>不同的医疗 AI 功能，本质上都可以抽象为知识 + 规则 + 大模型 + 工具调用的组合，并进一步沉淀为智能体 + 工作流任务，从而形成可复用、可配置、可持续迭代的医疗 AI 底座。</InsightItem>
          </div>
        </section>

        <section id="goals" className="project-section">
          <h2>核心业务目标</h2>
          <div className="goal-grid">
            {[
              ["icon-tool.png", "提升平台化交付效率", "从项目制交付转向平台化交付，使单个场景的上线周期缩短40%～60%，单项目的人力投入下降30%～50%。"],
              ["icon-thumb-up.png", "提升医院项目转化与商业竞争力", "提升平台在医院评审、投标和方案演示中的支撑能力。"],
              ["icon-target.png", "建立平台运行治理与资源可控能力", "建立机构、模型、配额和监控的一体化治理能力，降低人工维护成本。"]
            ].map(([icon, title, copy]) => (
              <article key={title}><img src={dayiAsset(icon)} alt="" /><h3>{title}</h3><p>{copy}</p></article>
            ))}
          </div>
        </section>

        <section id="users" className="project-section">
          <h2>我们的用户是?</h2>
          <p className="section-copy">前期调研阶段，在缺少直接用户访谈条件的情况下，我结合产品经理提供的业务背景、平台现有用户数据及典型使用场景，对目标用户进行了初步拆解，并通过模拟访谈和行为路径推演，归纳出平台的三类核心用户画像。</p>
          <div className="role-table">
            <div>角色</div><div>背景</div><div>核心任务</div><div>使用频率</div>
            <div>产品经理 / 实施人员</div><div>负责医院项目交付、方案配置、上线演示</div><div>搭建 Agent、编排工作流、快速验证效果</div><div>高频</div>
            <div>医生 / 知识编辑</div><div>负责医学知识整理、内容维护、审核</div><div>维护知识库、校对知识内容、确保专业性</div><div>中频</div>
            <div>机构管理员</div><div>负责机构管理、模型配额、权限、监控</div><div>分配资源、配置模型、监控使用情况</div><div>高频</div>
          </div>
          <ProjectImage src={dayiAsset("image-605.png")} alt="用户角色图" className="user-roles-shot" onZoom={openZoom} />
        </section>

        <section id="insights" className="project-section">
          <h2>关键洞察</h2>
          <div className="number-list compact">
            <InsightItem number="01" title="通用 Agent 平台常默认“一个人完成全部工作”，但医疗场景天然是分工协作的。">知识维护、流程搭建、资源管理分别由不同角色承担，所以平台必须支持职责分层，而不是一股脑把所有能力平铺给所有</InsightItem>
            <InsightItem number="02" title="用户更依赖“复用已有方案”，而不是从零开始搭建">后期实际搭建项目时，更倾向于从模板、历史项目中找一个接近的方案，再修改。这说明平台要先降低起步成本，而不是一开始就把全部复杂度丢给用户。</InsightItem>
            <InsightItem number="03" title="搭建过程需要即时验证，降低试错成本">医疗流程搭建过程中关注的是输出是否符合预期，平台必须支持运行预览、快速调试、即时反馈，让用户在搭建过程中就完成验证。</InsightItem>
            <InsightItem number="04" title="运维侧关心的是整个平台资源的可控性" />
          </div>
        </section>

        <section id="architecture" className="project-section">
          <h2>平台信息框架</h2>
          <p className="section-copy">我负责的主要是平台首页、工作流平台级管理端部分内容、工具平台、模型管理、安全策略与监控和用户管理的部分内容。</p>
          <ProjectImage src={dayiAsset("info-architecture.png")} alt="平台信息架构" onZoom={openZoom} />
        </section>

        <section id="strategy" className="project-section">
          <h2>从分析到落地：将洞察点转化为推动转化的具体设计方案。</h2>
          <div className="strategy-block">
            <h3><span>01</span> 建立平台产品结构认知，帮助不同角色用户提升任务执行效率</h3>
            <p>在设计首页时，主要围绕用户在 AI 平台中的核心任务进行设计，包括快速体验智能体模板、继续当前项目以及学习平台能力三个核心路径，因此首页通过模板推荐、最近编辑以及新手教程三个模块，分别承接用户的体验、开发和学习路径，从而降低 AI 应用构建的使用门槛。</p>
            <HotspotDemo onZoom={openZoom} />
          </div>
          <div className="strategy-block">
            <h3><span>02</span> 降低 AI 应用开发门槛和重复搭建成本，推动用户高效使用工作流实现复杂任务自动化。</h3>
            <div className="competitor-copy">
              <h4>竞品分析-工作流</h4>
              <p>主要在核心业务的工作流模块投入较多的时间做了更细致的竞品分析，选取了行业里较成熟、用户认知较强的通用型 Agent 平台，帮助我快速理解业务需求。</p>
              <p>综合来看，<strong>Dify 整体比较契合我们平台的需求</strong>，因为它在<strong>单节点调试、全链路预览、运行状态可视化、日志记录</strong>这几项核心能力上更为完整，这与医疗 AI Agent 平台的核心诉求最匹配。但由于技术侧限制，节点编辑模式最终选择了 <strong>Fast GPT</strong> 的形式。因此在设计策略上，我选择多方参考优势项，保证<strong>单节点调试 + 全链路预览、运行状态与日志可视化、复杂画布的导航与编辑能力。</strong></p>
              <p>由于项目当时处于平台从 0 到 1 的建设阶段，且需要优先支撑医院方案演示和基础交付，因此工作流模块在第一阶段优先采用了更稳妥的通用型解法，先保证搭建、预览、发布等核心链路可用；该模块主要的医疗场景差异化体现在后续的医学专题库节点。</p>
            </div>
            <div className="horizontal-gallery" aria-label="竞品分析图片横向滚动">
              {["competitor-1.png", "competitor-2.png", "competitor-3.png"].map((name, index) => (
                <ProjectImage key={name} src={dayiAsset(name)} alt={`竞品分析 ${index + 1}`} onZoom={openZoom} />
              ))}
            </div>
          </div>
        </section>

        <section className="project-section solution-section">
          <article>
            <h3>a. 创建规范统一的节点连接规则，通过低门槛的可视化节点 + 连线的工作流编排替代代码开发；</h3>
            <ProjectImage src={dayiAsset("workflow-rules.png")} alt="节点连接规则" onZoom={openZoom} />
          </article>
          <article>
            <h3>b. 通过节点类型的视觉分层设计，提供执行状态反馈，增强流程可理解性；</h3>
            <ProjectImage src={dayiAsset("node-types.png")} alt="节点类型视觉分层" onZoom={openZoom} />
          </article>
          <article>
            <h3>c. 提供变更历史、执行状态可视化反馈、和节点级结果查看，强化搭建过程中的验证能力</h3>
            <div className="validation-gallery">
              <ProjectImage src={dayiAsset("execution-state.png")} alt="执行状态可视化反馈" onZoom={openZoom} />
              <ProjectImage src={dayiAsset("detail-result.png")} alt="节点级结果查看" onZoom={openZoom} />
            </div>
          </article>
          <article>
            <h3><span>03</span> 提升机构管理员在多模型场景下的模型资源管理效率</h3>
            <p className="section-copy">面向机构管理员和平台运维，模型管理模块需要支持模型配置、监控、数据与插件配置，帮助团队在多模型场景下更清楚地分配、观察和治理资源。</p>
            <ul className="figma-bullets">
              <li>统一管理模型配置与插件能力；</li>
              <li>通过监控与数据视图降低人工维护成本；</li>
              <li>为后续医院项目扩展提供稳定的治理基础。</li>
            </ul>
            <div className="model-management-gallery">
              <ProjectImage src={dayiAsset("model-management-1.png")} alt="模型管理页面一" className="model-management-shot model-management-shot-primary" onZoom={openZoom} />
              <ProjectImage src={dayiAsset("model-management-2.png")} alt="模型管理页面二" className="model-management-shot" onZoom={openZoom} />
            </div>
          </article>
        </section>

        <section id="others" className="project-section">
          <h2>其他页面</h2>
          <div className="horizontal-gallery other-gallery">
            {["other-hover.png", "other-mcp.png"].map((name, index) => (
              <ProjectImage key={name} src={dayiAsset(name)} alt={`其他页面 ${index + 1}`} onZoom={openZoom} />
            ))}
          </div>
        </section>

        <section id="summary" className="project-section summary-section">
          <h2>项目总结</h2>
          <p>产品上线后初步完成了医疗 AI 平台从项目制交付向平台化建设的关键过渡，成为后续医院项目更高效地交付和扩展的基座。<br />新场景从方案整理到可演示版本产出的周期预计缩短约：</p>
          <div className="metric-card"><Icon name="down" size={32} /> <strong>30%–40%</strong></div>
          <h3>通过这个项目，我收获了...</h3>
          <div className="summary-grid">
            <div>
              <h4><span>01</span> 对 AI 医疗行业落地的理解</h4>
              <p>对 AI 在医疗场景中的落地方式有了更清晰的认知，AI 并不能替代医生，主要是作为辅助工具嵌入现有医疗流程，并且医疗场景对准确性与可控性要求极高，因此不能依赖纯大模型能力，实际落地中需要结合合理的规则逻辑、医疗知识库、医院系统接口（HIS / EMR）等来进行产品设计，尽量减小AI幻觉问题。<strong>AI 在垂直行业的价值，本质上是一种能力的组合。</strong></p>
              <h4><span>02</span> 对工作方式的反思</h4>
              <p>在项目推进过程中，我也对设计工作的方式有了一些新的思考，前期对我们来说最大的挑战是<strong>需求不明晰+时间紧任务重</strong>。需求评审后还存在大量模糊的内容，此时我们分模块对整体需求进行了梳理，将不明确的点进行标注，并做了大量竞品体验，和产品共同定义讨论后梳理出较为完整的需求框架，由此开始着手设计。所以在之后的工作中，针对一些还在探索的业务场景，<strong>设计需要更早参与产品定义，同时与产品、技术需要更紧密协作，才能提升方案推进效率。</strong></p>
            </div>
            <ProjectImage src={dayiAsset("summary.png")} alt="项目总结插图" className="summary-shot" onZoom={openZoom} />
          </div>
        </section>

        <ProjectFooter project="dayi" onNavigate={onNavigate} onTop={() => scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" })} />
      </main>

      <AnimatePresence>
        {zoom && (
          <motion.div className="image-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(null)}>
            <button type="button" aria-label="关闭图片预览" onClick={() => setZoom(null)}><Icon name="close" size={24} /></button>
            <img src={zoom.src} alt={zoom.alt} onClick={(event) => event.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function XiaoluoProjectDetail({ onBack, onHome, onNavigate }) {
  const scrollerRef = useRef(null);
  const [zoom, setZoom] = useState(null);
  const [activeSection, setActiveSection] = useState(XIAOLUO_NAV[0][0]);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollTop = useRef(0);
  const manualActiveUntil = useRef(0);
  const openZoom = (src, alt) => setZoom({ src, alt });
  const xlImg = (name) => xiaoluoAsset(`assets/${name}`);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    const handleScroll = () => {
      const current = scroller.scrollTop;
      if (current > 0) sessionStorage.setItem("xiaoluoProjectScrollTop", String(current));
      setHeaderHidden(current > lastScrollTop.current && current > 96);

      const sections = [...XIAOLUO_NAV, ["shenbi-intro"], ...SHENBI_NAV]
        .map(([id]) => document.getElementById(id))
        .filter(Boolean);
      const currentSection = sections.findLast((section) => section.offsetTop - current <= 160);
      if (currentSection && Date.now() > manualActiveUntil.current) setActiveSection(currentSection.id);
      lastScrollTop.current = current;
    };
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const savedTop = Number(sessionStorage.getItem("xiaoluoProjectScrollTop") || 0);
    if (!savedTop) return undefined;
    const frame = requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({ top: savedTop, behavior: "auto" });
      lastScrollTop.current = savedTop;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!zoom) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoom]);

  const scrollToSection = (id) => {
    const scroller = scrollerRef.current;
    const target = document.getElementById(id);
    if (!scroller || !target) return;
    setActiveSection(id);
    manualActiveUntil.current = Date.now() + 700;
    scroller.scrollTo({ top: target.offsetTop - 96, behavior: "smooth" });
  };

  return (
    <motion.div
      className="project-detail-shell xiaoluo-detail-shell"
      initial={{ opacity: 0, y: 72, scale: 0.985, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 36, scale: 0.992, filter: "blur(6px)" }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className={`project-header xiaoluo-header ${headerHidden ? "is-hidden" : ""}`}>
        <button type="button" className="project-logo" onClick={onHome}>LIAO</button>
        <button type="button" className="project-close" onClick={onBack} aria-label="关闭项目"><Icon name="close" size={24} /></button>
      </header>

      <aside className="project-toc xiaoluo-toc">
        <button type="button" className="project-back" onClick={onBack}><Icon name="left" size={14} /> 返回</button>
        <img className="xiaoluo-roche-logo" src={xlImg("roche-logo.png")} alt="Roche" />
        <nav aria-label="小罗智多星项目目录">
          <button
            type="button"
            className={`xiaoluo-nav-heading ${activeSection.startsWith("xl-") ? "is-active" : ""}`}
            onClick={() => scrollToSection("xl-overview")}
          >
            小罗智多星
          </button>
          {XIAOLUO_NAV.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`xiaoluo-nav-item ${activeSection === id ? "is-active" : ""}`}
              onClick={() => scrollToSection(id)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className={`xiaoluo-nav-heading ${activeSection.startsWith("shenbi-") ? "is-active" : ""}`}
            onClick={() => scrollToSection("shenbi-intro")}
          >
            神笔小罗
          </button>
          {SHENBI_NAV.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`xiaoluo-nav-item ${activeSection === id ? "is-active" : ""}`}
              onClick={() => scrollToSection(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="xiaoluo-detail" ref={scrollerRef} aria-label="小罗智多星项目详情">
        <section className="xiaoluo-hero" aria-label="小罗智多星项目首屏">
          <div className="xiaoluo-title-block">
            <h1>小罗智多星</h1>
            <p>小罗智多星是一款面向科研人员、临床医生的 AI 科研助手产品。产品基于大语言模型能力，围绕医学科研中的高频任务，提供 PubMed 检索、AI 智能检索、文献解读、科研问答、论文写作、文献结构化提取 等功能，帮助用户更高效地完成从文献搜集、阅读理解、研究设计到论文写作的科研全流程。</p>
            <div className="xiaoluo-tags">
              <span>AI 科研全链路</span>
              <span>B端医疗</span>
              <span>敏捷交付</span>
            </div>
          </div>
          <button type="button" className="xiaoluo-hero-visual" onClick={() => openZoom(xlImg("hero-ui.png"), "小罗智多星首页界面")}>
            <img className="xiaoluo-hero-bg" src={xlImg("hero-bg.png")} alt="" />
            <img className="xiaoluo-hero-ui" src={xlImg("hero-ui.png")} alt="小罗智多星首页界面" />
          </button>
        </section>

        <section id="xl-overview" className="xiaoluo-section xiaoluo-overview">
          <h2>项目概览</h2>
          <p>客户是一家医药外企，希望以 AI 工具为切入点，探索与合作医院之间的新型科研服务模式。客户希望通过该平台，为医生和科研人员提供更高效的科研支持工具，同时增强企业在医学科研服务中的合作价值。</p>
          <div className="xiaoluo-meta-card">
            {XIAOLUO_META.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section id="xl-background" className="xiaoluo-section xiaoluo-background">
          <div className="xiaoluo-split">
            <div>
              <h2>为什么需要科研 AI 工具？</h2>
              <p>在医院场景中，临床医生往往不仅承担诊疗工作，也需要参与科研课题、论文发表、病例报告等工作。科研成果既关系到个人职称晋升和学术影响力，也关系到科室建设、医院学科发展，以及医药企业与医院之间更深入的科研合作。</p>
              <p>但在真实工作中，临床科研长期面临几个典型问题 →</p>
            </div>
            <div className="xiaoluo-problem-stack">
              {["problem-1.png", "problem-2.png", "problem-3.png", "problem-4.png"].map((name, index) => (
                <button key={name} type="button" onClick={() => openZoom(xlImg(name), `科研问题 ${index + 1}`)}>
                  <img src={xlImg(name)} alt={`科研问题 ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="xl-users" className="xiaoluo-section">
          <h3>主要服务对象</h3>
          <div className="xiaoluo-persona-grid">
            {XIAOLUO_PERSONAS.map(([image, title, body]) => (
              <article key={title}>
                <img src={xlImg(image)} alt={title} />
                <h4>{title}</h4>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="xl-cycle" className="xiaoluo-section xiaoluo-cycle">
          <h3>医学科研全周期流程</h3>
          <div className="xiaoluo-flow-grid">
            {XIAOLUO_FLOW_COLUMNS.map((column) => (
              <div key={column.title} className="xiaoluo-flow-column" style={{ "--accent": column.color }}>
                <div className="xiaoluo-flow-head">
                  <span>{column.title}</span>
                  <em>{column.desc}</em>
                </div>
                {column.items.map(([number, title, body, tags]) => (
                  <article key={number}>
                    <b>{number}</b>
                    <h4>{title}</h4>
                    <p>{body}</p>
                    {tags.length > 0 && (
                      <div>
                        {tags.map((tag) => <span key={tag} title={tag}>{tag}</span>)}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section id="xl-goals" className="xiaoluo-section">
          <h2>产品核心目标</h2>
          <div className="xiaoluo-goal-grid">
            <article>
              <b>01</b>
              <h4>用户目标</h4>
              <p>医生和科研人员更高效地完成文献查找、论文阅读、研究思路整理、科研问题解答和论文写作。</p>
            </article>
            <article>
              <b>02</b>
              <h4>业务目标</h4>
              <p>帮助医药企业客户搭建面向合作医院的科研服务平台，形成可运营可扩展的 AI 科研产品。</p>
            </article>
          </div>
        </section>

        <section id="xl-process" className="xiaoluo-section xiaoluo-process">
          <h2>设计过程</h2>
          <div className="xiaoluo-blue-title"><span>01</span><strong>首页</strong></div>
          <div className="xiaoluo-home-copy">
            <p>首页初版时由于时间过于紧张，且客户前期对风格判断并不明确，团队成员先快速给出了两个方向，用来帮助客户判断整体偏好，结果客户表示保留两个方案，并支持主题切换配置和提供3个主题色切换。但后期实际内测使用时客户大部份时间都用的主题A，很少去切换主题配置，并接着提出了首页优化的需求，总结为以下问题：</p>
            <ul>
              <li>页面视觉重量偏高，<strong>信息焦点分散</strong>，应用入口样式不明显，方案A背景对比度过高会有些刺眼，方案B信息过多又容易找不到重点；</li>
              <li><strong>工具入口缺少分类与扩展机制</strong>，当前平铺方式当入口增加后，首页会不断向下延伸，新老功能同时展示，用户难以快速找到高频入口；</li>
              <li><strong>页面组件和视觉语言不够统一</strong>，圆形工具入口、卡片和icon等元素的表现形式存在差异，增加视觉噪声，且整体视觉缺少品牌感。</li>
            </ul>
          </div>
          <XiaoluoHomeDrafts xlImg={xlImg} openZoom={openZoom} />
          <XiaoluoHomeCompare xlImg={xlImg} openZoom={openZoom} />
        </section>

        <section id="xl-pubmed" className="xiaoluo-section xiaoluo-case-section">
          <div className="xiaoluo-blue-title"><span>02</span><strong>PubMed检索</strong></div>
          <p>医学科研人员在课题研究前期和论文撰写阶段都需要按照专业检索规则找到符合条件的文献，故接入了官方PubMed的数据库，帮助用户降低海量文献筛选与理解成本，提升医学证据获取效率。</p>
          <button type="button" className="xiaoluo-large-shot" onClick={() => openZoom(xlImg("pubmed-hero.png"), "PubMed 检索首页")}>
            <img src={xlImg("pubmed-hero.png")} alt="PubMed 检索首页" />
          </button>
          <div className="xiaoluo-copy-block">
            <h4>a. 采用左筛选+右结果的科研检索经典心智模型</h4>
            <p>结果卡片上通过结构化元数据，以高信息密度展示重点信息，帮助用户快速判断文献价值。</p>
            <h4>b. 提供 AI 便捷跳转入口，一键跳转至详情页并定位于 PDF解读模式，压缩任务链路</h4>
          </div>
          <button type="button" className="xiaoluo-large-shot" onClick={() => openZoom(xlImg("pubmed-result.png"), "PubMed 检索结果")}>
            <img src={xlImg("pubmed-result.png")} alt="PubMed 检索结果" />
          </button>
          <p className="xiaoluo-question">🤔 面对高专业门槛的医学文献，我们如何帮助用户快速提炼关键信息，提升文献阅读与研究决策效率？</p>
          <h3>嵌入 AI 辅助阅读助手</h3>
          <p>在详情页中保持论文原文/PDF作为主要内容区，将AI放置在侧边作为辅助层，让用户可以一边阅读原始材料，一边获取AI总结和延伸分析。</p>
          <button type="button" className="xiaoluo-large-shot" onClick={() => openZoom(xlImg("pubmed-detail.png"), "PubMed 文献详情 AI 辅助阅读")}>
            <img src={xlImg("pubmed-detail.png")} alt="PubMed 文献详情 AI 辅助阅读" />
          </button>
        </section>

        <section id="xl-ai-search" className="xiaoluo-section xiaoluo-case-section">
          <div className="xiaoluo-blue-title"><span>03</span><strong>AI智能检索</strong></div>
          <p>医学科研人员在文献检索过程中，通常需要经历问题拆解、关键词组合、文献筛选、内容阅读和结论整理等多个步骤。传统 PubMed 检索具有较高的专业门槛，而通用 AI 工具生成的答案又缺少稳定的证据追溯能力。</p>
          <p>因此，我们设计了PubMed 专业检索与 AI 智能检索两种模式：<strong>前者保留专业用户对检索策略和原始结果的检索需求，后者通过自然语言理解和大模型能力降低研究门槛</strong>。</p>
          <button type="button" className="xiaoluo-large-shot" onClick={() => openZoom(xlImg("ai-search-flow.png"), "AI 智能检索流程")}>
            <img src={xlImg("ai-search-flow.png")} alt="AI 智能检索流程" />
          </button>
          <p className="xiaoluo-question">🤔 我们如何在提升检索和阅读效率的同时，保证医学内容的专业可信度？</p>
          <div className="xiaoluo-feature-row">
            <button type="button" onClick={() => openZoom(xlImg("ai-search-low-barrier.png"), "降低检索门槛")}>
              <img src={xlImg("ai-search-low-barrier.png")} alt="降低检索门槛" />
            </button>
            <div>
              <h3>降低检索门槛</h3>
              <p>自然语言输入研究问题，系统自动规划检索策略。</p>
            </div>
          </div>
          <div className="xiaoluo-feature-row xiaoluo-feature-row-reverse">
            <div className="xiaoluo-evidence-list">
              <h3>保证证据可追溯</h3>
              <p>AI 生成的文献综述与参考文献由需求最初定义的上下结构优化为左右结构，便于一屏内同时查看文献来源；</p>
              <p>通过引用编号建立结论和证据之间的对应关系，增强用户对 AI 结果的信任；</p>
              <p>同时允许用户增删文献并重新生成，保留用户对证据范围的控制权。</p>
            </div>
            <button type="button" onClick={() => openZoom(xlImg("ai-search-evidence.png"), "保证证据可追溯")}>
              <img src={xlImg("ai-search-evidence.png")} alt="保证证据可追溯" />
            </button>
          </div>
        </section>

        <section id="xl-result" className="xiaoluo-section xiaoluo-result">
          <h2>项目成果</h2>
          <button type="button" className="xiaoluo-large-shot" onClick={() => openZoom(xlImg("result-banner.png"), "项目成果")}>
            <img src={xlImg("result-banner.png")} alt="项目成果" />
          </button>
          <p>在有限的项目周期内，首次以乙方视角介入项目，面对严格的交付时间和较高的客户期望，最终和团队紧密协作，保障了高保真方案的完美落地，得到了客户的高度认可，并直接促成了我们与该企业的二期合作，孵化出了专注于医疗垂直领域的 AI 内容生成平台——神笔小罗。</p>
        </section>

        <section id="shenbi-intro" className="xiaoluo-section shenbi-hero">
          <div className="xiaoluo-title-block">
            <h1>神笔小罗</h1>
            <p>神笔小罗是一款面向罗氏内部员工及医疗专业人士的医学垂类 AI 内容生成工具。通过 AI 一键生成医学幻灯、学术资讯及患者科普等专业内容，将医学数据快速转化为不同受众易于理解的材料，缩短制作周期，提升医学教育与专业传播效率。</p>
            <div className="xiaoluo-tags">
              <span>AI 内容创作</span>
              <span>内部生产工具</span>
            </div>
          </div>
        </section>

        <section id="shenbi-coop" className="xiaoluo-section shenbi-section">
          <h2>项目合作模式</h2>
          <p className="shenbi-section-copy">该项目是出自另一个部门的客户，他们有自己的设计师，所以合作模式更为复杂，涉及更多协调沟通工作。首先对方设计师会根据我方产品跟客户沟通后产出的 prd ，来梳理出50% 的大概框架的低保真交互稿，我们再完善剩下的交互细节+视觉设计，定期在群内汇报进度，对方设计和负责人审核通过后再进入研发。期间需要不断的和上下游对齐需求，沟通排期和实现问题。</p>
          <button type="button" className="shenbi-shot shenbi-coop-shot" onClick={() => openZoom(xlImg("shenbi-coop-1.png"), "神笔小罗项目合作模式")}>
            <img src={xlImg("shenbi-coop-1.png")} alt="神笔小罗项目合作模式" />
          </button>
          <button type="button" className="shenbi-shot shenbi-coop-flow" onClick={() => openZoom(xlImg("shenbi-coop-2.png"), "神笔小罗协作流程")}>
            <img src={xlImg("shenbi-coop-2.png")} alt="神笔小罗协作流程" />
          </button>
        </section>

        <section id="shenbi-overview" className="xiaoluo-section shenbi-section">
          <h2>项目概览</h2>
          <div className="shenbi-overview-board">
            {[
              ["shenbi-overview-1.png", "神笔小罗首页"],
              ["shenbi-overview-2.png", "神笔小罗幻灯生成"],
              ["shenbi-overview-3.png", "神笔小罗内容编辑"],
              ["shenbi-overview-4.png", "神笔小罗移动物料"]
            ].map(([name, alt]) => (
              <button key={name} type="button" className="shenbi-shot" onClick={() => openZoom(xlImg(name), alt)}>
                <img src={xlImg(name)} alt={alt} />
              </button>
            ))}
          </div>
        </section>

        <ProjectFooter project="xiaoluo" onNavigate={onNavigate} onTop={() => scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" })} />
      </main>

      <AnimatePresence>
        {zoom && (
          <motion.div className="image-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(null)}>
            <button type="button" aria-label="关闭图片预览" onClick={() => setZoom(null)}><Icon name="close" size={24} /></button>
            <img src={zoom.src} alt={zoom.alt} onClick={(event) => event.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RocheProductPanel({ product, isActive }) {
  return (
    <motion.article
      className="roche-product-panel"
      initial={false}
      animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : 28, pointerEvents: isActive ? "auto" : "none" }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden={!isActive}
    >
      <div className="roche-panel-heading">
        <span style={{ "--product-color": product.color }}>{product.label}</span>
        <h3>{product.name}</h3>
        <p>{product.tone}</p>
      </div>
      <div className="roche-panel-stage">
        {product.points.map((point, index) => (
          <div key={point} className="roche-flow-node">
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span>{point}</span>
          </div>
        ))}
      </div>
      <p className="roche-role-note">{product.role}。这里后续可以承接具体页面截图、你的设计决策、上线前后的优化点。</p>
    </motion.article>
  );
}

function RocheProjectDetail({ onBack, onHome }) {
  const scrollerRef = useRef(null);
  const [activeSection, setActiveSection] = useState(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [activeProduct, setActiveProduct] = useState("star");
  const lastScrollTop = useRef(0);
  const activeProductData = ROCHE_PRODUCTS[activeProduct];

  const scrollTo = (id) => {
    const target = scrollerRef.current?.querySelector(`#${id}`);
    setActiveSection(id);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    const handleScroll = () => {
      const current = scroller.scrollTop;
      const delta = current - lastScrollTop.current;
      if (current < 24) {
        setHeaderHidden(false);
      } else if (delta > 7) {
        setHeaderHidden(true);
      } else if (delta < -7) {
        setHeaderHidden(false);
      }

      const sections = ROCHE_NAV
        .map(([id]) => scroller.querySelector(`#${id}`))
        .filter(Boolean);
      const nextActive = sections.reduce((currentActive, section) => {
        const top = section.offsetTop - 140;
        return current >= top ? section.id : currentActive;
      }, null);
      setActiveSection(nextActive);
      if (current > 0) sessionStorage.setItem("rocheProjectScrollTop", String(current));
      lastScrollTop.current = current;
    };
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const savedTop = Number(sessionStorage.getItem("rocheProjectScrollTop") || 0);
    if (!savedTop) return undefined;
    const frame = requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({ top: savedTop, behavior: "auto" });
      lastScrollTop.current = savedTop;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <motion.div
      className="project-detail-shell roche-detail-shell"
      initial={{ opacity: 0, y: 72, scale: 0.985, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 36, scale: 0.992, filter: "blur(6px)" }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className={`project-header ${headerHidden ? "is-hidden" : ""}`}>
        <button type="button" className="project-logo" onClick={onHome || onBack}>LIAO</button>
        <button type="button" className="project-close" onClick={onBack} aria-label="关闭"><Icon name="close" size={24} /></button>
      </header>

      <aside className="project-toc">
        <button type="button" className="project-back" onClick={onBack}><Icon name="left" size={14} /> 返回</button>
        <nav aria-label="罗氏项目目录">
          {ROCHE_NAV.map(([id, label]) => (
            <button type="button" key={id} className={activeSection === id ? "is-active" : ""} onClick={() => scrollTo(id)}>{label}</button>
          ))}
        </nav>
      </aside>

      <main className="project-detail roche-detail" ref={scrollerRef}>
        <section id="roche-overview" className="roche-hero">
          <span className="roche-kicker">Roche Product Suite</span>
          <h1>罗氏内容智能化产品组</h1>
          <p>将“小罗制作星”和“神笔小罗”放在同一个项目里呈现：先说明它们共同服务的业务背景与内容链路，再分别进入两个产品的关键体验。即使单个产品参与内容不多，整体也能形成一条完整、可信的设计叙事。</p>
          <div className="roche-meta">
            <span>2 个产品</span>
            <span>内容生产 / 医学写作</span>
            <span>AI 辅助工作流</span>
          </div>
        </section>

        <section id="roche-map" className="project-section roche-map-section">
          <h2>两个产品如何放在一起讲？</h2>
          <p className="section-copy">我会把它们定义为同一个“内容智能化产品组”：小罗制作星更偏内容生产效率，神笔小罗更偏医学内容表达。页面不是硬塞两个项目，而是先建立产品关系，再进入具体产品。</p>
          <div className="roche-product-switch" style={{ "--active-color": activeProductData.color }}>
            <div className="roche-track" aria-hidden="true">
              <span>内容输入</span>
              <span>AI 生成</span>
              <span>编辑优化</span>
              <span>沉淀复用</span>
            </div>
            <div className="roche-switch-cards">
              {Object.entries(ROCHE_PRODUCTS).map(([key, product]) => (
                <button
                  type="button"
                  key={key}
                  className={activeProduct === key ? "is-active" : ""}
                  onClick={() => setActiveProduct(key)}
                >
                  <small>{product.label}</small>
                  <b>{product.name}</b>
                  <span>{product.role}</span>
                </button>
              ))}
            </div>
            <div className="roche-panel-wrap">
              {Object.entries(ROCHE_PRODUCTS).map(([key, product]) => (
                <RocheProductPanel key={key} product={product} isActive={activeProduct === key} />
              ))}
            </div>
          </div>
        </section>

        <section id="roche-star" className="project-section roche-product-section">
          <h2>小罗制作星</h2>
          <p className="section-copy">这一段可以用“小而完整”的方式呈现：不强调项目体量，而是把你参与的环节讲清楚，例如需求理解、生成链路、模板/素材复用、编辑态体验。后续放 2-3 张关键截图即可。</p>
          <div className="roche-placeholder-grid">
            <article><b>01</b><h3>定位</h3><p>帮助业务侧更快完成内容从想法到初稿的生产。</p></article>
            <article><b>02</b><h3>设计重点</h3><p>降低输入成本，让生成、编辑和复用形成顺畅路径。</p></article>
            <article><b>03</b><h3>可展示内容</h3><p>流程页、生成结果页、模板或素材管理片段。</p></article>
          </div>
        </section>

        <section id="roche-pen" className="project-section roche-product-section">
          <h2>神笔小罗</h2>
          <p className="section-copy">这一段可以突出“专业表达辅助”：把医学内容写作的结构化、语气控制、合规提示和多场景复用讲成一个闭环。这样即使你只参与部分页面，也能体现你对产品价值的理解。</p>
          <div className="roche-placeholder-grid">
            <article><b>01</b><h3>定位</h3><p>面向医学内容场景，辅助完成更稳定、专业的文本表达。</p></article>
            <article><b>02</b><h3>设计重点</h3><p>让 AI 建议可控、可编辑，并为专业审核保留清晰判断依据。</p></article>
            <article><b>03</b><h3>可展示内容</h3><p>写作工作台、结果对比、提示词/语气调节或审核反馈。</p></article>
          </div>
        </section>

        <section id="roche-summary" className="project-section roche-summary">
          <h2>项目总结</h2>
          <p>这个项目可以诚实表达“参与深度有限”，但不要让它显得零散。重点放在你如何理解医疗内容 AI 的产品关系、如何把两个产品串成一套内容生产链路，以及后续如果继续深入会如何优化。</p>
          <div className="roche-summary-band">
            <span>整体介绍</span>
            <Icon name="right" size={20} />
            <span>双产品切换</span>
            <Icon name="right" size={20} />
            <span>局部设计贡献</span>
            <Icon name="right" size={20} />
            <span>复盘沉淀</span>
          </div>
        </section>

        <footer className="project-footer">
          <span><Icon name="left" size={24} /> 大医项目</span>
          <button type="button" onClick={() => scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" })} aria-label="回到顶部"><Icon name="up" size={24} /></button>
          <span>其他项目 <Icon name="right" size={24} /></span>
        </footer>
      </main>
    </motion.div>
  );
}

function AIHeaderPattern() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      const context = canvas.getContext("2d");
      if (!context) return;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      const color = getComputedStyle(canvas).color;
      buildDotPattern(width, height, { color, cell: 18, size: 5, offsetY: 10 }).forEach((dot) => {
        context.globalAlpha = dot.opacity;
        context.fillStyle = dot.color;
        context.fillRect(dot.x, dot.y, dot.size, dot.size);
      });
      context.globalAlpha = 1;
    };

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    draw();
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="ai-header-pattern" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

function AnimatedMetric({ value, label }) {
  const metricRef = useRef(null);
  const metric = parseMetricTarget(value);
  const [displayValue, setDisplayValue] = useState(() => formatMetricCount(0, metric));

  useEffect(() => {
    const node = metricRef.current;
    if (!node) return undefined;
    let animationFrame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplayValue(formatMetricCount(metric.target, metric));
        return;
      }
      const startTime = performance.now();
      const tick = (time) => {
        const progress = Math.min(1, (time - startTime) / 1400);
        setDisplayValue(formatMetricCount(metric.target * easeOutCubic(progress), metric));
        if (progress < 1) animationFrame = requestAnimationFrame(tick);
      };
      animationFrame = requestAnimationFrame(tick);
    }, { threshold: .35 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [value]);

  return (
    <article ref={metricRef}>
      <strong className="ai-count-value" aria-label={value}>{displayValue}</strong>
      <span>{label}</span>
    </article>
  );
}

function AIImage({ src, alt, onZoom, className = "" }) {
  const open = () => onZoom({ src, alt });
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      draggable={false}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
    />
  );
}

function AIGCCarousel({ images, onZoom }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => {
      setActive((current) => advanceCarouselIndex(current, images.length, 1));
    }, 4800);
    return () => window.clearInterval(timer);
  }, [images.length, paused]);

  const move = (direction) => setActive((current) => advanceCarouselIndex(current, images.length, direction));
  const [src, alt] = images[active];

  return (
    <div
      className="ai-aigc-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="ai-aigc-carousel-stage" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.figure
            key={src}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }}
          >
            <AIImage src={`/assets/ai/${src}`} alt={alt} onZoom={onZoom} />
          </motion.figure>
        </AnimatePresence>
      </div>
      <div className="ai-aigc-carousel-controls">
        <div className="ai-aigc-carousel-dots" aria-label="选择 AIGC 案例">
          {images.map(([imageSrc, imageAlt], index) => (
            <button type="button" key={imageSrc} className={active === index ? "is-active" : ""} onClick={() => setActive(index)} aria-label={`查看${imageAlt}`} />
          ))}
        </div>
        <div className="ai-aigc-carousel-arrows">
          <button type="button" onClick={() => move(-1)} aria-label="上一个 AIGC 案例"><Icon name="left" size={18} /></button>
          <button type="button" onClick={() => move(1)} aria-label="下一个 AIGC 案例"><Icon name="right" size={18} /></button>
        </div>
      </div>
    </div>
  );
}

function AISenseclawCompare({ onZoom }) {
  const frameRef = useRef(null);
  const dragStart = useRef(null);
  const dragged = useRef(false);
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);

  const updateSplit = (clientX) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSplit(clampComparisonSplit(((clientX - rect.left) / rect.width) * 100));
  };

  const startDrag = (event) => {
    event.preventDefault();
    dragStart.current = event.clientX;
    dragged.current = false;
    setDragging(true);
    updateSplit(event.clientX);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!dragging) return;
    if (Math.abs(event.clientX - dragStart.current) > 4) dragged.current = true;
    updateSplit(event.clientX);
  };

  const stopDrag = () => {
    setDragging(false);
    requestAnimationFrame(() => { dragged.current = false; });
  };

  const openSide = (event) => {
    if (dragged.current) return;
    const rect = frameRef.current?.getBoundingClientRect();
    const clickPercent = rect ? ((event.clientX - rect.left) / rect.width) * 100 : 50;
    const isBefore = clickPercent <= split;
    onZoom(isBefore
      ? { src: "/assets/ai/senseclaw-before.png", alt: "SenseClaw 研发内部使用的原始界面" }
      : { src: "/assets/ai/senseclaw-after.png", alt: "SenseClaw Bots 平台规范化改造后界面" });
  };

  return (
    <figure className="ai-before-after">
      <div
        ref={frameRef}
        className={`ai-compare-frame ${dragging ? "is-dragging" : ""}`}
        style={{ "--split": `${split}%` }}
        role="button"
        tabIndex={0}
        aria-label="拖动查看 SenseClaw 改造前后对比，点击查看大图"
        onClick={openSide}
        onKeyDown={(event) => {
          if (event.key === "Enter") onZoom({ src: "/assets/ai/senseclaw-after.png", alt: "SenseClaw Bots 平台规范化改造后界面" });
        }}
      >
        <img src="/assets/ai/senseclaw-after.png" alt="SenseClaw 改造后" draggable={false} />
        <div className="ai-compare-before"><img src="/assets/ai/senseclaw-before.png" alt="SenseClaw 改造前" draggable={false} /></div>
        <div className="ai-compare-divider" style={{ left: `${split}%` }} />
        <button
          type="button"
          className="ai-compare-handle"
          style={{ left: `${split}%` }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          aria-label="拖动对比改造前后效果"
        ><span /></button>
      </div>
      <p className="ai-compare-caption">Before/After</p>
    </figure>
  );
}

function AIDesignProjectDetail({ onBack, onHome, onNavigate }) {
  const scrollerRef = useRef(null);
  const [activeSection, setActiveSection] = useState(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [zoom, setZoom] = useState(null);
  const lastScrollTop = useRef(0);

  const scrollTo = (id) => {
    const target = scrollerRef.current?.querySelector(`#${id}`);
    setActiveSection(id);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    const handleScroll = () => {
      const current = scroller.scrollTop;
      const delta = current - lastScrollTop.current;
      if (current < 24) {
        setHeaderHidden(false);
      } else if (delta > 7) {
        setHeaderHidden(true);
      } else if (delta < -7) {
        setHeaderHidden(false);
      }

      const sections = AI_NAV
        .map(([id]) => scroller.querySelector(`#${id}`))
        .filter(Boolean);
      const nextActive = sections.reduce((currentActive, section) => {
        const top = section.offsetTop - 140;
        return current >= top ? section.id : currentActive;
      }, null);
      setActiveSection(nextActive);
      if (current > 0) sessionStorage.setItem("aiProjectScrollTop", String(current));
      lastScrollTop.current = current;
    };
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!zoom) return undefined;
    const close = (event) => event.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [zoom]);

  useEffect(() => {
    const savedTop = Number(sessionStorage.getItem("aiProjectScrollTop") || 0);
    if (!savedTop) return undefined;
    const frame = requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({ top: savedTop, behavior: "auto" });
      lastScrollTop.current = savedTop;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <motion.div
      className="project-detail-shell ai-detail-shell"
      initial={{ opacity: 0, y: 72, scale: 0.985, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 36, scale: 0.992, filter: "blur(6px)" }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className={`project-header ${headerHidden ? "is-hidden" : ""}`}>
        <button type="button" className="project-logo" onClick={onHome}>LIAO</button>
        <button type="button" className="project-close" onClick={onBack} aria-label="关闭"><Icon name="close" size={24} /></button>
      </header>

      <aside className="project-toc">
        <button type="button" className="project-back" onClick={onBack}><Icon name="left" size={14} /> 返回</button>
        <nav aria-label="AI 设计探索目录">
          {AI_NAV.map(([id, label]) => (
            <button type="button" key={id} className={activeSection === id ? "is-active" : ""} onClick={() => scrollTo(id)}>{label}</button>
          ))}
        </nav>
      </aside>

      <main className="project-detail ai-detail" ref={scrollerRef}>
        <AIHeaderPattern />
        <section id="ai-overview" className="ai-hero">
          <span className="ai-kicker"><em />AI DESIGN GOVERNANCE · 2025-2026</span>
          <h1><span>AI 驱动的</span><strong>设计规范与工作流治理</strong></h1>
          <p>从真实项目中提取共性问题，用 AI 辅助完成组件、原型、Prompt 与视觉资产的初稿生成，再通过人工校准形成团队可复用的设计系统能力。</p>
          <div className="ai-hero-meta">
            <span>UX/UI 设计</span>
            <span>Design System</span>
            <span>Prompt Workflow</span>
          </div>
        </section>

        <section className="project-section ai-section ai-context-section">
          <span className="ai-section-index">00 / Context</span>
          <h2>从零散尝试，到可复用的设计方法</h2>
          <p className="section-copy">起初，我主要在具体任务中使用 AI，例如辅助搭建组件、生成原型和制作视觉素材。随着实践推进，我开始关注这些尝试能否形成稳定的方法，并继续服务后续项目。</p>
          <div className="ai-overview-grid">
            {AI_OVERVIEW_CARDS.map(([number, title, copy]) => (
              <article key={number}>
                <b>{number}</b>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="ai-chat-system" className="project-section ai-section">
          <span className="ai-section-index">01 / Component</span>
          <h2>沉淀 AI Chat 组件库</h2>
          <p className="section-copy">AI Chat 组件库来自 Bots 与小罗智多星两个项目中的实际设计和交付。两个项目虽有不同的业务目标与使用场景，却持续出现相似的对话体验问题。与此同时，各大厂商也在持续更新 AI Chat 组件体系，以适应生成式 AI 带来的新交互形态，因此我们也开始着手搭建自己的组件库。</p>
          <div className="ai-project-case-grid">
            <article>
              <div className="ai-project-case-media"><AIImage src="/assets/ai/xiaoluo-chat-project.png" alt="小罗智多星文献解读与 AI 对话项目界面" onZoom={setZoom} /></div>
            </article>
            <article>
              <div className="ai-project-case-media"><AIImage src="/assets/ai/bots-chat-project.png" alt="Bots 对话机器人配置与调试项目界面" onZoom={setZoom} /></div>
            </article>
          </div>
          <p className="section-copy">团队基于两个项目的实践建设 AI Chat 组件库，并将其落地为可访问的前端组件网站。我主要负责 Chat 输入框模块，重点梳理输入区域、操作入口和发送控制之间的关系，同时覆盖默认、聚焦、生成、禁用和异常等状态。</p>
          <figure className="ai-evidence-figure ai-chat-evidence">
            <AIImage src="/assets/ai/ai-chat-input-system.png" alt="AI Chat 输入框组件规范、使用方式与移动端交互方案" onZoom={setZoom} />
            <figcaption>输入框基础规范、色彩与间距、上传、语音和移动端交互模式</figcaption>
          </figure>
          <figure className="ai-evidence-figure ai-component-site-evidence">
            <AIImage src="/assets/ai/component-library-site.png" alt="SenseCare UI 前端组件库 Sender 输入框组件站点" onZoom={setZoom} />
            <figcaption>设计规范同步落地为前端组件站点，支持团队直接查看组件能力与调用方式</figcaption>
          </figure>
          <div className="ai-metric-panel" aria-label="AI Chat 组件应用数据">
            <AnimatedMetric value="约 6 个" label="大模型相关项目采用" />
            <AnimatedMetric value="100%" label="大模型项目覆盖率" />
          </div>
        </section>

        <section id="ai-foundation" className="project-section ai-section ai-foundation-section">
          <div>
            <span className="ai-section-index">02 / Foundation</span>
            <h2>加快基础规范建设</h2>
            <p className="section-copy">在基础组件与设计规范建设中，我使用 Codex、Cursor 辅助整理规范和搭建组件。AI 可以快速给出基础框架，但设计师仍需提前明确视觉方向和审核标准，包括色彩、字体、间距、圆角、层级和组件状态等核心规则。以小罗项目为例，交付时间非常紧，我需要在一天内完成一套可用于后续设计与开发协作的基础规范；AI 负责加速框架搭建，我再逐项校准并最终形成可直接使用的 Figma 组件规范。</p>
            <blockquote>AI 帮助我快速搭出约 60% 的基础，剩余部分仍需设计师手动调整，达到可直接使用的 Figma 组件标准。</blockquote>
          </div>
          <figure className="ai-evidence-figure ai-foundation-evidence">
            <AIImage src="/assets/ai/design-system-overview.png" alt="设计规范中的色彩、字体、间距、阴影、圆角与组件示例" onZoom={setZoom} />
            <figcaption>从色彩、字体到间距、阴影和组件状态的基础设计规范</figcaption>
          </figure>
        </section>

        <section id="ai-prototype" className="project-section ai-section">
          <span className="ai-section-index">03 / AI Workflow</span>
          <h2>AI 提效方式的三阶段演变</h2>
          <p className="section-copy">在各类 AI to Prototype 工具开始流行时，我集中试用了 Stitch、Lovable、Magic Patterns、V0 等产品。综合团队已有的 Figma 使用环境、设计可调整性和后续交付方式，最终 Figma Make 更符合我们的需求。围绕真实项目的协作和交付，使用 AI 提效的工作方式也逐步经历了三个阶段：从多工具生成方案并验证方向，到形成可交付代码的完整流程，再到设计师直接进入代码环境完成 Rush 项目的质量校准。</p>
          <div className="ai-evolution-stack">
            <article className="ai-evolution-stage">
              <header><b>Phase 01</b><span>多工具生成与方案验证</span></header>
              <div className="ai-stage-content">
                <h3>先比较方案，再选择最适合的方向</h3>
                <p>拿到产品需求后，先使用不同 AI 工具快速生成可交互原型，分别检查信息结构、任务流程和关键交互。在不投入完整设计成本的前提下比较多个方向，选出最符合业务目标和使用体验的方案继续推进。</p>
                <figure className="ai-solution-compare" aria-label="AI 原型方案对比与选择概念图">
                  <div className="ai-solution-source"><span>需求输入</span><b>目标、流程、边界</b></div>
                  <div className="ai-solution-branches">
                    <article className="is-selected"><span>方案 A</span><div><i /><i /><i /></div><strong>流程清晰 · 体验更完整</strong></article>
                    <article><span>方案 B</span><div><i /><i /><i /></div><strong>信息完整 · 路径偏复杂</strong></article>
                  </div>
                  <div className="ai-solution-decision"><span>对比验证</span><b>选择方案 A</b></div>
                </figure>
              </div>
            </article>
            <article className="ai-evolution-stage is-featured">
              <header><b>Phase 02</b><span>完整 Make 设计流程</span></header>
              <div className="ai-stage-content">
                <h3>从需求梳理走到代码交付</h3>
                <p>随着实践深入，流程不再停留在“生成一个原型”，而是覆盖需求梳理、Prompt、方案比较、人工收敛和代码交付。我整理了相关提示词与流程，并在组会上向团队内部成员分享，让这套方法能够在后续项目中复用。最终产物是 Figma Make 代码包，前端可在此基础上继续完成接口对接，并保持较高的设计还原度。</p>
                <figure className="ai-evidence-figure ai-prompt-evidence">
                  <AIImage src="/assets/ai/prompt-workflow-reference.png" alt="设计公共 Prompt 与模板资产库" onZoom={setZoom} />
                </figure>
                <figure className="ai-prototype-flow" aria-label="Figma Make 原型与代码交付流程">
                  <ol>
                    {AI_PROTOTYPE_STEPS.map(([number, title, copy]) => (
                      <li key={number}>
                        <b>{number}</b>
                        <h3>{title}</h3>
                        <p>{copy}</p>
                      </li>
                    ))}
                  </ol>
                </figure>
              </div>
            </article>
            <article className="ai-evolution-stage">
              <header><b>Phase 03</b><span>前端 Cursor 协作</span></header>
              <div className="ai-stage-content">
                <h3>从完整流程，演变到设计直接介入代码环境</h3>
                <p>当项目进入需要快速 Rush 上线或演示的阶段，完整的原型与设计交付链路仍然可能过长。因此这一阶段进一步演变为：前端先依据产品原型和业务逻辑搭建可运行的基础环境，设计师随后直接进入代码，通过 Cursor 在 1–2 天内同步调试交互与视觉效果。设计不再只提供静态稿，而是在真实页面中完成质量校准，并和开发共同收敛最终结果。</p>
                <div className="ai-case-note">
                  <b>SenseClaw 案例</b>
                  <p>SenseClaw 最初是研发团队为内部使用搭建的产品，后来需要面向外部客户演示，因此必须快速 Rush 出一版符合 Bots 平台规范的视觉效果。我直接进入已有前端环境，用 Cursor 花一天完成整体视觉与交互校准：先让 AI 生成用于提炼视觉规范的 Prompt MD，再交给 Cursor 归纳 Bots 平台的整体规范并替换现有样式。AI 完成约 55% 的基础迁移，剩余部分通过持续对话调试，补齐布局、状态与细节质量。</p>
                </div>
                <figure className="ai-rush-logic" aria-label="SenseClaw 视觉规范迁移逻辑">
                  <ol>
                    <li><b>01</b><span>生成规范提炼 Prompt MD</span></li>
                    <li><b>02</b><span>Cursor 归纳 Bots 视觉规范</span></li>
                    <li><b>03</b><span>替换现有界面样式</span></li>
                    <li><b>04</b><span>AI 完成约 55% 基础效果</span></li>
                    <li><b>05</b><span>对话调试并人工收敛</span></li>
                  </ol>
                </figure>
                <AISenseclawCompare onZoom={setZoom} />
              </div>
            </article>
          </div>
        </section>

        <section id="ai-aigc" className="project-section ai-section">
          <span className="ai-section-index">04 / AIGC</span>
          <h2>扩展视觉生产边界</h2>
          <p className="section-copy">AIGC 的应用逐步从单张素材生成扩展到真实产品界面，覆盖健康方案视觉、医院一体机中的数字医生形象，以及神笔小罗 IP 在不同产品场景中的插图表达。</p>
          <p className="section-copy">生成速度能够显著降低视觉探索成本，但最终结果仍需要设计师控制角色一致性、品牌匹配、医学场景可信度和界面中的信息层级，确保内容不只是“可生成”，而是真正适合产品使用。</p>
          <AIGCCarousel images={AI_AIGC_IMAGES} onZoom={setZoom} />
        </section>

        <section id="ai-impact" className="project-section ai-section">
          <span className="ai-section-index">05 / Impact</span>
          <h2>AI 带来的变化，最终落在不同角色的协作方式上</h2>
          <p className="section-copy">这套探索的价值不只是生成速度更快，而是让不同角色更早共享同一个可操作方案，并在各自最擅长的环节继续完善。</p>
          <div className="ai-role-impact-list">
            {AI_ROLE_IMPACTS.map(([number, role, copy]) => (
              <article key={role}><b>{number}</b><h3>{role}</h3><p>{copy}</p></article>
            ))}
          </div>
        </section>

        <section id="ai-reflection" className="project-section ai-section ai-reflection">
          <span className="ai-section-index">06 / Reflection</span>
          <h2>AI 正在改变设计师组织问题的方式</h2>
          <div className="ai-reflection-list">
            <article className="ai-reflection-item">
              <b>01</b>
              <div><h3>从生成转向判断</h3><p>界面生成速度提升后，设计师需要投入更多精力识别问题、建立约束，并审核结果是否适合用户和业务。</p></div>
            </article>
            <article className="ai-reflection-item">
              <b>02</b>
              <div><h3>先梳理问题，再生成方案</h3><p>模糊需求很容易快速生成一个表面完整的方案，前期对用户、任务、流程、边界和评价标准的梳理会直接影响原型质量。</p></div>
            </article>
            <article className="ai-reflection-item ai-boundary-card">
              <b>03</b>
              <div>
                <h3>了解 AI 的能力边界</h3>
                <div className="ai-boundary-grid">
                  <section><h4>可利用 AI</h4><ul><li>快速生成和归纳信息</li><li>提供多方案灵感</li><li>处理重复性分析任务</li><li>辅助理解，降低复杂任务门槛</li></ul></section>
                  <section><h4>需要注意</h4><ul><li>可能出现幻觉或错误解释</li><li>对数据质量和上下文高度依赖</li><li>用户意图可能被误解</li><li>复杂决策仍需要人判断</li></ul></section>
                </div>
              </div>
            </article>
          </div>
        </section>

        <ProjectFooter project="ai" onNavigate={onNavigate} onTop={() => scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" })} />
      </main>
      <AnimatePresence>
        {zoom && (
          <motion.div className="image-lightbox ai-image-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(null)}>
            <motion.img src={zoom.src} alt={zoom.alt} initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .98 }} transition={{ duration: .22 }} onClick={(event) => event.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ImageArchiveProjectDetail({ project, onBack, onHome, onNavigate }) {
  const config = IMAGE_PROJECTS[project];
  const scrollerRef = useRef(null);
  const [zoom, setZoom] = useState(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    const handleScroll = () => {
      const current = scroller.scrollTop;
      const delta = current - lastScrollTop.current;
      if (current < 24) setHeaderHidden(false);
      else if (delta > 7) setHeaderHidden(true);
      else if (delta < -7) setHeaderHidden(false);
      lastScrollTop.current = current;
    };
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (zoom) setZoom(null);
      else onBack();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack, zoom]);

  if (!config) return null;

  return (
    <motion.div
      className={`project-detail-shell image-archive-shell image-archive-${project} ${headerHidden ? "is-header-hidden" : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
    >
      <header className={`project-header image-archive-header ${headerHidden ? "is-hidden" : ""}`}>
        <button type="button" className="project-logo" onClick={onHome}>LIAO</button>
        <button type="button" className="project-close" aria-label="关闭项目" onClick={onBack}><Icon name="close" size={20} /></button>
      </header>
      <main className="image-archive-layout" style={{ "--archive-accent": config.accent }}>
        <aside className="image-archive-sidebar">
          <button type="button" className="project-back image-archive-back" onClick={onBack}><Icon name="left" size={16} /> 返回</button>
          <div className="image-archive-intro">
            <span>{config.kicker}</span>
            <h1>{config.title}</h1>
            <p>{config.subtitle}</p>
          </div>
          <dl className="image-archive-meta">
            <div><dt>设计周期</dt><dd>{config.period}</dd></div>
            <div><dt>设计团队</dt><dd>{config.team}</dd></div>
            <div><dt>负责内容</dt><dd>{config.role}</dd></div>
          </dl>
          <div className="image-archive-progress" aria-hidden="true"><i /><span>{config.pages.length} PROJECT BOARDS</span></div>
          <div className="image-archive-switcher">
            <span>{project === "qf" ? <button type="button" onClick={() => onNavigate("ai")}><Icon name="left" size={14} />AI 设计探索</button> : <button type="button" onClick={() => onNavigate("qf")}><Icon name="left" size={14} />轻流</button>}</span>
            <span>{project === "qf" && <button type="button" onClick={() => onNavigate("xt")}>心田花开<Icon name="right" size={14} /></button>}</span>
          </div>
        </aside>
        <section className="image-archive-scroll" ref={scrollerRef}>
          <div className="image-archive-gallery" aria-label={`${config.title} 项目图集`}>
            {config.pages.map((src, index) => (
              <button
                type="button"
                className="image-archive-page"
                key={src}
                onClick={() => setZoom({ src, alt: `${config.title} 项目长图 ${index + 1}` })}
              >
                <img
                  src={src}
                  alt={`${config.title} 项目长图 ${index + 1}`}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              </button>
            ))}
          </div>
        </section>
      </main>
      <button type="button" className="image-archive-top" onClick={() => scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" })} aria-label="回到顶部"><Icon name="up" size={16} /></button>
      <AnimatePresence>
        {zoom && (
          <motion.div
            className="image-lightbox image-archive-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={zoom.alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(null)}
          >
            <motion.img
              src={zoom.src}
              alt={zoom.alt}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.99 }}
              onClick={(event) => event.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResumeIcon() {
  return (
    <div className="resume-icon" aria-label="Resume pdf">
      <img className="home-resume-notepad" src={asset("home-resume-notepad.webp")} alt="" />
    </div>
  );
}

function ResumePreviewer({ onClose }) {
  const [activeDoc, setActiveDoc] = useState(RESUME_DOCS[0].id);
  const [zoom, setZoom] = useState(100);
  const currentDoc = RESUME_DOCS.find((doc) => doc.id === activeDoc) || RESUME_DOCS[0];

  const updateZoom = (nextZoom) => {
    setZoom(Math.min(180, Math.max(60, nextZoom)));
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="resume-preview-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        className="resume-preview"
        role="dialog"
        aria-modal="true"
        aria-label="Resume PDF preview"
        initial={{ opacity: 0, y: 38, scale: 0.97, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 18, scale: 0.985, filter: "blur(4px)" }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        onClick={(event) => event.stopPropagation()}
      >
        <MacWindowControls onClose={onClose} label="关闭简历预览" />
        <div className="resume-preview-main">
          <header className="resume-preview-toolbar">
            <div className="resume-language-switch" role="tablist" aria-label="选择简历版本">
              {RESUME_DOCS.map((doc) => (
                <button
                  type="button"
                  key={doc.id}
                  className={currentDoc.id === doc.id ? "is-active" : ""}
                  role="tab"
                  aria-selected={currentDoc.id === doc.id}
                  onClick={() => {
                    setActiveDoc(doc.id);
                    setZoom(100);
                  }}
                >
                  {doc.language}
                </button>
              ))}
            </div>
            <div className="resume-view-controls" aria-label="PDF 查看控制">
              <button type="button" onClick={() => updateZoom(zoom - 10)} disabled={zoom <= 60} aria-label="缩小 PDF">−</button>
              <output aria-live="polite">{zoom}%</output>
              <button type="button" onClick={() => updateZoom(zoom + 10)} disabled={zoom >= 180} aria-label="放大 PDF">＋</button>
              <a className="resume-icon-action" href={currentDoc.src} download={currentDoc.fileName} aria-label="下载 PDF" data-tooltip="下载 PDF"><Icon name="download" size={17} /></a>
              <a className="resume-icon-action" href={currentDoc.src} target="_blank" rel="noreferrer" aria-label="在新窗口打开" data-tooltip="在新窗口打开"><Icon name="external" size={17} /></a>
            </div>
          </header>
          <div className="resume-pdf-stage">
            <div className="resume-document-canvas" style={{ width: `${zoom}%` }}>
              <img
                className="resume-document-image"
                src={currentDoc.previewSrc}
                alt={`${currentDoc.language}简历预览`}
              />
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function App() {
  const { scale, stageHeight } = useCanvasScale();
  const restoredProject = () => {
    const hashProject = window.location.hash === "#work/dayi" ? "dayi" : window.location.hash === "#work/xiaoluo" ? "xiaoluo" : window.location.hash === "#work/roche" ? "xiaoluo" : window.location.hash === "#work/ai" ? "ai" : window.location.hash === "#work/qf" ? "qf" : window.location.hash === "#work/xt" ? "xt" : null;
    const storedProject = sessionStorage.getItem("activeProject");
    return hashProject || (storedProject === "dayi" || storedProject === "xiaoluo" || storedProject === "roche" || storedProject === "ai" || storedProject === "qf" || storedProject === "xt" ? (storedProject === "roche" ? "xiaoluo" : storedProject) : null);
  };
  const initialProject = restoredProject();
  const [openedFolder, setOpenedFolder] = useState(() => initialProject ? "work" : null);
  const [activeProject, setActiveProject] = useState(() => initialProject);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [beeBurstKey, setBeeBurstKey] = useState(0);

  const openProject = (project = "dayi") => {
    setOpenedFolder("work");
    setActiveProject(project);
    sessionStorage.setItem("activeProject", project);
    window.history.replaceState(null, "", `#work/${project}`);
  };

  const closeProject = () => {
    setActiveProject(null);
    setOpenedFolder("work");
    sessionStorage.removeItem("activeProject");
    sessionStorage.removeItem("dayiProjectScrollTop");
    sessionStorage.removeItem("rocheProjectScrollTop");
    sessionStorage.removeItem("xiaoluoProjectScrollTop");
    sessionStorage.removeItem("aiProjectScrollTop");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const returnHome = () => {
    setActiveProject(null);
    setOpenedFolder(null);
    sessionStorage.removeItem("activeProject");
    sessionStorage.removeItem("dayiProjectScrollTop");
    sessionStorage.removeItem("rocheProjectScrollTop");
    sessionStorage.removeItem("xiaoluoProjectScrollTop");
    sessionStorage.removeItem("aiProjectScrollTop");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  useEffect(() => {
    if (!openedFolder) return undefined;
    if (activeProject || openedFolder === "life") return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpenedFolder(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [openedFolder, activeProject]);

  return (
    <main className="portfolio-page">
      <section className={`portfolio-frame ${activeProject ? "has-active-project" : ""}`}>
      <div className="portfolio-canvas" aria-label="Liao Space portfolio home" style={{ "--stage-scale": scale, "--stage-height": `${stageHeight}px` }}>
        <TopNavigation />

        <div className="workspace-content">
        <Draggable className="note-product">
          <div className="product-card">
            <h1>Product Designer</h1>
            <div className="note-paper">
              <p><strong>6</strong> years designing AI, B2B/B2C, and SaaS products across <b>healthcare, education, and enterprise.</b> Focused on end-to-end UX from research and strategy to design delivery.</p>
            </div>
          </div>
        </Draggable>

        <Draggable className="note-capability">
          <div className="capability-card">
            <h2>What I can do？</h2>
            <ul>
              <li>💥 AI Design</li>
              <li>✍️ Research-driven Strategy</li>
              <li>🎨 Complex Product Design</li>
              <li>👩‍💻 End-to-end Delivery</li>
            </ul>
          </div>
        </Draggable>

        <div className="hero-orb">
          <img src={asset("hero-frame.webp")} alt="A person working in a green field" fetchPriority="high" decoding="async" />
        </div>

        <FigmaFolder className="folder-work" variant="work" label="Work" onOpen={setOpenedFolder} />
        <FigmaFolder className="folder-life" variant="life" label="Life" onOpen={setOpenedFolder} />
        <FigmaFolder className="folder-playground" variant="playground" label="Playground" onOpen={setOpenedFolder} />

        <Draggable className="shortcut shortcut-resume resume-shortcut" onClick={() => setResumeOpen(true)}>
          <ResumeIcon />
          <span>Resume.pdf</span>
        </Draggable>
        </div>

        <Draggable className="cloud cloud-large" aria-hidden="true"><img src={asset("cloud.png")} alt="" /></Draggable>
        <Draggable className="cloud cloud-small" aria-hidden="true"><img src={asset("cloud.png")} alt="" /></Draggable>

        <Draggable
          className="tree tree-a"
          role="button"
          tabIndex={0}
          aria-label="点击树木放出像素蜜蜂"
          onClick={() => setBeeBurstKey((key) => key + 1)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") setBeeBurstKey((key) => key + 1);
          }}
        ><img src={asset("tree.png")} alt="" /></Draggable>
        <Draggable
          className="tree tree-b"
          role="button"
          tabIndex={0}
          aria-label="点击树木放出像素蜜蜂"
          onClick={() => setBeeBurstKey((key) => key + 1)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") setBeeBurstKey((key) => key + 1);
          }}
        ><img src={asset("tree.png")} alt="" /></Draggable>
        <BeeBurst burstKey={beeBurstKey} />
        <PixelCowCat />
      </div>
      <AnimatePresence>
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
        {activeProject === "dayi" && (
          <ProjectDetail
            key="project-dayi"
            onBack={closeProject}
            onHome={returnHome}
            onNavigate={openProject}
          />
        )}
        {activeProject === "xiaoluo" && (
          <XiaoluoProjectDetail
            key="project-xiaoluo"
            onBack={closeProject}
            onHome={returnHome}
            onNavigate={openProject}
          />
        )}
        {activeProject === "ai" && (
          <AIDesignProjectDetail
            key="project-ai"
            onBack={closeProject}
            onHome={returnHome}
            onNavigate={openProject}
          />
        )}
        {(activeProject === "qf" || activeProject === "xt") && (
          <ImageArchiveProjectDetail
            key={`project-${activeProject}`}
            project={activeProject}
            onBack={closeProject}
            onHome={returnHome}
            onNavigate={openProject}
          />
        )}
        {resumeOpen && (
          <ResumePreviewer
            key="resume-previewer"
            onClose={() => setResumeOpen(false)}
          />
        )}
      </AnimatePresence>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>
);
