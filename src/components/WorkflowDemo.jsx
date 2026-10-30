import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./workflow-demo.css";
import "../assets/workflow-iconfont/iconfont.css";
import {
  FORM_TYPES, INITIAL_EDGES, MODEL_PARAMETER_DEFS, RELATIONS, SYSTEM_VARIABLES,
  VARIABLE_TYPES, createInitialNodes, nextId
} from "./workflow-source-schema";
import ifElseIcon from "../assets/workflow-icons/if-else.png";
import userSelectIcon from "../assets/workflow-icons/user-select.png";
import formInputIcon from "../assets/workflow-icons/form-input.png";
import llmNodeIcon from "../assets/workflow-icons/llm-node.png";
import conversationEndIcon from "../assets/workflow-icons/conversation-end.png";
import datasetSearchIcon from "../assets/workflow-icons/dataset-search.png";

const WORKSPACE = { width: 2400, height: 2200 };
const NODE_WIDTH = 440;
const NODE_TYPES = {
  start: { label: "开始", color: "#3660dd" }, condition: { label: "判断", color: "#e7a30a" },
  choice: { label: "交互", color: "#e9ae16" }, score: { label: "表单", color: "#e9ae16" },
  model: { label: "模型", color: "#7658df" }, output: { label: "输出", color: "#4f78e8" },
  tool: { label: "工具", color: "#16a873" }
};
const PALETTE_NODES = [
  ["model", "对话大模型", "完整模型参数"],
  ["tool", "知识库检索", "医学资料查询"],
  ["output", "对话刷新", "刷新会话阶段"],
  ["condition", "条件分支", "IF / ELSE 判断"],
  ["choice", "单选分支", "交互与分流"],
  ["score", "表单配置", "收集结构化信息"]
];

function SourceIcon({ name, className = "", title, style }) {
  return <i className={`iconfont ${name} ${className}`.trim()} aria-hidden="true" title={title} style={style} />;
}

function LinearEditIcon({ size = 16 }) {
  return <svg className="wf-edit-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" d="M14 13.5c.276 0 .5.224.5.5s-.224.5-.5.5H2a.5.5 0 0 1 0-1h12Zm-2.33-11.333 2.121 2.121a1 1 0 0 1 0 1.415l-6.771 6.771a1 1 0 0 1-.669.292l-2.565.098a.5.5 0 0 1-.519-.519l.098-2.565a1 1 0 0 1 .292-.669l6.771-6.771a1 1 0 0 1 1.414 0Zm-.707.707L4.191 9.646l-.084 2.205 2.206-.084 6.771-6.772-2.121-2.121Z" /></svg>;
}

function FoldChevronIcon({ collapsed }) {
  return <svg className="wf-fold-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={collapsed ? "m9 6 6 6-6 6" : "m6 9 6 6 6-6"} /></svg>;
}

function FlowIcon({ name, size = 18 }) {
  const sourceNames = {
    left: "icon-a-left5x1", chevron: "icon-a-arrowdown5x", play: "icon-run", check: "icon-a-correct_fill5x",
    list: "icon-renwuzhongxin", plus: "icon-add", minus: "icon-decrease", reset: "icon-a-reset5x",
    expand: "icon-a-zoom5x", close: "icon-close", edit: "icon-edit_fill", trash: "icon-a-delete5x",
    grid: "icon-a-huihuabianliangbeifen3", map: "icon-minimap", undo: "icon-a-undo5x", redo: "icon-a-redo5x",
    history: "icon-a-changehistory", copy: "icon-copy", stop: "icon-zhongzhi", send: "icon-send",
    paperclip: "icon-wenjian", debug: "icon-a-start25x", info: "icon-information_fill", more: "icon-a-more5x"
  };
  if (sourceNames[name]) return <SourceIcon name={sourceNames[name]} style={{ fontSize: size }} />;
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    left: <path d="m11 4-5 5 5 5" />, chevron: <path d="m6 7 3 3 3-3" />,
    play: <path d="M6.5 4.5v9l7-4.5-7-4.5Z" />, check: <path d="m4 9 3 3 7-7" />,
    list: <><path d="M6 5h8M6 9h8M6 13h8" /><circle cx="3" cy="5" r=".6" fill="currentColor" /><circle cx="3" cy="9" r=".6" fill="currentColor" /><circle cx="3" cy="13" r=".6" fill="currentColor" /></>,
    plus: <path d="M9 3.5v11M3.5 9h11" />, minus: <path d="M3.5 9h11" />,
    reset: <><path d="M4.5 6.5A5.5 5.5 0 1 1 4 10" /><path d="M4.5 3.5v3h3" /></>,
    expand: <><path d="M3.5 7V3.5H7M11 3.5h3.5V7M14.5 11v3.5H11M7 14.5H3.5V11" /></>,
    close: <path d="m4.5 4.5 9 9m0-9-9 9" />,
    edit: <><path d="m4 12.5-.5 2 2-.5 7.8-7.8-1.5-1.5L4 12.5Z" /><path d="m10.8 5.7 1.5 1.5" /></>,
    trash: <><path d="M4.5 5.5h9M7 5.5V4h4v1.5M6 7.5l.5 6h5l.5-6" /></>,
    branch: <><path d="M4 3.5v7A3.5 3.5 0 0 0 7.5 14H14" /><path d="M4 7h6a3 3 0 0 0 3-3V3" /><circle cx="4" cy="3" r="1" fill="currentColor" stroke="none" /><circle cx="14" cy="3" r="1" fill="currentColor" stroke="none" /><circle cx="14" cy="14" r="1" fill="currentColor" stroke="none" /></>,
    spark: <><path d="m9 2 .8 2.3L12 5l-2.2.8L9 8l-.8-2.2L6 5l2.2-.7L9 2Z" /><path d="m4 9 .6 1.5L6 11l-1.4.5L4 13l-.5-1.5L2 11l1.5-.5L4 9Zm9 1 .6 1.5L15 12l-1.4.5L13 14l-.5-1.5L11 12l1.5-.5L13 10Z" /></>,
    grid: <><rect x="3" y="3" width="4" height="4" rx="1" /><rect x="11" y="3" width="4" height="4" rx="1" /><rect x="3" y="11" width="4" height="4" rx="1" /><rect x="11" y="11" width="4" height="4" rx="1" /></>,
    map: <><path d="m3 4.5 4-2 4 2 4-2v11l-4 2-4-2-4 2v-11Z" /><path d="M7 2.5v11m4-9v11" /></>,
    undo: <><path d="M6.5 5H3v-3" /><path d="M3.5 5A6 6 0 1 1 4 12" /></>,
    redo: <><path d="M11.5 5H15v-3" /><path d="M14.5 5A6 6 0 1 0 14 12" /></>,
    history: <><circle cx="9" cy="9" r="6" /><path d="M9 5.5V9l2.5 1.5" /></>,
    copy: <><rect x="6" y="6" width="8" height="8" rx="1.5" /><path d="M4 11H3.5A1.5 1.5 0 0 1 2 9.5v-6A1.5 1.5 0 0 1 3.5 2h6A1.5 1.5 0 0 1 11 3.5V4" /></>,
    stop: <rect x="5" y="5" width="8" height="8" rx="1.5" fill="currentColor" stroke="none" />,
    send: <><path d="m3 3 12 6-12 6 2-6-2-6Z" /><path d="M5 9h7" /></>,
    paperclip: <path d="M6.2 9.8 11 5a2 2 0 1 1 2.8 2.8l-5.6 5.6a3 3 0 0 1-4.2-4.2l5.3-5.3" />,
    debug: <><path d="M6 6h6v7a3 3 0 0 1-6 0V6Z" /><path d="M7 3.5 9 6l2-2.5M3.5 9H6m6 0h2.5M4.5 13H6m6 0h1.5" /></>,
    info: <><circle cx="9" cy="9" r="6" /><path d="M9 8v4M9 5.5h.01" /></>,
    more: <><circle cx="4" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="14" cy="9" r="1" fill="currentColor" stroke="none" /></>
  };
  return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" {...common}>{paths[name]}</svg>;
}

function StartNodeGlyph() {
  return <svg className="wf-source-node-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <rect width="24" height="24" rx="4" fill="#3660DD" />
    <g transform="translate(3 5)" fill="#fff">
      <path d="M6.96,3.37931034 C8.65872592,3.37931034 10.0826478,4.56264807 10.4612981,6.1544279 L17.04,6.15517241 C17.5701934,6.15517241 18,6.58744921 18,7.12068966 C18,7.6539301 17.5701934,8.0862069 17.04,8.0862069 L10.3953216,8.08578931 C9.93671485,9.55495747 8.57210378,10.6206897 6.96,10.6206897 C4.9717749,10.6206897 3.36,8.99965168 3.36,7 C3.36,5.00034832 4.9717749,3.37931034 6.96,3.37931034 Z" />
      <path d="M6.96,0 C7.88511155,0 8.7866272,0.18212987 9.62434279,0.531495236 C10.1140999,0.73574613 10.3464945,1.30063251 10.1434108,1.79320428 C9.94032702,2.28577605 9.37866857,2.5195063 8.88891149,2.31525541 C8.28332117,2.0626968 7.63161239,1.93103448 6.96,1.93103448 C4.17648486,1.93103448 1.92,4.20048765 1.92,7 C1.92,9.79951235 4.17648486,12.0689655 6.96,12.0689655 C7.67196638,12.0689655 8.31889405,11.9497648 8.88891149,11.7120417 C9.37866857,11.5077908 9.94032702,11.7415211 10.1434108,12.2340928 C10.3464945,12.7266646 10.1140999,13.291551 9.62434279,13.4958019 C8.81127665,13.8348873 7.91517478,14 6.96,14 C3.11609814,14 0,10.8659932 0,7 C0,3.13400675 3.11609814,0 6.96,0 Z" />
    </g>
  </svg>;
}

function SectionMark({ kind }) {
  if (kind === "launch") {
    return <svg className="wf-section-mark" viewBox="0 0 16 16" aria-hidden="true"><g transform="translate(1.3333 1.3333)" fill="none" stroke="#3660DD" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M6.6667 13.3333C10.3486 13.3333 13.3333 10.3486 13.3333 6.6667 13.3333 2.9848 10.3486 0 6.6667 0 2.9848 0 0 2.9848 0 6.6667 0 10.3486 2.9848 13.3333 6.6667 13.3333Z" /><path d="M4.3333 9.3333 5.0625 7.6667M9 9.3333 8.2708 7.6667M5.0625 7.6667 6.6667 4 8.2708 7.6667M5.0625 7.6667h3.2083" /></g></svg>;
  }
  if (kind === "session") {
    return <svg className="wf-section-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#3660DD" fillRule="nonzero" d="M10.2439149,3 C10.6581285,3 10.9939149,3.33578644 10.9939149,3.75 C10.9939149,4.16421356 10.6581285,4.5 10.2439149,4.5 L3,4.5 L3,16 L6.2578426,16 C7.08626972,16 7.7578426,16.6715729 7.7578426,17.5 L7.75775,19.5715 L12.1102024,16.2742435 L12.1530216,16.2440962 C12.3969159,16.0848175 12.6819107,16 12.973208,16 L19.5,16 L19.5,14.8844664 C19.5,14.4702528 19.8357864,14.1344664 20.25,14.1344664 C20.6642136,14.1344664 21,14.4702528 21,14.8844664 L21,16 C21,16.8284271 20.3284271,17.5 19.5,17.5 L12.976,17.5 L8.23415044,21.0927274 L8.19133123,21.1228747 C7.61331748,21.500355 6.83873646,21.3377906 6.46125611,20.7597768 C6.32852385,20.5565316 6.2578426,20.3190359 6.2578426,20.0762882 L6.2578426,17.5 L3,17.5 C2.17157288,17.5 1.5,16.8284271 1.5,16 L1.5,4.5 C1.5,3.67157288 2.17157288,3 3,3 L10.2439149,3 Z M15.3322839,3 C15.9909651,3 16.5725796,3.42970683 16.7660908,4.05932136 L17.363,6.002 L19.484421,3.52473771 C19.7377364,3.22871708 20.0948776,3.04434777 20.478956,3.00703139 L20.6240979,3 L21.75,3 C22.1642136,3 22.5,3.33578644 22.5,3.75 C22.5,4.16421356 22.1642136,4.5 21.75,4.5 L20.6240979,4.5 L17.884,7.7 L18.8224619,10.75 L19.75,10.75 C20.1642136,10.75 20.5,11.0857864 20.5,11.5 C20.5,11.9142136 20.1642136,12.25 19.75,12.25 L18.8224619,12.25 C18.1637806,12.25 17.5821662,11.8202932 17.388655,11.1906786 L16.73,9.049 L14.4411826,11.7252623 C14.1878671,12.0212829 13.8307259,12.2056522 13.4466475,12.2429686 L13.3015057,12.25 L12.1651747,12.25 C11.7509611,12.25 11.4151747,11.9142136 11.4151747,11.5 C11.4151747,11.0857864 11.7509611,10.75 12.1651747,10.75 L13.3015057,10.75 L16.208,7.352 L15.3322839,4.5 L13.4151747,4.5 C13.0009611,4.5 12.6651747,4.16421356 12.6651747,3.75 C12.6651747,3.33578644 13.0009611,3 13.4151747,3 L15.3322839,3 Z" /></svg>;
  }
  return <svg className="wf-section-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#3660DD" fillRule="nonzero" d="M12,1.5 C17.7989899,1.5 22.5,6.20101013 22.5,12 C22.5,17.7989899 17.7989899,22.5 12,22.5 C6.20101013,22.5 1.5,17.7989899 1.5,12 C1.5,6.20101013 6.20101013,1.5 12,1.5 Z M12,3 C7.02943725,3 3,7.02943725 3,12 C3,16.9705627 7.02943725,21 12,21 C16.9705627,21 21,16.9705627 21,12 C21,7.02943725 16.9705627,3 12,3 Z M10.3322839,7.5 C10.9909651,7.5 11.5725796,7.92970683 11.7660908,8.55932136 L12.363,10.502 L14.484421,8.02473771 C14.7377364,7.72871708 15.0948776,7.54434777 15.478956,7.50703139 L15.6240979,7.5 L16.75,7.5 C17.1642136,7.5 17.5,7.83578644 17.5,8.25 C17.5,8.66421356 17.1642136,9 16.75,9 L15.6240979,9 L12.884,12.2 L13.8224619,15.25 L14.75,15.25 C15.1642136,15.25 15.5,15.5857864 15.5,16 C15.5,16.4142136 15.1642136,16.75 14.75,16.75 L13.8224619,16.75 C13.1637806,16.75 12.5821662,16.3202932 12.388655,15.6906786 L11.73,13.549 L9.44118257,16.2252623 C9.18786712,16.5212829 8.8307259,16.7056522 8.44664754,16.7429686 L8.30150565,16.75 L7.16517465,16.75 C6.75096109,16.75 6.41517465,16.4142136 6.41517465,16 C6.41517465,15.5857864 6.75096109,15.25 7.16517465,15.25 L8.30150565,15.25 L11.208,11.852 L10.3322839,9 L8.41517465,9 C8.00096109,9 7.66517465,8.66421356 7.66517465,8.25 C7.66517465,7.83578644 8.00096109,7.5 8.41517465,7.5 L10.3322839,7.5 Z" /></svg>;
}

function NodeTypeIcon({ type, size = 18 }) {
  if (type === "start") return <StartNodeGlyph />;
  const imageIcons = {
    condition: ifElseIcon,
    choice: userSelectIcon,
    score: formInputIcon,
    model: llmNodeIcon,
    output: conversationEndIcon,
    tool: datasetSearchIcon
  };
  if (imageIcons[type]) return <img className="wf-source-node-icon" src={imageIcons[type]} width={size} height={size} alt="" aria-hidden="true" draggable="false" />;
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.65, strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    start: <><path d="M5 4.5h8v9H5z" /><path d="m8 7 3 2-3 2V7Z" /><path d="M3 6.5V3h3.5M15 11.5V15h-3.5" /></>,
    condition: <><path d="M4 3.5v3A2.5 2.5 0 0 0 6.5 9H14" /><path d="M4 14.5v-3A2.5 2.5 0 0 1 6.5 9" /><circle cx="4" cy="3" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="15" r="1" fill="currentColor" stroke="none" /><circle cx="14" cy="9" r="1" fill="currentColor" stroke="none" /></>,
    choice: <><path d="M4 4.5h10v7H8l-3.5 3v-3H4v-7Z" /><circle cx="7" cy="8" r=".8" fill="currentColor" stroke="none" /><circle cx="10" cy="8" r=".8" fill="currentColor" stroke="none" /><circle cx="13" cy="8" r=".8" fill="currentColor" stroke="none" /></>,
    score: <><rect x="4" y="3" width="10" height="12" rx="1.5" /><path d="M7 6h4M7 9h4M7 12h2" /><path d="M6.2 6h.01M6.2 9h.01M6.2 12h.01" /></>,
    model: <><path d="M5 5.5h8v7H5z" /><path d="M9 3v2.5M6.5 9h.01M11.5 9h.01M7 12.5v1.5m4-1.5V14" /><path d="M3 8v2m12-2v2" /></>,
    output: <><path d="M4 4.5h7v3h3v6H4v-9Z" /><path d="M11 4.5v3h3M7 10h4" /></>,
    tool: <><path d="M10.5 3a3.2 3.2 0 0 0 3.5 4.4l-6.6 6.6a1.7 1.7 0 1 1-2.4-2.4L11.6 5A3.2 3.2 0 0 0 10.5 3Z" /></>
  };
  return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" {...stroke}>{icons[type] || icons.tool}</svg>;
}

function NodeDebugGlyph() {
  return <SourceIcon name="icon-a-start25x" className="wf-node-debug-glyph" />;
}
function NodeMoreGlyph() {
  return <svg className="wf-node-more-glyph" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="12" r="1.5" fill="#333" /><circle cx="12.5" cy="12" r="1.5" fill="#333" /><circle cx="18.5" cy="12" r="1.5" fill="#333" /></svg>;
}
function PlusGlyph() {
  return <svg className="wf-plus-glyph" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 3.25v9.5M3.25 8h9.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}
function NodeAddPanel({ onPick }) {
  return <>
    <div className="workflow-palette-tabs"><b><SourceIcon name="icon-manage" />通用节点</b><span><SourceIcon name="icon-Favorites" />医学专题库</span><span><SourceIcon name="icon-tool1" />工具</span><span><SourceIcon name="icon-mcp" />MCP</span></div>
    <p>基础能力</p>
    <div>{PALETTE_NODES.map(([type, name, description]) => <button type="button" key={type} onClick={() => onPick(type)}><i><NodeTypeIcon type={type} size={20} /></i><span>{name}<small>{description}</small></span></button>)}</div>
  </>;
}

const stop = (event) => event.stopPropagation();
function Toggle({ checked, onChange, label }) {
  return <button type="button" className={`wf-toggle ${checked ? "is-on" : ""}`} onClick={(event) => { stop(event); onChange(!checked); }} aria-label={label} aria-pressed={checked}><i /></button>;
}
function Section({ title, action, mark, children, compact = false }) {
  return <section className={`wf-config-section ${compact ? "is-compact" : ""}`}><div className="wf-section-title"><b>{mark && <SectionMark kind={mark} />}{title}</b>{action}</div>{children}</section>;
}
function TinyButton({ children, onClick, danger = false, icon }) {
  return <button type="button" className={`wf-tiny-button ${danger ? "is-danger" : ""}`} onClick={(event) => { stop(event); onClick?.(); }}>{icon && <FlowIcon name={icon} size={icon === "trash" ? 16 : 13} />}{children}</button>;
}
function VariableTypeIcon({ item }) {
  const kind = item?.variableType === "session" ? "session" : item?.type || "input";
  const titles = { input: "文本输入框", textarea: "段落", number: "数字输入框", select: "单选框", session: "无交互" };
  const stroke = "rgba(51, 51, 51, .8)";
  return <svg className="wf-var-type-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
    <title>{titles[kind] || titles.input}</title>
    {kind === "number" && <g transform="translate(1.75 1.75)" stroke={stroke} strokeWidth="0.875" strokeLinecap="round" strokeLinejoin="round"><rect x="0" y="0" width="10.5" height="10.5" rx="0.875" /><line x1="3.792" y1="2.917" x2="3.792" y2="7.583" /><line x1="6.708" y1="2.917" x2="6.708" y2="7.583" /><line x1="2.917" y1="3.792" x2="7.583" y2="3.792" /><line x1="2.917" y1="6.708" x2="7.583" y2="6.708" /></g>}
    {kind === "select" && <g transform="translate(1.167 1.167)" stroke={stroke} strokeWidth="0.875"><circle cx="5.833" cy="5.833" r="5.833" /><circle cx="5.833" cy="5.833" r="2.333" /></g>}
    {kind === "session" && <g transform="translate(1.167 1.167)" stroke={stroke} strokeWidth="0.875" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.833" cy="5.833" r="5.833" /><line x1="3.208" y1="3.208" x2="8.458" y2="8.458" /></g>}
    {(kind === "input" || kind === "textarea" || !["number", "select", "session"].includes(kind)) && <g transform="translate(1.75 1.75)" stroke={stroke} strokeWidth="0.875" strokeLinecap="round" strokeLinejoin="round"><rect x="0" y="0" width="10.5" height="10.5" rx="0.875" /><polyline points="2.917 3.792 2.917 2.917 7.583 2.917 7.583 3.792" /><line x1="4.667" y1="8.167" x2="5.833" y2="8.167" /><line x1="5.25" y1="3.5" x2="5.25" y2="8.167" /></g>}
  </svg>;
}

function OutputList({ rows }) {
  return <div className="wf-output-list">{rows.map((row) => <div key={row.key}><span>{row.label}{row.required && <em className="wf-required">*</em>}{row.tip && <i className="iconfont icon-a-question_mark5x wf-field-tip" title={row.tip} />}</span><small className="wf-type-tag">{row.valueType}</small></div>)}</div>;
}

function StartConfig({ config, update, openModal }) {
  return <>
    <section className="wf-config-section wf-launch-row"><div className="wf-switch-row"><span><SectionMark kind="launch" />模型自启动</span><Toggle checked={config.autoStart} onChange={(value) => update({ ...config, autoStart: value })} label="模型自启动" /></div></section>
    <Section title="会话变量" mark="session" action={<TinyButton icon="plus" onClick={() => openModal("variable")}>添加</TinyButton>}>
      <div className="wf-variable-table"><div className="wf-table-head"><span>变量名</span><span>显示名称</span><span>数据类型</span><span /></div>
        {config.variables.map((item) => <div className="wf-table-row" key={item.id}><span className="wf-var-name"><VariableTypeIcon item={item} /><span>{item.key}</span>{item.required && <em className="wf-required">*</em>}</span><span>{item.name}</span><span><small className="wf-type-tag">{item.valueType}</small></span><span className="wf-row-actions"><button type="button" onClick={(event) => { stop(event); openModal("variable", item); }} aria-label="编辑变量"><LinearEditIcon size={16} /></button><button type="button" className="wf-delete-button" onClick={(event) => { stop(event); update({ ...config, variables: config.variables.filter((value) => value.id !== item.id) }); }} aria-label="删除变量"><FlowIcon name="trash" size={16} /></button></span></div>)}
      </div>
    </Section>
    <Section title="系统变量" mark="system"><OutputList rows={SYSTEM_VARIABLES.map((item) => ({ ...item, required: true, tip: item.key === "dialogueHistory" ? "仅限沙盒使用" : "" }))} /></Section>
  </>;
}

function relationGroup(valueType) {
  if (valueType?.startsWith("Array")) return "Array";
  if (["Image", "Doc", "Pdf", "Txt", "Excel"].includes(valueType)) return "File";
  if (valueType === "Integer") return "Number";
  return RELATIONS[valueType] ? valueType : "String";
}
function ConditionConfig({ config, update, variables }) {
  const mutate = (fn) => { const branches = structuredClone(config.branches); fn(branches); update({ ...config, branches }); };
  const addCondition = (branchIndex) => mutate((branches) => branches[branchIndex].conditions.push({ id: nextId("cond"), variable: "", valueType: "String", relation: "等于", enterType: 1, value: "" }));
  const addBranch = () => mutate((branches) => branches.push({ id: nextId("branch"), key: nextId("route"), logic: "AND", conditions: [{ id: nextId("cond"), variable: "", valueType: "String", relation: "等于", enterType: 1, value: "" }] }));
  return <div className="wf-branch-list">
    {config.branches.map((branch, branchIndex) => <section className="wf-branch-card" key={branch.id}>
      <div className="wf-branch-head"><span><b>{branchIndex === 0 ? "IF" : "ELSE IF"}</b>{config.branches.length > 1 && <small>优先级{branchIndex + 1}</small>}</span><span><TinyButton icon="plus" onClick={() => addCondition(branchIndex)}>添加</TinyButton>{config.branches.length > 1 && <TinyButton danger icon="trash" onClick={() => mutate((branches) => branches.splice(branchIndex, 1))} />}</span></div>
      <div className={`wf-condition-group ${branch.conditions.length > 1 ? "is-multi" : ""}`}>{branch.conditions.length > 1 && <button type="button" className="wf-logic" onClick={(event) => { stop(event); mutate((branches) => { branches[branchIndex].logic = branch.logic === "AND" ? "OR" : "AND"; }); }}>{branch.logic}<SourceIcon name="icon-qiehuan" /></button>}
      <div className="wf-condition-list">{branch.conditions.map((condition, conditionIndex) => {
        const disabledValue = ["为空", "不为空", "为TRUE", "为FALSE"].includes(condition.relation);
        return <div className="wf-condition-row" key={condition.id}>
          <select value={condition.variable} onPointerDown={stop} onChange={(event) => mutate((branches) => { const selected = variables.find((item) => item.key === event.target.value); Object.assign(branches[branchIndex].conditions[conditionIndex], { variable: event.target.value, valueType: selected?.valueType || "String", relation: "" }); })}><option value="">变量</option>{variables.map((item) => <option key={`${item.parent}-${item.key}`} value={item.key}>{item.label}</option>)}</select>
          <select value={condition.relation} onPointerDown={stop} onChange={(event) => mutate((branches) => { branches[branchIndex].conditions[conditionIndex].relation = event.target.value; })}><option value="">条件</option>{RELATIONS[relationGroup(condition.valueType)].map((item) => <option key={item}>{item}</option>)}</select>
          <select className="wf-enter-type" value={condition.enterType} onPointerDown={stop} onChange={(event) => mutate((branches) => { Object.assign(branches[branchIndex].conditions[conditionIndex], { enterType: Number(event.target.value), value: "" }); })}><option value={1}>输入</option><option value={2}>引用</option></select>
          {condition.enterType === 1 ? <input value={condition.value} disabled={disabledValue} placeholder="填写值" onPointerDown={stop} onChange={(event) => mutate((branches) => { branches[branchIndex].conditions[conditionIndex].value = event.target.value; })} /> : <select value={condition.value} disabled={disabledValue} onPointerDown={stop} onChange={(event) => mutate((branches) => { branches[branchIndex].conditions[conditionIndex].value = event.target.value; })}><option value="">目标变量</option>{variables.map((item) => <option key={`${item.parent}-${item.key}`} value={item.key}>{item.label}</option>)}</select>}
          {branch.conditions.length > 1 && <button type="button" className="wf-delete-button" onClick={(event) => { stop(event); mutate((branches) => branches[branchIndex].conditions.splice(conditionIndex, 1)); }} aria-label="删除条件"><FlowIcon name="trash" size={16} /></button>}
        </div>;
      })}</div></div>
    </section>)}
    <button type="button" className="wf-add-branch" onClick={(event) => { stop(event); addBranch(); }}><FlowIcon name="plus" size={14} /> 添加</button>
    <div className="wf-else-row">ELSE <span className="wf-route-port" /></div>
  </div>;
}

function ChoiceConfig({ config, update }) {
  const setOptions = (fn) => { const options = structuredClone(config.options); fn(options); update({ ...config, options }); };
  return <>
    <Section title="输入" action={<TinyButton icon="plus" onClick={() => setOptions((options) => options.push({ key: nextId("option"), value: "" }))}>添加</TinyButton>}>
      <label className="wf-field-label"><span>选择说明</span><textarea value={config.description} rows={3} placeholder="输入“/”可引用变量" onPointerDown={stop} onChange={(event) => update({ ...config, description: event.target.value })} /></label>
      <div className="wf-input-subsection">
        <div className="wf-input-subsection-title">选项</div>
        <div className="wf-option-list">{config.options.map((option, index) => <label key={option.key}><span>选项{index + 1}<em className="wf-required">*</em></span><div><input value={option.value} placeholder="输入“/”可引用变量" onPointerDown={stop} onChange={(event) => setOptions((options) => { options[index].value = event.target.value; })} />{config.options.length > 1 && <button type="button" className="wf-delete-button" onClick={(event) => { stop(event); setOptions((options) => options.splice(index, 1)); }} aria-label="删除选项"><FlowIcon name="trash" size={16} /></button>}</div></label>)}</div>
      </div>
    </Section>
    <Section title="输出"><OutputList rows={[{ key: "selectResult", label: "用户选择结果", valueType: "String", required: true }]} /></Section>
  </>;
}

function FormConfig({ config, update, openModal }) {
  const typeLabel = (value) => FORM_TYPES.find((item) => item.value === value)?.label || value;
  return <>
    <Section title="输入" action={<TinyButton icon="plus" onClick={() => openModal("form")}>添加</TinyButton>}>
      <label className="wf-field-label"><span>表单说明</span><textarea value={config.description} rows={2} onPointerDown={stop} onChange={(event) => update({ ...config, description: event.target.value })} /></label>
      <div className="wf-input-subsection">
        <div className="wf-input-subsection-title">表单配置</div>
        <div className="wf-form-list">{config.fields.map((field, index) => <div className="wf-form-item" key={field.id}><span className="wf-drag-mark">⋮⋮</span><div><b>{field.key}{field.required && <em className="wf-required">*</em>}</b><small>{typeLabel(field.type)} · {field.variableName}</small></div><button type="button" onClick={(event) => { stop(event); openModal("form", field); }} aria-label="编辑表单项"><LinearEditIcon size={16} /></button><button type="button" className="wf-delete-button" onClick={(event) => { stop(event); update({ ...config, fields: config.fields.filter((_, fieldIndex) => fieldIndex !== index) }); }} aria-label="删除表单项"><FlowIcon name="trash" size={16} /></button></div>)}</div>
      </div>
    </Section>
    <Section title="输出"><OutputList rows={config.fields.map((field) => ({ key: field.id, label: field.variableName, valueType: field.type === "number" ? "Number" : "String", required: field.required }))} /></Section>
  </>;
}

function ParameterSlider({ parameter, value, onChange }) {
  const ratio = (Number(value) - parameter.min) / (parameter.max - parameter.min || 1);
  const fill = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  return <label className="wf-range-row"><span>{parameter.label}</span><div className="wf-range-controls"><input type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={value} style={{ "--wf-fill": fill }} onPointerDown={stop} onChange={(event) => onChange(Number(event.target.value))} /><input type="number" min={parameter.min} max={parameter.max} step={parameter.step} value={value} onPointerDown={stop} onChange={(event) => onChange(Number(event.target.value))} /></div></label>;
}

function ModelConfig({ config, update }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const patch = (key, value) => update({ ...config, [key]: value });
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const diversityParameters = MODEL_PARAMETER_DEFS.filter((item) => ["randomness", "topP", "topK", "repetitionPenalty", "presencePenalty", "frequencyPenalty"].includes(item.key));
  const outputParameters = MODEL_PARAMETER_DEFS.filter((item) => ["token", "streamOutputIntervalMs"].includes(item.key));
  return <>
    <Section title="输入">
      <div className="wf-input-config-item wf-model-input-item">
        <span className="wf-input-subsection-title">模型配置</span>
        <div className={`wf-model-setting ${open ? "is-open" : ""}`} ref={rootRef}>
        <button type="button" className={`wf-model-trigger ${open ? "is-open" : ""}`} onClick={(event) => { stop(event); setOpen((value) => !value); }}>
          <span>{config.modelName || "请选择模型"}</span>
          <SourceIcon name="icon-decrease" />
        </button>
        {open && <div className="wf-model-pop nowheel" onPointerDown={stop} onWheel={stop}>
          <div className="wf-model-block">
            <p>切换配置</p>
            <select value={config.modelName} onPointerDown={stop} onChange={(event) => patch("modelName", event.target.value)}>{["DeepSeek-V3", "Qwen3-235B", "Claude Sonnet 4", "GPT-5.2"].map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="wf-model-block">
            <p>生成多样性</p>
            <div className="wf-segmented">{[["accurate", "精确"], ["balance", "平衡"], ["customize", "自定义"]].map(([value, label]) => <button type="button" className={config.diversityChooseType === value ? "is-active" : ""} key={value} onClick={(event) => { stop(event); patch("diversityChooseType", value); }}>{label}</button>)}</div>
            {config.diversityChooseType === "customize" && diversityParameters.map((parameter) => <ParameterSlider key={parameter.key} parameter={parameter} value={config[parameter.key]} onChange={(value) => patch(parameter.key, value)} />)}
          </div>
          <div className="wf-model-block">
            <p>输入及输出设置</p>
            {outputParameters.map((parameter) => <ParameterSlider key={parameter.key} parameter={parameter} value={config[parameter.key]} onChange={(value) => patch(parameter.key, value)} />)}
            <label className="wf-field-label"><span>携带上下文轮数</span><input type="number" min="0" max="50" value={config.round} onPointerDown={stop} onChange={(event) => patch("round", Number(event.target.value))} /></label>
          </div>
          <div className="wf-model-block">
            <p>推理</p>
            <div className="wf-switch-row"><span>开启推理</span><Toggle checked={config.openThink} onChange={(value) => patch("openThink", value)} label="开启推理" /></div>
            {config.openThink && <label className="wf-field-label"><span>推理强度</span><select value={config.reasoningEffort} onPointerDown={stop} onChange={(event) => patch("reasoningEffort", event.target.value)}><option value="inherit">继承模型</option><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select></label>}
          </div>
        </div>}
        </div>
      </div>
      <label className="wf-field-label"><span>用户问题</span><input value={config.userChatInput} placeholder="变量值" onPointerDown={stop} onChange={(event) => patch("userChatInput", event.target.value)} /></label>
      <div className="wf-switch-row"><span>视觉理解输入</span><Toggle checked={config.showChatImage} onChange={(value) => patch("showChatImage", value)} label="视觉理解输入" /></div>
      {config.showChatImage && <label className="wf-field-label"><span>图片变量</span><input value={config.chatImage} placeholder="选择图片变量" onPointerDown={stop} onChange={(event) => patch("chatImage", event.target.value)} /></label>}
      <div className="wf-switch-row"><span>展示知识库引用</span><Toggle checked={config.showKnowledgeReference} onChange={(value) => patch("showKnowledgeReference", value)} label="展示知识库引用" /></div>
      <label className="wf-field-label"><span>系统提示词</span><textarea maxLength={3000} rows={4} value={config.systemPrompt} placeholder="请输入系统提示词" onPointerDown={stop} onChange={(event) => patch("systemPrompt", event.target.value)} /></label>
      <label className="wf-field-label"><span>用户提示词<em className="wf-required">*</em></span><textarea maxLength={3000} rows={4} value={config.userPrompt} placeholder="请输入用户提示词" onPointerDown={stop} onChange={(event) => patch("userPrompt", event.target.value)} /></label>
    </Section>
    <Section title="输出"><OutputList rows={[{ key: "answerText", label: "节点AI输出内容", valueType: "String", required: true }]} /></Section>
  </>;
}

function NodeBody({ node, update, variables, openModal }) {
  if (node.type === "start") return <StartConfig config={node.config} update={update} openModal={openModal} />;
  if (node.type === "condition") return <ConditionConfig config={node.config} update={update} variables={variables} />;
  if (node.type === "choice") return <ChoiceConfig config={node.config} update={update} />;
  if (node.type === "score") return <FormConfig config={node.config} update={update} openModal={openModal} />;
  if (node.type === "model") return <ModelConfig config={node.config} update={update} />;
  if (node.type === "output") return <Section title="输出变量"><div className="wf-refresh-output">{node.config.output}</div></Section>;
  return <Section title="工具配置"><label className="wf-field-label"><span>检索关键词</span><input defaultValue="{{sys.userChatInput}}" onPointerDown={stop} /></label><OutputList rows={[{ key: "result", label: "检索结果", valueType: "String" }]} /></Section>;
}

function formatDebugValue(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function FoldAllGlyph({ collapsed }) {
  const d = collapsed
    ? "M4.15 6.05 8 2.45l3.85 3.6M4.15 9.95 8 13.55l3.85-3.6"
    : "M4.15 2.75 8 6.35l3.85-3.6M4.15 13.25 8 9.65l3.85 3.6";
  return <svg className="wf-toolbar-glyph" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ArrangeGlyph() {
  return <svg className="wf-toolbar-glyph" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.8 2.15h12.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><rect x="2.15" y="4.15" width="4.3" height="6.1" rx="1.1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="9.55" y="4.15" width="4.3" height="9.5" rx="1.1" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function buildDebugResult(node, { text = "", runtimeValues = {}, duration = "0.42s", showResult = false, answer = "" } = {}) {
  const input = { userChatInput: text, ...(runtimeValues && typeof runtimeValues === "object" ? runtimeValues : {}) };
  let output = { result: "节点输出已生成。" };
  let modelInfo = null;
  if (node?.type === "condition") output = { matched: true, branch: "IF", message: "命中 IF 分支，继续执行后续节点" };
  else if (node?.type === "choice") output = { options: (node.config?.options || []).map((option) => option.value) };
  else if (node?.type === "score") output = { fields: (node.config?.fields || []).map((field) => ({ name: field.key, variable: field.variableName, required: Boolean(field.required) })) };
  else if (node?.type === "output") output = { refreshed: true, content: "会话内容已刷新" };
  else if (node?.type === "model") {
    modelInfo = { modelName: node.config?.modelName || "DeepSeek-V3", modelVersion: "v1", token: 128 };
    output = { answer: answer || "已根据当前输入生成健康评估建议。" };
  } else if (answer) output = { answer };
  return { status: "success", showResult, duration, input, output, modelInfo };
}

function NodeDebugResult({ result, onToggle, onClear }) {
  if (!result) return null;
  const statusMeta = {
    running: { label: "运行中", icon: "icon-recalculate" },
    success: { label: "运行成功", icon: "icon-a-correct_fill5x" },
    failed: { label: "运行失败", icon: "icon-a-error_fill5x" },
    skipped: { label: "已跳过", icon: "icon-a-error_fill5x" }
  }[result.status] || { label: "等待运行", icon: "icon-recalculate" };
  const inputText = formatDebugValue(result.input);
  const outputText = formatDebugValue(result.output);
  const copyText = async (text) => { try { await navigator.clipboard.writeText(text || ""); } catch { /* clipboard can be unavailable in the embedded demo */ } };
  return <>
    <section className={`wf-node-debug-result is-${result.status || "idle"}`} onPointerDown={stop}>
      <SourceIcon name={statusMeta.icon} />
      <b>{statusMeta.label}</b>
      {result.status === "success" && result.duration && <em>{result.duration}</em>}
      {result.status && result.status !== "running" && <button type="button" onClick={onToggle}>{result.showResult ? "隐藏结果" : "显示结果"}</button>}
    </section>
    {result.showResult && result.status !== "running" && <aside className="wf-node-debug-dialog" onPointerDown={stop}>
      <header><b>运行结果</b><button type="button" className="is-primary" onClick={onClear}>完成</button></header>
      <div>
        {(result.modelInfo || result.modelName) && <div className="wf-debug-model">
          <div><span>模型名称</span><b>{result.modelInfo?.modelName || result.modelName}</b></div>
          {result.modelInfo?.modelVersion && <div><span>模型版本号</span><b>{result.modelInfo.modelVersion}</b></div>}
          {result.modelInfo?.token != null && <div><span>总token数</span><b>{result.modelInfo.token}</b></div>}
        </div>}
        {result.message && <p className="wf-debug-message">{result.message}</p>}
        <div className="wf-debug-json-title"><span>输入</span><button type="button" onClick={() => copyText(inputText)} aria-label="复制输入"><SourceIcon name="icon-copy" /></button></div>
        <pre>{inputText || "无输入"}</pre>
        <div className="wf-debug-json-title"><span>输出</span><button type="button" onClick={() => copyText(outputText)} aria-label="复制输出"><SourceIcon name="icon-copy" /></button></div>
        <pre>{outputText || "无输出"}</pre>
      </div>
    </aside>}
  </>;
}

function NodeDebugModal({ node, anchorRef, variables, onClose, onRun }) {
  const requiredVariables = useMemo(() => {
    const keys = new Set();
    if (node.type === "condition") node.config.branches?.forEach((branch) => branch.conditions?.forEach((condition) => { if (condition.variable) keys.add(condition.variable); if (condition.enterType === 2 && condition.value) keys.add(condition.value); }));
    if (node.type === "model") `${node.config.userChatInput || ""} ${node.config.systemPrompt || ""} ${node.config.userPrompt || ""}`.replace(/\{\{(?:sys\.)?([A-Za-z][A-Za-z0-9_]*)\}\}/g, (_, key) => { keys.add(key); return _; });
    variables.filter((item) => item.parent === "global").forEach((item) => keys.add(item.key));
    return variables.filter((item) => keys.has(item.key));
  }, [node, variables]);
  const [values, setValues] = useState(() => Object.fromEntries(requiredVariables.map((item) => [item.key, item.defaultValue ?? ""])));
  const [error, setError] = useState("");
  const [box, setBox] = useState(null);
  useEffect(() => {
    let frame = 0;
    let last = "";
    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) {
        const width = 400;
        const gap = 18;
        let left = rect.right + gap;
        if (left + width > window.innerWidth - 12) left = Math.max(12, rect.left - width - gap);
        const top = Math.max(72, Math.min(rect.top, window.innerHeight - 160));
        const next = `${Math.round(left)}:${Math.round(top)}`;
        if (next !== last) { last = next; setBox({ left, top }); }
      }
      frame = requestAnimationFrame(place);
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [anchorRef]);
  const submitDebug = () => {
    const empty = requiredVariables.find((item) => item.required && !String(values[item.key] ?? "").trim());
    if (empty) { setError(`请填写${empty.name || empty.label}`); return; }
    onRun(values);
  };
  if (!box) return null;
  const host = anchorRef.current?.closest(".workflow-demo") || document.body;
  return createPortal(<section className="wf-debug-modal is-floating nowheel" style={{ left: box.left, top: box.top }} onPointerDown={stop}>
      <header><b>调试</b><div><button type="button" onClick={onClose}>取消</button><button type="button" className="is-primary" onClick={submitDebug}>运行</button></div></header>
      <div className="wf-debug-modal-content">
        <div className="wf-debug-node-title"><span className="wf-debug-node-icon"><NodeTypeIcon type={node.type} size={22} /></span><span><b>{node.name}</b><small>仅运行当前节点</small></span></div>
        {requiredVariables.map((item) => <label key={`${item.parent}-${item.key}`}><span>{item.name || item.label}{item.required && <em className="wf-required">*</em>}<small className="wf-type-tag">{item.valueType}</small></span><input value={values[item.key] ?? ""} placeholder={`请输入${item.name || item.label}`} onChange={(event) => { setError(""); setValues((current) => ({ ...current, [item.key]: event.target.value })); }} /></label>)}
        {!requiredVariables.length && <p className="wf-debug-empty">无需填写，请直接运行</p>}
        {node.type === "model" && <div className="wf-debug-readonly"><span>当前模型</span><b>{node.config.modelName}</b></div>}
        {error && <p className="wf-debug-error">{error}</p>}
      </div>
    </section>, host);
}

const WorkflowNode = memo(function WorkflowNode({ node, selected, zoom, foldCommand, onSelect, onDrag, onDragEnd, onConnectStart, onAddConnected, onConfigChange, variables, onOpenModal, onRename, onDuplicate, onDelete, onRun, onMeasure, onToggleDebugResult, onClearDebugResult, debugOpen, onCloseDebug, onExecuteDebug }) {
  const type = NODE_TYPES[node.type] || NODE_TYPES.tool;
  const nodeRef = useRef(null);
  const inputPortRef = useRef(null);
  const outputPortRef = useRef(null);
  const pointerStart = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { if (foldCommand) setCollapsed(foldCommand.collapsed); }, [foldCommand]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(node.name);
  useEffect(() => {
    const element = nodeRef.current;
    if (!element) return undefined;
    const report = () => {
      const input = inputPortRef.current;
      const output = outputPortRef.current;
      const nodeRect = element.getBoundingClientRect();
      const scaleX = nodeRect.width / element.offsetWidth || 1;
      const scaleY = nodeRect.height / element.offsetHeight || 1;
      const center = (port) => {
        if (!port) return null;
        const rect = port.getBoundingClientRect();
        return { x: node.x + (rect.left + rect.width / 2 - nodeRect.left) / scaleX, y: node.y + (rect.top + rect.height / 2 - nodeRect.top) / scaleY };
      };
      onMeasure(node.id, { height: element.offsetHeight, input: center(input), output: center(output) });
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(element);
    return () => observer.disconnect();
  }, [collapsed, node.debugResult?.status, node.id, node.width, node.x, node.y, onMeasure]);
  useEffect(() => {
    if (!menuOpen && !addOpen) return undefined;
    const close = (event) => {
      if (nodeRef.current?.contains(event.target)) return;
      setMenuOpen(false);
      setAddOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [addOpen, menuOpen]);
  const onAddPointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const origin = { x: event.clientX, y: event.clientY };
    let dragged = false;
    const move = (moveEvent) => {
      if (dragged || Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y) <= 4) return;
      dragged = true;
      window.removeEventListener("pointermove", move);
      onConnectStart(node.id, "source", event);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!dragged) setAddOpen((value) => !value);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const handlePointerDown = (event) => {
    if (event.button !== 0 || event.target.closest("button, input, textarea, select")) return;
    event.stopPropagation(); onSelect(node.id); pointerStart.current = { x: event.clientX, y: event.clientY, nodeX: node.x, nodeY: node.y }; event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event) => { if (pointerStart.current) onDrag(node.id, pointerStart.current.nodeX + (event.clientX - pointerStart.current.x) / zoom, pointerStart.current.nodeY + (event.clientY - pointerStart.current.y) / zoom); };
  const handlePointerUp = () => { if (!pointerStart.current) return; pointerStart.current = null; onDragEnd(); };
  const saveName = () => { const next = draftName.trim(); if (next && next !== node.name) onRename(node.id, next); else setDraftName(node.name); setEditingName(false); };
  return <article ref={nodeRef} className={`wf-node wf-node-${node.type} ${selected ? "is-selected" : ""} ${collapsed ? "is-collapsed" : ""} ${addOpen ? "is-add-open" : ""} ${node.debugResult?.showResult ? "is-result-open" : ""} ${node.debugResult ? "has-debug" : ""} is-${node.status || "idle"}`} style={{ width: NODE_WIDTH, transform: `translate3d(${node.x}px, ${node.y}px, 0)`, "--node-accent": type.color }} onClick={() => onSelect(node.id)} data-node-id={node.id}>
    <NodeDebugResult result={node.debugResult} onToggle={() => onToggleDebugResult(node.id)} onClear={() => onClearDebugResult(node.id)} />
    <div className="wf-node-shell">
    <span ref={inputPortRef} className="wf-node-port wf-node-port-in" onPointerDown={(event) => onConnectStart(node.id, "target", event)} /><span ref={outputPortRef} className="wf-node-port wf-node-port-out" onPointerDown={(event) => onConnectStart(node.id, "source", event)} />
    {node.type !== "output" && <button type="button" className="wf-node-add" onPointerDown={onAddPointerDown} aria-label="添加并连接节点"><PlusGlyph /></button>}
    {addOpen && <div className="wf-add-popover workflow-palette" onPointerDown={stop}><NodeAddPanel onPick={(type) => { onAddConnected(node.id, type); setAddOpen(false); }} /></div>}
    <header className="wf-node-header" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
      <button type="button" className="wf-node-fold" onClick={(event) => { stop(event); setCollapsed((value) => !value); }} aria-label={collapsed ? "展开节点" : "折叠节点"}><FoldChevronIcon collapsed={collapsed} /></button>
      <span className="wf-node-icon"><NodeTypeIcon type={node.type} size={17} /></span>
      {editingName ? <input className="wf-node-name-input" autoFocus value={draftName} onPointerDown={stop} onChange={(event) => setDraftName(event.target.value)} onBlur={saveName} onKeyDown={(event) => { if (event.key === "Enter") saveName(); if (event.key === "Escape") { setDraftName(node.name); setEditingName(false); } }} /> : <><strong>{node.name}</strong><button type="button" className="wf-node-edit" onClick={(event) => { stop(event); setEditingName(true); }} aria-label="重命名节点"><LinearEditIcon size={16} /></button></>}
      <span className="wf-node-actions">
        {node.type !== "start" && <button type="button" className="wf-node-run" onClick={(event) => { stop(event); onRun(node.id); }} aria-label={`调试${node.name}`} title="调试该节点"><NodeDebugGlyph /></button>}
        <button type="button" className="wf-node-more" onClick={(event) => { stop(event); setMenuOpen((value) => !value); }} aria-label="节点操作"><NodeMoreGlyph /></button>
      </span>
      {menuOpen && <div className="wf-node-menu" onPointerDown={stop}><button type="button" onClick={() => { onDuplicate(node.id); setMenuOpen(false); }}><SourceIcon name="icon-a-addversion" /> 复制节点</button>{node.type !== "start" && <button type="button" className="is-danger" onClick={() => { onDelete(node.id); setMenuOpen(false); }}><SourceIcon name="icon-a-delete5x" /> 删除节点</button>}</div>}
    </header>
    {debugOpen && <NodeDebugModal node={node} anchorRef={nodeRef} variables={variables} onClose={onCloseDebug} onRun={onExecuteDebug} />}
    {!collapsed && <div className="wf-node-body" onPointerDown={stop}><NodeBody node={node} update={(config) => onConfigChange(node.id, config)} variables={variables} openModal={(kind, value) => onOpenModal(kind, node.id, value)} /></div>}
    </div>
  </article>;
});

function buildEdgePath(from, to) {
  const startX = from.x + from.width;
  const startY = from.y + from.height / 2;
  const endX = to.x;
  const endY = to.y + to.height / 2;
  return buildEdgePathBetween(startX, startY, endX, endY);
}

function buildEdgeGeometry(startX, startY, endX, endY) {
  const distance = endX - startX;
  const controlOffset = distance >= 0 ? distance * .5 : .25 * 25 * Math.sqrt(-distance);
  const c1x = startX + controlOffset;
  const c1y = startY;
  const c2x = endX - controlOffset;
  const c2y = endY;
  return {
    d: `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`,
    midX: .125 * startX + .375 * c1x + .375 * c2x + .125 * endX,
    midY: .125 * startY + .375 * c1y + .375 * c2y + .125 * endY
  };
}

function buildEdgePathBetween(startX, startY, endX, endY) {
  return buildEdgeGeometry(startX, startY, endX, endY).d;
}

function ConfigModal({ modal, onClose, onSave }) {
  const isVariable = modal.kind === "variable";
  const emptyValue = isVariable
    ? { id: nextId("var"), variableType: "session", type: "input", key: "", name: "", valueType: "String", required: true, minValue: 0, maxValue: 100, defaultValue: "", chooseOptions: [{ id: nextId("choice"), value: "" }] }
    : { id: nextId("form"), key: "", variableName: "", description: "", type: "input", required: true, min: 0, max: 100, defaultValue: "", list: [{ id: nextId("option"), value: "" }] };
  const [form, setForm] = useState(() => structuredClone(modal.value || emptyValue));
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const optionKey = isVariable ? "chooseOptions" : "list";
  const setOptions = (fn) => setForm((current) => { const options = structuredClone(current[optionKey] || []); fn(options); return { ...current, [optionKey]: options }; });
  const canSave = isVariable ? /^[A-Za-z][A-Za-z0-9_]*$/.test(form.key) && Boolean(form.name) : Boolean(form.key) && /^[A-Za-z][A-Za-z0-9_]*$/.test(form.variableName);
  return <div className="wf-modal-backdrop" onPointerDown={stop}><div className="wf-modal" role="dialog" aria-modal="true" aria-label={isVariable ? "创建会话变量" : "添加表单"}>
    <header><b>{isVariable ? "创建会话变量" : "添加表单"}</b><button type="button" onClick={onClose}><FlowIcon name="close" /></button></header>
    <div className="wf-modal-main"><aside>{isVariable && <><button type="button" className={form.variableType === "session" ? "is-active" : ""} onClick={() => patch("variableType", "session")}>无交互</button><button type="button" className={form.variableType === "global" ? "is-active" : ""} onClick={() => patch("variableType", "global")}>在开始节点交互</button></>}{(!isVariable || form.variableType === "global") && FORM_TYPES.map((item) => <button type="button" className={form.type === item.value ? "is-active" : ""} key={item.value} onClick={() => patch("type", item.value)}>{item.label}</button>)}</aside>
      <div className="wf-modal-form">
        {isVariable ? <><label><span>变量名<em className="wf-required">*</em></span><input value={form.key} maxLength={50} placeholder="支持字母、数字和下划线，必须以字母开头" onChange={(event) => patch("key", event.target.value)} /></label><label><span>显示名称<em className="wf-required">*</em></span><input value={form.name} maxLength={50} placeholder="用户及工作流绘制页面看到的名称" onChange={(event) => patch("name", event.target.value)} /></label>{form.variableType === "session" && <label><span>数据类型<em className="wf-required">*</em></span><select value={form.valueType} onChange={(event) => patch("valueType", event.target.value)}>{VARIABLE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>}</>
          : <><label><span>标题<em className="wf-required">*</em></span><input value={form.key} placeholder="输入“/”可引用变量" onChange={(event) => patch("key", event.target.value)} /></label><label><span>变量名<em className="wf-required">*</em></span><input value={form.variableName} maxLength={50} placeholder="支持字母、数字和下划线，必须以字母开头" onChange={(event) => patch("variableName", event.target.value)} /></label><label><span>描述</span><textarea value={form.description} maxLength={100} rows={3} onChange={(event) => patch("description", event.target.value)} /></label></>}
        {(isVariable ? form.variableType === "global" : true) && <label className="wf-modal-check"><span>必填</span><input type="checkbox" checked={form.required} onChange={(event) => patch("required", event.target.checked)} /></label>}
        {(form.type === "input" || (isVariable && form.variableType === "session" && form.valueType === "String")) && <label><span>最大长度</span><input type="number" min="0" max="4000" value={isVariable ? form.maxValue : form.max} onChange={(event) => patch(isVariable ? "maxValue" : "max", Number(event.target.value))} /></label>}
        {form.type === "number" && <div className="wf-modal-number-row"><label><span>最小值</span><input type="number" value={isVariable ? form.minValue : form.min} onChange={(event) => patch(isVariable ? "minValue" : "min", Number(event.target.value))} /></label><label><span>最大值</span><input type="number" value={isVariable ? form.maxValue : form.max} onChange={(event) => patch(isVariable ? "maxValue" : "max", Number(event.target.value))} /></label></div>}
        <label><span>默认值</span><input type={form.type === "number" ? "number" : "text"} value={form.defaultValue ?? ""} onChange={(event) => patch("defaultValue", form.type === "number" ? Number(event.target.value) : event.target.value)} /></label>
        {form.type === "select" && <div className="wf-modal-options"><b>选项</b>{(form[optionKey] || []).map((item, index) => <label key={item.id}><span>选项{index + 1}<em className="wf-required">*</em></span><div><input value={item.value} placeholder="输入“/”可引用变量" onChange={(event) => setOptions((options) => { options[index].value = event.target.value; })} />{form[optionKey].length > 1 && <button type="button" onClick={() => setOptions((options) => options.splice(index, 1))}><FlowIcon name="trash" size={14} /></button>}</div></label>)}<TinyButton icon="plus" onClick={() => setOptions((options) => options.push({ id: nextId("option"), value: "" }))}>添加</TinyButton></div>}
        {!canSave && <p className="wf-modal-error">请填写必填项，变量名需以字母开头，仅支持字母、数字和下划线。</p>}
      </div>
    </div>
    <footer><button type="button" onClick={onClose}>取消</button><button type="button" className="is-primary" disabled={!canSave} onClick={() => onSave(form)}>完成</button></footer>
  </div></div>;
}

function WorkflowToolbar({ zoom, setZoom, fitCanvas, minimapOpen, setMinimapOpen, paletteOpen, setPaletteOpen, canUndo, canRedo, undo, redo, historyItems, historyIndex, setHistoryIndex, clearHistory, onOpenPanel, externalPanelOpen, allCollapsed, onToggleFold, onArrange }) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const zoomRates = [2, 1, .75, .5, .25];
  useEffect(() => { if (paletteOpen) { setZoomOpen(false); setHistoryOpen(false); } }, [paletteOpen]);
  useEffect(() => { if (externalPanelOpen) { setZoomOpen(false); setHistoryOpen(false); } }, [externalPanelOpen]);
  return <>
    <div className="workflow-toolbar" onPointerDown={stop}>
      <button type="button" className={minimapOpen ? "checked" : ""} data-tip="小地图" aria-label="小地图" onClick={() => setMinimapOpen((value) => !value)}><SourceIcon name="icon-minimap" /></button>
      <span />
      <button type="button" disabled={zoom <= .1} data-tip="缩小" aria-label="缩小" onClick={() => setZoom((value) => Math.max(.1, Number((value - .1).toFixed(2))))}><SourceIcon name="icon-a-zoomout" /></button>
      <button type="button" className="wf-toolbar-rate" data-tip="缩放比例" aria-label="缩放比例" onClick={() => { onOpenPanel?.(); setZoomOpen((value) => !value); setHistoryOpen(false); setPaletteOpen(false); }}><b>{Math.floor(zoom.toFixed(2) * 100)}%</b></button>
      <button type="button" disabled={zoom >= 2} data-tip="放大" aria-label="放大" onClick={() => setZoom((value) => Math.min(2, Number((value + .1).toFixed(2))))}><SourceIcon name="icon-a-zoomin" /></button>
      <span />
      <button type="button" data-tip={allCollapsed ? "展开全部节点" : "收起全部节点"} aria-label={allCollapsed ? "展开全部节点" : "收起全部节点"} onClick={onToggleFold}><FoldAllGlyph collapsed={allCollapsed} /></button>
      <button type="button" data-tip="一键整理" aria-label="一键整理" onClick={onArrange}><ArrangeGlyph /></button>
      <span />
      <button type="button" disabled={!canUndo} data-tip="撤销" aria-label="撤销" onClick={undo}><SourceIcon name="icon-a-undo5x" /></button>
      <button type="button" disabled={!canRedo} data-tip="重做" aria-label="重做" onClick={redo}><SourceIcon name="icon-a-redo5x" /></button>
      <button type="button" className={historyOpen ? "checked" : ""} data-tip="修改记录" aria-label="修改记录" onClick={() => { onOpenPanel?.(); setHistoryOpen((value) => !value); setZoomOpen(false); setPaletteOpen(false); }}><SourceIcon name="icon-a-changehistory" /></button>
      <span />
      <button type="button" className={`wf-toolbar-add ${paletteOpen ? "is-primary" : ""}`} data-tip="添加节点" aria-label="添加节点" onClick={() => { onOpenPanel?.(); setHistoryOpen(false); setZoomOpen(false); setPaletteOpen((value) => !value); }}><SourceIcon name="icon-add" /> 添加节点</button>
    </div>
    {zoomOpen && <div className="workflow-zoom-menu" onPointerDown={stop}>{zoomRates.map((rate, index) => <button type="button" key={rate} onClick={() => { setZoom(rate); setZoomOpen(false); }}><span>{Math.round(rate * 100)}%</span>{index === 1 && <small><SourceIcon name="icon-shift" /> 1</small>}</button>)}<span /><button type="button" onClick={() => { fitCanvas(); setZoomOpen(false); }}><span>自适应</span><small><SourceIcon name="icon-command" /> 1</small></button></div>}
    {historyOpen && <div className="workflow-history-panel" onPointerDown={stop}><header><b>变更历史</b><span><button type="button" onClick={clearHistory} title="清空历史"><SourceIcon name="icon-clear" /></button><button type="button" onClick={() => setHistoryOpen(false)} title="关闭"><SourceIcon name="icon-close4" /></button></span></header><div>{historyItems.length <= 1 ? <div className="workflow-history-empty"><SourceIcon name="icon-a-changehistory" /><span>尚未更改任何内容</span></div> : historyItems.slice().reverse().map((item, reverseIndex) => { const index = historyItems.length - 1 - reverseIndex; return <button type="button" className={`${index === historyIndex ? "is-current" : ""} ${index > historyIndex ? "is-before" : ""}`} key={`${item.time}-${index}`} onClick={() => setHistoryIndex(index)}><span>{index === 0 ? "无变更状态" : item.title || "工作流已修改"}</span>{index === historyIndex && <em>当前状态</em>}</button>; })}</div><footer>最近30步操作将被记录在变更历史，此历史将在您离开编辑器时自动清除。</footer></div>}
  </>;
}

const EMPTY_VALUE_RELATIONS = new Set(["为空", "不为空", "为TRUE", "为FALSE"]);

function collectWorkflowIssues(nodes, edges) {
  if (nodes.length <= 1) return [];
  const outgoing = new Map();
  edges.forEach(([source, target]) => {
    const list = outgoing.get(source) || [];
    list.push(target);
    outgoing.set(source, list);
  });
  const connected = new Set();
  const queue = nodes.filter((node) => node.type === "start").map((node) => node.id);
  queue.forEach((id) => connected.add(id));
  let cursor = 0;
  while (cursor < queue.length) {
    const id = queue[cursor++];
    (outgoing.get(id) || []).forEach((target) => {
      if (connected.has(target)) return;
      connected.add(target);
      queue.push(target);
    });
  }
  const found = [];
  const push = (node, text) => {
    if (found.some((item) => item.nodeId === node.id && item.text === text)) return;
    found.push({ nodeId: node.id, nodeName: node.name, nodeType: node.type, text });
  };
  nodes.forEach((node) => {
    if (node.type !== "start" && !connected.has(node.id)) push(node, "未与开始节点连接");
    const config = node.config || {};
    if (node.type === "condition") {
      const incomplete = (config.branches || []).some((branch) => (branch.conditions || []).some((condition) => {
        const value = condition.value == null ? "" : String(condition.value);
        return !condition.variable || !condition.relation || (!value && !EMPTY_VALUE_RELATIONS.has(condition.relation));
      }));
      if (incomplete) push(node, "选项不能为空");
    }
    if (node.type === "choice") {
      const options = config.options || [];
      if (!options.length || options.some((item) => !String(item.value ?? "").trim())) push(node, "选项不能为空");
      const seen = new Set();
      const duplicated = options.some((item) => {
        const value = String(item.value ?? "");
        if (!value) return false;
        if (seen.has(value)) return true;
        seen.add(value);
        return false;
      });
      if (duplicated) push(node, "选项不能重复");
    }
    if (node.type === "score" && !(config.fields || []).length) push(node, "表单配置不能为空");
    if (node.type === "model") {
      if (!config.modelClassCode || !config.modelName) push(node, "未选择模型");
      if (!String(config.userPrompt ?? "").trim()) push(node, "用户提示词不能为空");
    }
    if (node.type === "tool") {
      if (!String(config.query ?? config.searchUserInput ?? "").trim()) push(node, "query不能为空");
      const datasets = config.datasets || config.datasetSelectList || [];
      if (!datasets.length) push(node, "选择知识库不能为空");
    }
  });
  return found;
}

function WorkflowCheckPanel({ issues, nodeCount, edgeCount, onClose, onFocus }) {
  return <aside className="workflow-check-panel" onPointerDown={stop}><header><span><b>检查清单</b>{issues.length > 0 && <em>{issues.length > 99 ? "99+" : issues.length}</em>}</span><button type="button" onClick={onClose}><SourceIcon name="icon-close" /></button></header>{issues.length ? <div className="workflow-issue-state"><div className="workflow-issue-tip">存在问题时，不能进行调试、运行预览、上架</div>{issues.map((issue) => <button type="button" key={`${issue.nodeId}-${issue.text}`} onClick={() => onFocus(issue.nodeId)}><span className="wf-issue-node-icon"><NodeTypeIcon type={issue.nodeType} size={16} /></span><span><b>{issue.nodeName}</b><small>{issue.text}</small></span></button>)}</div> : <div className="workflow-check-empty"><span><SourceIcon name="icon-a-correct_fill5x" /></span><b>问题都已解决</b><p>{nodeCount} 个节点、{edgeCount} 条连接均可正常运行</p></div>}</aside>;
}

function ElementSelect({ value, onChange, options, placeholder = "请选择" }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState(null);
  const current = options.find((item) => item.value === value);
  const place = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setBox({ left: rect.left, top: rect.bottom + 4, width: rect.width });
  };
  useEffect(() => {
    if (!open) return undefined;
    place();
    const close = (event) => { if (!rootRef.current?.contains(event.target) && !event.target.closest?.(".el-select-dropdown")) setOpen(false); };
    window.addEventListener("pointerdown", close);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  return <div className={`el-select ${open ? "is-open" : ""} ${current ? "" : "is-placeholder"}`} ref={rootRef}>
    <button type="button" className="el-select__wrapper" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((item) => !item)}>
      <span>{current?.label || placeholder}</span>
      <i className="iconfont icon-a-arrowdown5x" />
    </button>
    {open && box && createPortal(<div className="el-select-dropdown nowheel" role="listbox" style={{ left: box.left, top: box.top, width: box.width }} onPointerDown={stop}>
      {options.map((item) => <button type="button" role="option" aria-selected={item.value === value} key={item.value} className={item.value === value ? "is-selected" : ""} onClick={() => { onChange(item.value); setOpen(false); }}>{item.label}</button>)}
    </div>, rootRef.current?.closest(".workflow-demo") || document.body)}
  </div>;
}

function ChatDebugDetail({ message, nodes, onClose }) {
  const ran = nodes.filter((node) => node.status === "success" || node.debugResult?.status === "success");
  const model = ran.find((node) => node.type === "model");
  const durationMs = Number.isFinite(parseFloat(message.duration)) ? Math.round(parseFloat(message.duration) * 1000) : 0;
  const tokens = model?.debugResult?.modelInfo?.token ?? 0;
  return <section className="workflow-chat-debug">
    <header><b>调试详情</b><button type="button" onClick={onClose} aria-label="关闭调试详情"><SourceIcon name="icon-close" /></button></header>
    <div className="workflow-chat-debug-metrics"><div><span>整体耗时</span><b>{durationMs}<small>ms</small></b></div><i /><div><b>{tokens}</b><span>tokens</span></div></div>
    <div className="workflow-chat-debug-tree"><b>调用树</b>{ran.map((node) => <div key={node.id}><NodeTypeIcon type={node.type} size={16} /><span>{node.name}</span><small>运行成功</small></div>)}</div>
  </section>;
}

function WorkflowPreview({ nodes, messages, variables, isRunning, onSend, onStop, onClear, onRetry, onClose }) {
  const [input, setInput] = useState("");
  const [variablesOpen, setVariablesOpen] = useState(true);
  const [debugMessageId, setDebugMessageId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [variableValues, setVariableValues] = useState(() => Object.fromEntries(variables.map((item) => [item.key, item.defaultValue ?? ""])));
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [variableAttempted, setVariableAttempted] = useState(false);
  const [scoreAttempted, setScoreAttempted] = useState(false);
  const [varsPopover, setVarsPopover] = useState(false);
  const [pendingStep, setPendingStep] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [choiceValue, setChoiceValue] = useState("");
  const [scoreValues, setScoreValues] = useState({});
  const fileRef = useRef(null);
  useEffect(() => {
    if (!varsPopover) return undefined;
    const close = (event) => {
      if (event.target.closest?.(".workflow-preview-session")) return;
      setVarsPopover(false);
    };
    window.addEventListener("pointerdown", close, true);
    return () => window.removeEventListener("pointerdown", close, true);
  }, [varsPopover]);
  const choiceNode = nodes.find((node) => node.type === "choice");
  const scoreNode = nodes.find((node) => node.type === "score");
  const missingRequired = variables.filter((item) => item.required && !String(variableValues[item.key] ?? "").trim());
  const profileReady = missingRequired.length === 0;
  const sendPendingRequest = (extraValues = {}) => { if (!pendingRequest) return; onSend(pendingRequest.text, pendingRequest.attachments, { ...variableValues, ...extraValues }); setPendingRequest(null); setPendingStep(null); setChoiceValue(""); setScoreValues({}); };
  const submit = () => {
    const value = input.trim();
    if (!profileSubmitted || (!value && !attachments.length) || isRunning || pendingStep) return;
    const request = { text: value || "请分析附件", attachments };
    setInput(""); setAttachments([]); setVariablesOpen(false);
    if (Number(variableValues.age || 0) < 60 && choiceNode?.config.options?.length) { setPendingRequest(request); setPendingStep("choice"); return; }
    onSend(request.text, request.attachments, variableValues);
  };
  const chooseWorkflowPath = (value) => {
    setChoiceValue(value);
    setPendingRequest((current) => ({ ...(current || { attachments: [] }), text: value }));
    if (/焦虑|GAD/i.test(value) && scoreNode?.config.fields?.length) { setPendingStep("score"); return; }
    if (!pendingRequest && !value) return;
    onSend(value, pendingRequest?.attachments || [], { ...variableValues, workflowChoice: value });
    setPendingRequest(null); setPendingStep(null); setChoiceValue(""); setScoreValues({});
  };
  const missingScoreFields = (scoreNode?.config.fields || []).filter((field) => field.required && !String(scoreValues[field.variableName] ?? "").trim());
  const submitScore = () => { if (missingScoreFields.length) { setScoreAttempted(true); return; } setScoreAttempted(false); sendPendingRequest({ workflowChoice: choiceValue, ...scoreValues }); };
  const startConversation = () => {
    if (!profileReady) { setVariableAttempted(true); return; }
    setVariableAttempted(false); setProfileSubmitted(true); setVariablesOpen(false); setVarsPopover(false);
    const symptomFilled = String(variableValues.symptom ?? "").trim() !== "";
    const routeToModel = Number(variableValues.age || 0) >= 60 && symptomFilled;
    if (!routeToModel && choiceNode?.config.options?.length) {
      setPendingRequest({ text: "", attachments: [] });
      setPendingStep("choice");
    }
  };
  const startNewChat = () => { onClear(); setInput(""); setAttachments([]); setDebugMessageId(null); setProfileSubmitted(false); setVariableAttempted(false); setScoreAttempted(false); setVarsPopover(false); setVariablesOpen(true); setPendingStep(null); setPendingRequest(null); setChoiceValue(""); setScoreValues({}); };
  const copyText = async (text) => { try { await navigator.clipboard.writeText(text || ""); } catch { /* clipboard can be unavailable in the embedded demo */ } };
  const lastAssistantId = [...messages].reverse().find((item) => item.role === "assistant")?.id;
  return <aside className="workflow-preview-panel" onPointerDown={stop}>
    <header>
      <div className="workflow-preview-heading">
        <b>运行预览</b>
        {profileSubmitted && <div className="workflow-preview-session">
          <button type="button" className={varsPopover ? "is-open" : ""} onClick={() => setVarsPopover((value) => !value)}><SectionMark kind="session" />会话变量</button>
          {varsPopover && <div className="workflow-preview-session-pop">{variables.length ? variables.map((item) => <div key={item.key}><span>{item.name || item.label}</span><b>{variableValues[item.key] || "未填写"}</b></div>) : <div><span>暂无会话变量</span></div>}</div>}
        </div>}
      </div>
      <button type="button" className="wf-preview-close" onClick={onClose} aria-label="关闭运行预览"><SourceIcon name="icon-close4" /></button>
    </header>
    {variablesOpen && <div className="workflow-preview-variable-stage"><div className="workflow-preview-variables"><span className="workflow-preview-workflow-icon"><NodeTypeIcon type="score" size={56} /></span><b className="workflow-preview-workflow-name">健康评估量表</b><div className="workflow-preview-variable-form">{variables.map((item) => <label key={item.id || item.key}><span className={item.required ? "is-required" : ""}>{item.name || item.label}</span>{item.type === "select" ? <ElementSelect value={variableValues[item.key] ?? ""} options={(item.chooseOptions || []).map((option) => ({ value: option.value, label: option.value }))} onChange={(next) => { setProfileSubmitted(false); setVariableValues((current) => ({ ...current, [item.key]: next })); }} /> : <input className="el-input" inputMode={item.type === "number" ? "decimal" : "text"} value={variableValues[item.key] ?? ""} placeholder="请输入" onChange={(event) => { setProfileSubmitted(false); setVariableValues((current) => ({ ...current, [item.key]: event.target.value })); }} />}</label>)}{!variables.length && <p>当前流程没有自定义会话变量</p>}</div>{variableAttempted && missingRequired.length > 0 && <p className="workflow-preview-required">请填写：{missingRequired.map((item) => item.name || item.label).join("、")}</p>}<button type="button" className="workflow-preview-start" onClick={startConversation}>开始对话</button></div></div>}
    <div className="workflow-preview-content">
      {pendingStep === "choice" && choiceNode && <div className="workflow-result workflow-preview-hitl"><span><NodeTypeIcon type="score" size={28} /></span><div><div className="robot-answer-content is-stretch"><p>{choiceNode.config.description}</p><div className="form-divider" /><div className="questiom-group">{choiceNode.config.options.map((option) => <button type="button" className="interactiveBtn" key={option.key || option.value} onClick={() => chooseWorkflowPath(option.value)}>{option.value}</button>)}</div></div></div></div>}
      {pendingStep === "score" && scoreNode && <div className="workflow-result workflow-preview-hitl"><span><NodeTypeIcon type="score" size={28} /></span><div><div className="robot-answer-content is-stretch"><p>{scoreNode.config.description}</p><div className="form-divider" />{scoreNode.config.fields.map((field) => <div className="questiom-group" key={field.id || field.variableName}><div className={`form-question${field.required ? " required" : ""}`}>{field.key}</div>{field.description && <div className="form-tip">{field.description}</div>}{field.type === "select" ? <ElementSelect value={scoreValues[field.variableName] ?? ""} options={(field.list || []).map((option) => ({ value: option.value, label: option.value }))} onChange={(next) => setScoreValues((current) => ({ ...current, [field.variableName]: next }))} /> : <input className="el-input" value={scoreValues[field.variableName] ?? ""} placeholder={field.defaultValue || "请输入"} onChange={(event) => setScoreValues((current) => ({ ...current, [field.variableName]: event.target.value }))} />}</div>)}{scoreAttempted && missingScoreFields.length > 0 && <p className="workflow-preview-score-required">请完成所有必填题目</p>}<div className="question-btn"><button type="button" onClick={submitScore}>提交</button></div></div></div></div>}
      {!messages.length && !isRunning && profileSubmitted && !pendingStep && <div className="workflow-preview-empty"><span><NodeTypeIcon type="score" size={56} /></span><b>健康评估量表</b></div>}
      {messages.map((message) => message.role === "user" ? <div className="workflow-preview-user-wrap" key={message.id}><span className="workflow-preview-user-avatar">K</span><div><span className="workflow-preview-user">{message.text}</span>{message.attachments?.length > 0 && <small>{message.attachments.map((file) => file.name).join("、")}</small>}</div></div> : <div className="workflow-result" key={message.id}><span><NodeTypeIcon type="score" size={28} /></span><div><div className="robot-answer-content"><p>{message.text}</p></div><div className="robot-answer-operate"><div className="robot-answer-operate-icons"><button type="button" title="复制" onClick={() => copyText(message.text)}><SourceIcon name="icon-copy" /></button>{message.id === lastAssistantId && <button type="button" title="重新生成" onClick={onRetry}><SourceIcon name="icon-a-reset5x" /></button>}<span className="icon-divider" /><button type="button" title="调试" className={debugMessageId === message.id ? "is-active" : ""} onClick={() => setDebugMessageId((current) => current === message.id ? null : message.id)}><SourceIcon name="icon-tool" /></button></div></div>{debugMessageId === message.id && <ChatDebugDetail message={message} nodes={nodes} onClose={() => setDebugMessageId(null)} />}</div></div>)}
      {isRunning && <div className="workflow-processing"><i /><span>正在执行工作流…</span></div>}
    </div>
    {profileSubmitted && <footer>{messages.length > 0 && <button type="button" className="workflow-preview-new-chat" onClick={startNewChat}><SourceIcon name="icon-newchat" /> 新会话</button>}<input ref={fileRef} className="wf-file-input" type="file" multiple onChange={(event) => setAttachments(Array.from(event.target.files || []))} />{!pendingStep && attachments.length > 0 && <div className="workflow-attachments">{attachments.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}</span>)}</div>}{pendingStep ? <div className="workflow-preview-waiting-tip"><SourceIcon name="icon-information_fill" /> 请先完成当前节点交互，工作流会自动继续</div> : <div className="workflow-input-box"><textarea rows="3" value={input} placeholder="请输入你的问题" onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} /><div><button type="button" onClick={() => fileRef.current?.click()} title="添加附件"><SourceIcon name="icon-document" /></button><span />{isRunning ? <button type="button" className="wf-preview-send is-stop" onClick={onStop} title="停止生成"><i /></button> : <button type="button" className="wf-preview-send" disabled={!input.trim() && !attachments.length} onClick={submit} title="发送"><SourceIcon name="icon-send" /></button>}</div></div>}<small className="workflow-ai-notice">AI生成，仅供参考。</small></footer>}
  </aside>;
}

export default function WorkflowDemo({ onClose }) {
  const initialNodesRef = useRef(createInitialNodes());
  const viewportRef = useRef(null), rafRef = useRef(0), pendingMoveRef = useRef(null), runTimersRef = useRef([]), saveTimerRef = useRef(0), toastTimerRef = useRef(0), panDragRef = useRef(null), minimapDragRef = useRef(null), connectionSourceRef = useRef(null), copiedNodeRef = useRef(null), newNodeIndex = useRef(1), nodeHeightsRef = useRef({}), userAdjustedViewRef = useRef(false), fittedContentRef = useRef(false);
  const [nodes, setNodes] = useState(() => structuredClone(initialNodesRef.current));
  const [edges, setEdges] = useState(() => structuredClone(INITIAL_EDGES));
  const nodesRef = useRef(nodes), edgesRef = useRef(edges), workflowNameRef = useRef("健康评估量表"), messagesRef = useRef([]);
  const firstHistory = useMemo(() => ({ title: "工作流已打开", time: "刚刚", nodes: structuredClone(initialNodesRef.current), edges: structuredClone(INITIAL_EDGES), workflowName: "健康评估量表" }), []);
  const historyRef = useRef([firstHistory]), historyIndexRef = useRef(0);
  const [historyItems, setHistoryItems] = useState([firstHistory]); const [historyIndex, setHistoryIndexState] = useState(0);
  const [selectedId, setSelectedId] = useState(null); const [workflowName, setWorkflowName] = useState("健康评估量表"); const [editingWorkflowName, setEditingWorkflowName] = useState(false); const [workflowNameDraft, setWorkflowNameDraft] = useState("健康评估量表"); const [published, setPublished] = useState(true); const [publishOpen, setPublishOpen] = useState(false);
  const [zoom, setZoom] = useState(.6); const [pan, setPan] = useState({ x: 20, y: 20 }); const [connectionDraft, setConnectionDraft] = useState(null); const [hoverEdgeId, setHoverEdgeId] = useState(null); const edgeHoverTimerRef = useRef(0); const [isExpanded] = useState(true); const [minimapOpen, setMinimapOpen] = useState(true); const [paletteOpen, setPaletteOpen] = useState(false); const [allCollapsed, setAllCollapsed] = useState(false); const [foldCommand, setFoldCommand] = useState(null); const [checkOpen, setCheckOpen] = useState(false); const [previewOpen, setPreviewOpen] = useState(false); const [isRunning, setIsRunning] = useState(false); const [runComplete, setRunComplete] = useState(false); const [messages, setMessages] = useState([]); const [saveLabel, setSaveLabel] = useState("自动保存于 刚刚"); const [toast, setToast] = useState(""); const [modal, setModal] = useState(null); const [debugModal, setDebugModal] = useState(null); const [nodeHeights, setNodeHeights] = useState({}); const [nodePorts, setNodePorts] = useState({});
  const setNodesLive = useCallback((updater) => { const next = typeof updater === "function" ? updater(nodesRef.current) : updater; nodesRef.current = next; setNodes(next); return next; }, []);
  const setEdgesLive = useCallback((updater) => { const next = typeof updater === "function" ? updater(edgesRef.current) : updater; edgesRef.current = next; setEdges(next); return next; }, []);
  const recordHistory = useCallback((title, nextNodes = nodesRef.current, nextEdges = edgesRef.current, nextName = workflowNameRef.current) => {
    const entry = { title, time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }), nodes: structuredClone(nextNodes), edges: structuredClone(nextEdges), workflowName: nextName };
    let nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1); nextHistory.push(entry); if (nextHistory.length > 30) nextHistory = nextHistory.slice(-30);
    historyRef.current = nextHistory; historyIndexRef.current = nextHistory.length - 1; setHistoryItems(nextHistory); setHistoryIndexState(historyIndexRef.current);
  }, []);
  const markSaving = useCallback((title = "节点配置已修改") => { setSaveLabel("保存中…"); clearTimeout(saveTimerRef.current); saveTimerRef.current = window.setTimeout(() => { recordHistory(title); setSaveLabel("自动保存于 刚刚"); }, 620); }, [recordHistory]);
  const restoreHistory = useCallback((index) => { const entry = historyRef.current[index]; if (!entry) return; clearTimeout(saveTimerRef.current); const restoredNodes = structuredClone(entry.nodes), restoredEdges = structuredClone(entry.edges); nodesRef.current = restoredNodes; edgesRef.current = restoredEdges; workflowNameRef.current = entry.workflowName; setNodes(restoredNodes); setEdges(restoredEdges); setWorkflowName(entry.workflowName); setWorkflowNameDraft(entry.workflowName); historyIndexRef.current = index; setHistoryIndexState(index); setSelectedId(null); setPreviewOpen(false); setSaveLabel("已恢复历史版本"); }, []);
  const undo = useCallback(() => { if (historyIndexRef.current > 0) restoreHistory(historyIndexRef.current - 1); }, [restoreHistory]);
  const redo = useCallback(() => { if (historyIndexRef.current < historyRef.current.length - 1) restoreHistory(historyIndexRef.current + 1); }, [restoreHistory]);
  const clearHistory = useCallback(() => { const current = historyRef.current[historyIndexRef.current]; historyRef.current = [current]; historyIndexRef.current = 0; setHistoryItems([current]); setHistoryIndexState(0); }, []);
  const zoomTo = useCallback((targetZoom) => {
    userAdjustedViewRef.current = true;
    setZoom((currentZoom) => {
      const rawZoom = typeof targetZoom === "function" ? targetZoom(currentZoom) : targetZoom;
      const nextZoom = Math.min(2, Math.max(.1, Number(rawZoom.toFixed(2))));
      if (Math.abs(nextZoom - currentZoom) < .001) return currentZoom;
      const viewport = viewportRef.current;
      if (viewport) {
        const centerX = viewport.clientWidth / 2;
        const centerY = viewport.clientHeight / 2;
        setPan((currentPan) => ({
          x: centerX - ((centerX - currentPan.x) / currentZoom) * nextZoom,
          y: centerY - ((centerY - currentPan.y) / currentZoom) * nextZoom
        }));
      }
      return nextZoom;
    });
  }, []);
  const centerCanvas = useCallback((zoomValue) => {
    const viewport = viewportRef.current;
    const items = nodesRef.current;
    if (!viewport || !items.length || viewport.clientWidth < 20) return false;
    const heights = nodeHeightsRef.current;
    const minX = Math.min(...items.map((node) => node.x));
    const minY = Math.min(...items.map((node) => node.y)) - 64;
    const maxX = Math.max(...items.map((node) => node.x + NODE_WIDTH));
    const maxY = Math.max(...items.map((node) => node.y + (heights[node.id] || node.height || 420)));
    const boundsW = Math.max(1, maxX - minX);
    const boundsH = Math.max(1, maxY - minY);
    setZoom(zoomValue);
    setPan({ x: (viewport.clientWidth - boundsW * zoomValue) / 2 - minX * zoomValue, y: (viewport.clientHeight - boundsH * zoomValue) / 2 - minY * zoomValue });
    return true;
  }, []);
  const fitCanvas = useCallback(() => {
    const viewport = viewportRef.current;
    const items = nodesRef.current;
    if (!viewport || !items.length) return;
    const heights = nodeHeightsRef.current;
    const minX = Math.min(...items.map((node) => node.x));
    const minY = Math.min(...items.map((node) => node.y)) - 64;
    const maxX = Math.max(...items.map((node) => node.x + NODE_WIDTH));
    const maxY = Math.max(...items.map((node) => node.y + (heights[node.id] || node.height || 420)));
    const boundsW = Math.max(1, maxX - minX);
    const boundsH = Math.max(1, maxY - minY);
    const fittedZoom = Math.min(1, Math.max(.2, Math.min((viewport.clientWidth - 80) / boundsW, (viewport.clientHeight - 120) / boundsH)));
    centerCanvas(Number(fittedZoom.toFixed(2)));
  }, [centerCanvas]);
  useEffect(() => {
    nodeHeightsRef.current = nodeHeights;
    if (fittedContentRef.current || userAdjustedViewRef.current) return;
    if (Object.keys(nodeHeights).length < nodes.length) return;
    if (centerCanvas(0.6)) fittedContentRef.current = true;
  }, [centerCanvas, nodeHeights, nodes.length]);
  useEffect(() => { if (viewportRef.current) { viewportRef.current.scrollTop = 0; viewportRef.current.scrollLeft = 0; } }, [isExpanded]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const onWheel = (event) => {
      if (event.target.closest?.(".nowheel, .workflow-preview-panel, .workflow-history-panel, .workflow-palette, .wf-add-popover, .wf-modal, .wf-debug-modal")) return;
      event.preventDefault();
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      if (event.deltaMode === 2) delta *= viewport.clientHeight;
      const intensity = event.ctrlKey ? .006 : .0011;
      zoomTo((value) => value * Math.exp(-delta * intensity));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoomTo]);
  const startConnection = useCallback((nodeId, handleType, event, explicitEdge) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    let sourceId = nodeId;
    let replacing = null;
    if (explicitEdge) {
      replacing = explicitEdge;
      sourceId = explicitEdge[0];
    } else if (handleType === "target") {
      replacing = edgesRef.current.find(([, targetId]) => targetId === nodeId) || null;
      if (!replacing) return;
      sourceId = replacing[0];
    } else {
      const outgoing = edgesRef.current.filter(([from]) => from === nodeId);
      if (outgoing.length === 1) replacing = outgoing[0];
    }
    const source = nodesRef.current.find((node) => node.id === sourceId);
    if (!source) return;
    const sourceHeight = nodeHeights[sourceId] || source.height || 300;
    const sourcePoint = nodePorts[sourceId]?.output || { x: source.x + source.width, y: source.y + sourceHeight / 2 };
    connectionSourceRef.current = { sourceId, replacing };
    setConnectionDraft({ sourceId, x: sourcePoint.x, y: sourcePoint.y });
  }, [nodeHeights, nodePorts]);
  useEffect(() => {
    if (!connectionDraft) return undefined;
    const pointFromEvent = (event) => {
      const viewport = viewportRef.current;
      if (!viewport) return null;
      const rect = viewport.getBoundingClientRect();
      return { x: (event.clientX - rect.left - pan.x) / zoom, y: (event.clientY - rect.top - pan.y) / zoom };
    };
    const onPointerMove = (event) => {
      const point = pointFromEvent(event);
      if (point) setConnectionDraft((current) => current ? { ...current, ...point } : null);
    };
    const onPointerUp = (event) => {
      const current = connectionSourceRef.current;
      if (!current) return;
      const targets = [...document.querySelectorAll(".wf-node-port-in")]
        .map((port) => {
          const rect = port.getBoundingClientRect();
          const targetId = port.closest("[data-node-id]")?.getAttribute("data-node-id");
          return { targetId, distance: Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2)) };
        })
        .filter((item) => item.targetId && item.targetId !== current.sourceId && item.distance <= 50)
        .sort((a, b) => a.distance - b.distance);
      const targetId = targets[0]?.targetId;
      if (targetId) {
        const nextEdges = setEdgesLive((existing) => {
          let next = current.replacing ? existing.filter(([source, target]) => source !== current.replacing[0] || target !== current.replacing[1]) : [...existing];
          if (!next.some(([source, target]) => source === current.sourceId && target === targetId)) next.push([current.sourceId, targetId]);
          return next;
        });
        recordHistory(current.replacing ? "连接已更新" : "连接已创建", nodesRef.current, nextEdges);
      } else if (current.replacing) {
        const nextEdges = setEdgesLive((existing) => existing.filter(([source, target]) => source !== current.replacing[0] || target !== current.replacing[1]));
        recordHistory("连接已断开", nodesRef.current, nextEdges);
      }
      connectionSourceRef.current = null;
      setConnectionDraft(null);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { once: true });
    window.addEventListener("pointercancel", onPointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [connectionDraft, pan.x, pan.y, recordHistory, setEdgesLive, zoom]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isExpanded) document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      const typing = Boolean(event.target?.closest?.("input, textarea, select, [contenteditable='true']"));
      const meta = event.metaKey || event.ctrlKey;
      const code = event.code;
      if (meta && ["Minus", "Equal", "NumpadSubtract", "NumpadAdd", "Digit1"].includes(code)) event.preventDefault();
      if (event.key === "Escape") {
        if (modal) { setModal(null); return; }
        if (debugModal) { setDebugModal(null); return; }
        if (paletteOpen || publishOpen || checkOpen || previewOpen) { setPaletteOpen(false); setPublishOpen(false); setCheckOpen(false); setPreviewOpen(false); return; }
        onClose();
        return;
      }
      if (meta && (code === "Minus" || code === "NumpadSubtract")) { event.preventDefault(); zoomTo((value) => value - .1); return; }
      if (meta && (code === "Equal" || code === "NumpadAdd")) { event.preventDefault(); zoomTo((value) => value + .1); return; }
      if (meta && code === "Digit1" && !event.shiftKey) { event.preventDefault(); fitCanvas(); return; }
      if (!meta && event.shiftKey && code === "Digit1") { event.preventDefault(); zoomTo(1); return; }
      if (typing) return;
      if (meta && code === "KeyZ") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (meta && code === "KeyY") { event.preventDefault(); redo(); return; }
      if (meta && code === "KeyC" && selectedId) {
        event.preventDefault();
        const source = nodesRef.current.find((node) => node.id === selectedId);
        if (source) copiedNodeRef.current = structuredClone(source);
        return;
      }
      if (meta && code === "KeyV" && copiedNodeRef.current) {
        event.preventDefault();
        const source = copiedNodeRef.current;
        const copy = { ...structuredClone(source), id: `copy-${newNodeIndex.current++}`, name: `${source.name} 副本`, x: source.x + NODE_WIDTH + 80, y: source.y, width: NODE_WIDTH, status: "idle", debugResult: null };
        copiedNodeRef.current = structuredClone(copy);
        const next = setNodesLive((current) => [...current, copy]);
        setSelectedId(copy.id);
        recordHistory("节点已粘贴", next);
        return;
      }
      if ((code === "Delete" || code === "Backspace") && selectedId) {
        const node = nodesRef.current.find((item) => item.id === selectedId);
        if (!node || node.type === "start") return;
        event.preventDefault();
        const nextNodes = setNodesLive((current) => current.filter((item) => item.id !== selectedId));
        const nextEdges = setEdgesLive((current) => current.filter(([from, to]) => from !== selectedId && to !== selectedId));
        setSelectedId(null);
        recordHistory("节点已删除", nextNodes, nextEdges);
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown, { capture: true }); };
  }, [checkOpen, debugModal, fitCanvas, isExpanded, modal, onClose, paletteOpen, previewOpen, publishOpen, recordHistory, redo, selectedId, setEdgesLive, setNodesLive, undo, zoomTo]);
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); runTimersRef.current.forEach(clearTimeout); clearTimeout(saveTimerRef.current); clearTimeout(toastTimerRef.current); }, []);
  const queueNodeMove = useCallback((id, x, y) => { pendingMoveRef.current = { id, x, y }; if (rafRef.current) return; rafRef.current = requestAnimationFrame(() => { const move = pendingMoveRef.current; if (move) setNodesLive((current) => current.map((node) => node.id === move.id ? { ...node, x: move.x, y: move.y } : node)); pendingMoveRef.current = null; rafRef.current = 0; }); }, [setNodesLive]);
  const minimapBounds = useMemo(() => {
    const viewport = viewportRef.current;
    const viewLeft = -pan.x / zoom, viewTop = -pan.y / zoom;
    const viewRight = viewLeft + (viewport?.clientWidth || 800) / zoom, viewBottom = viewTop + (viewport?.clientHeight || 500) / zoom;
    const minX = Math.min(viewLeft, ...nodes.map((node) => node.x)) - 80;
    const minY = Math.min(viewTop, ...nodes.map((node) => node.y)) - 80;
    const maxX = Math.max(viewRight, ...nodes.map((node) => node.x + node.width)) + 80;
    const maxY = Math.max(viewBottom, ...nodes.map((node) => node.y + (nodeHeights[node.id] || node.height || 300))) + 80;
    return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }, [nodeHeights, nodes, pan.x, pan.y, zoom]);
  const showEdgeHover = (id) => { clearTimeout(edgeHoverTimerRef.current); setHoverEdgeId(id); };
  const hideEdgeHover = () => { clearTimeout(edgeHoverTimerRef.current); edgeHoverTimerRef.current = window.setTimeout(() => setHoverEdgeId(null), 140); };
  const deleteEdge = (source, target) => {
    const nextEdges = setEdgesLive((current) => current.filter(([from, to]) => !(from === source && to === target)));
    setHoverEdgeId(null);
    recordHistory("连接已删除", nodesRef.current, nextEdges);
  };
  const handlePanStart = (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".workflow-edges, .wf-edge-delete")) return;
    const onBlank = event.target === event.currentTarget || Boolean(event.target.closest(".workflow-world") && !event.target.closest("article, button, input, textarea, select, .wf-node-debug-dialog, .wf-debug-modal"));
    if (onBlank) { setPaletteOpen(false); setSelectedId(null); }
    if (event.target.closest("button, article, input, textarea, select, .workflow-palette, .workflow-toolbar, .workflow-preview-panel, .el-select, .el-select-dropdown, .wf-modal, .wf-debug-modal")) return;
    panDragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }; event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePanMove = (event) => { if (panDragRef.current) { userAdjustedViewRef.current = true; setPan({ x: panDragRef.current.panX + event.clientX - panDragRef.current.x, y: panDragRef.current.panY + event.clientY - panDragRef.current.y }); } };
  const panFromMinimap = useCallback((event, minimap) => {
    const viewport = viewportRef.current;
    if (!viewport || !minimap) return;
    const rect = minimap.getBoundingClientRect();
    const worldX = minimapBounds.minX + Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * minimapBounds.width;
    const worldY = minimapBounds.minY + Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) * minimapBounds.height;
    setPan({ x: viewport.clientWidth / 2 - worldX * zoom, y: viewport.clientHeight / 2 - worldY * zoom });
  }, [minimapBounds, zoom]);
  const handleMinimapPointerDown = (event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); minimapDragRef.current = event.currentTarget; event.currentTarget.setPointerCapture(event.pointerId); panFromMinimap(event, event.currentTarget); };
  const handleMinimapPointerMove = (event) => { if (minimapDragRef.current) panFromMinimap(event, minimapDragRef.current); };
  const handleMinimapPointerUp = (event) => { minimapDragRef.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId); };
  const edgePaths = useMemo(() => edges.map(([fromId, toId]) => { const fromNode = nodes.find((node) => node.id === fromId), toNode = nodes.find((node) => node.id === toId); if (!fromNode || !toNode) return null; const fromHeight = nodeHeights[fromId] || fromNode.height || 300, toHeight = nodeHeights[toId] || toNode.height || 300; const from = nodePorts[fromId]?.output || { x: fromNode.x + fromNode.width, y: fromNode.y + fromHeight / 2 }, to = nodePorts[toId]?.input || { x: toNode.x, y: toNode.y + toHeight / 2 }; const running = toNode.status === "running"; const done = fromNode.status === "success" && toNode.status === "success"; const geometry = buildEdgeGeometry(from.x, from.y, to.x, to.y); return { id: `${fromId}-${toId}`, source: fromId, target: toId, d: geometry.d, midX: geometry.midX, midY: geometry.midY, highlighted: selectedId === fromId || selectedId === toId, tone: running ? "is-running" : done ? "is-done" : "" }; }).filter(Boolean), [edges, nodeHeights, nodePorts, nodes, selectedId]);
  const liftedEdge = connectionDraft ? connectionSourceRef.current?.replacing : null;
  const visibleEdgePaths = edgePaths.filter((edge) => !liftedEdge || edge.source !== liftedEdge[0] || edge.target !== liftedEdge[1]);
  const connectionPreviewPath = useMemo(() => {
    if (!connectionDraft) return null;
    const source = nodes.find((node) => node.id === connectionDraft.sourceId);
    if (!source) return null;
    const sourceHeight = nodeHeights[source.id] || source.height || 300;
    const sourcePoint = nodePorts[source.id]?.output || { x: source.x + source.width, y: source.y + sourceHeight / 2 };
    return buildEdgePathBetween(sourcePoint.x, sourcePoint.y, connectionDraft.x, connectionDraft.y);
  }, [connectionDraft, nodeHeights, nodePorts, nodes]);
  const measureNode = useCallback((id, measurement) => {
    setNodeHeights((current) => Math.abs((current[id] || 0) - measurement.height) < 1 ? current : { ...current, [id]: measurement.height });
    setNodePorts((current) => {
      const previous = current[id];
      if (previous && Math.abs(previous.input?.x - measurement.input?.x) < .1 && Math.abs(previous.input?.y - measurement.input?.y) < .1 && Math.abs(previous.output?.x - measurement.output?.x) < .1 && Math.abs(previous.output?.y - measurement.output?.y) < .1) return current;
      return { ...current, [id]: { input: measurement.input, output: measurement.output } };
    });
  }, []);
  const startVariables = useMemo(() => nodes.find((node) => node.type === "start")?.config.variables || [], [nodes]);
  const allVariables = useMemo(() => [...SYSTEM_VARIABLES.map((item) => ({ ...item, parent: "sys" })), ...startVariables.map((item) => ({ label: item.name, key: item.key, valueType: item.valueType, parent: item.variableType }))], [startVariables]);
  const issues = useMemo(() => collectWorkflowIssues(nodes, edges), [edges, nodes]);
  const updateConfig = useCallback((id, config) => { setNodesLive((current) => current.map((node) => node.id === id ? { ...node, config } : node)); markSaving("节点配置已修改"); }, [markSaving, setNodesLive]);
  const clearRunTimers = useCallback(() => { runTimersRef.current.forEach(clearTimeout); runTimersRef.current = []; }, []);
  const setMessagesLive = useCallback((updater) => { const next = typeof updater === "function" ? updater(messagesRef.current) : updater; messagesRef.current = next; setMessages(next); return next; }, []);
  const showToast = useCallback((message) => { setToast(message); clearTimeout(toastTimerRef.current); toastTimerRef.current = window.setTimeout(() => setToast(""), 1800); }, []);
  const rejectInvalidWorkflow = useCallback((message) => {
    const currentIssues = collectWorkflowIssues(nodesRef.current, edgesRef.current);
    if (!currentIssues.length) return false;
    setPreviewOpen(false);
    setPublishOpen(false);
    setPaletteOpen(false);
    setCheckOpen(true);
    const first = currentIssues[0];
    const node = nodesRef.current.find((item) => item.id === first.nodeId);
    const viewport = viewportRef.current;
    if (node && viewport) {
      setSelectedId(node.id);
      setPan({ x: viewport.clientWidth / 2 - (node.x + node.width / 2) * zoom, y: viewport.clientHeight / 2 - (node.y + Math.min(nodeHeightsRef.current[node.id] || node.height || 300, 500) / 2) * zoom });
    }
    if (message) showToast(message);
    return true;
  }, [showToast, zoom]);
  const openRunPreview = useCallback(() => {
    setPublishOpen(false);
    setPaletteOpen(false);
    if (rejectInvalidWorkflow()) return;
    setCheckOpen(false);
    setPreviewOpen(true);
  }, [rejectInvalidWorkflow]);
  const runWorkflow = useCallback((text = "请运行当前工作流", attachments = [], values = {}) => {
    if (rejectInvalidWorkflow()) return;
    clearRunTimers(); setPreviewOpen(true); setCheckOpen(false); setRunComplete(false); setIsRunning(true);
    const startNode = nodesRef.current.find((node) => node.type === "start");
    const defaults = Object.fromEntries((startNode?.config.variables || []).map((item) => [item.key, item.defaultValue ?? ""]));
    const runtimeValues = { ...defaults, ...values, symptom: text || values.symptom || defaults.symptom || "" };
    const age = Number(runtimeValues.age || 0), description = `${runtimeValues.symptom || ""} ${text}`;
    const profile = `${runtimeValues.gender || "未填写性别"}，${runtimeValues.chronicHistory || "未填写慢性病史"}`;
    const evaluateCondition = (condition) => {
      const left = runtimeValues[condition.variable];
      const right = condition.enterType === 2 ? runtimeValues[condition.value] : condition.value;
      const relation = condition.relation;
      if (relation === "不为空") return left !== undefined && left !== null && String(left).trim() !== "";
      if (relation === "为空") return left === undefined || left === null || String(left).trim() === "";
      if (["=", "等于"].includes(relation)) return String(left) === String(right);
      if (["≠", "不等于"].includes(relation)) return String(left) !== String(right);
      if (relation === "包含") return String(left).includes(String(right));
      if (relation === "不包含") return !String(left).includes(String(right));
      if (relation === "≥") return Number(left) >= Number(right);
      if (relation === "≤") return Number(left) <= Number(right);
      if (relation === "＞") return Number(left) > Number(right);
      if (relation === "＜") return Number(left) < Number(right);
      return false;
    };
    const conditionNode = nodesRef.current.find((node) => node.type === "condition");
    const matchedBranch = conditionNode?.config.branches?.some((branch) => {
      const results = (branch.conditions || []).map(evaluateCondition);
      return branch.logic === "OR" ? results.some(Boolean) : results.every(Boolean);
    }) || false;
    const directCare = matchedBranch;
    const urgent = directCare && /胸痛|呼吸困难|晕厥|持续高热/.test(description);
    const assessment = runtimeValues.workflowChoice || (/失眠|睡眠|入睡|早醒/.test(description) ? "睡眠质量评估" : "焦虑自评 GAD-7");
    const nodeById = new Map(nodesRef.current.map((node) => [node.id, node]));
    const outgoing = (id) => edgesRef.current.filter(([source]) => source === id).map(([, target]) => nodeById.get(target)).filter(Boolean);
    const order = [];
    const visited = new Set();
    let current = startNode;
    while (current && !visited.has(current.id) && order.length <= nodesRef.current.length) {
      visited.add(current.id); order.push(current.id);
      const candidates = outgoing(current.id).filter((node) => !visited.has(node.id));
      if (current.type === "condition") current = candidates.find((node) => node.type === (matchedBranch ? "model" : "choice")) || candidates[0];
      else if (current.type === "choice") current = candidates.find((node) => node.type === (assessment === "焦虑自评 GAD-7" ? "score" : "model")) || candidates[0];
      else current = candidates[0];
    }
    const validOrder = order.filter((id) => nodeById.has(id));
    const visualOrder = validOrder.filter((id) => nodeById.get(id)?.type !== "start");
    setMessagesLive((current) => [...current, { id: nextId("message"), role: "user", text, attachments, runtimeValues }]);
    setNodesLive((currentNodes) => currentNodes.map((node) => ({ ...node, status: "idle", debugResult: null })));
    visualOrder.forEach((id, index) => runTimersRef.current.push(window.setTimeout(() => setNodesLive((currentNodes) => currentNodes.map((node) => {
      const currentIndex = visualOrder.indexOf(node.id);
      if (currentIndex >= 0 && currentIndex < index) return { ...node, status: "success", debugResult: buildDebugResult(node, { text, runtimeValues, duration: `${((currentIndex + 1) * .42).toFixed(2)}s` }) };
      return node.id === id ? { ...node, status: "running", debugResult: { status: "running", showResult: false } } : node;
    })), index * 420)));
    runTimersRef.current.push(window.setTimeout(() => {
      const person = runtimeValues.userName || "来访者";
      const resultText = urgent
        ? `${person}（${age}岁，${profile}），结合你描述的症状，流程命中了高风险条件分支。建议尽快线下就医或联系急救，由专业医护人员进一步评估。`
        : directCare
          ? `${person}（${age}岁，${profile}），条件分支识别到你已满 60 岁且提交了症状描述，工作流已跳过自助量表并进入健康建议模型。建议记录症状出现时间和频率；如症状持续或加重，请及时就医。`
          : `${person}（${age}岁，${profile}），流程已根据“${assessment}”路径完成评估。当前描述更需要关注${assessment === "睡眠质量评估" ? "入睡困难、夜间觉醒和白天精力" : "紧张、担忧和情绪持续时间"}，建议继续完成量表题目并记录近两周变化；结果仅作健康管理参考。`;
      setNodesLive((currentNodes) => currentNodes.map((node) => visualOrder.includes(node.id) ? { ...node, status: "success", debugResult: buildDebugResult(node, { text, runtimeValues, duration: `${((visualOrder.indexOf(node.id) + 1) * .42).toFixed(2)}s`, answer: node.type === "model" ? resultText : "" }) } : { ...node, status: "idle", debugResult: null })); setIsRunning(false); setRunComplete(true);
      setMessagesLive((currentMessages) => [...currentMessages, { id: nextId("message"), role: "assistant", title: urgent ? "建议尽快就医评估" : directCare ? "健康建议已生成" : `${assessment}已完成`, text: resultText, nodeCount: visualOrder.length, duration: `${(visualOrder.length * .42 + .3).toFixed(1)}s` }]);
    }, visualOrder.length * 420 + 300));
  }, [clearRunTimers, rejectInvalidWorkflow, setMessagesLive, setNodesLive]);
  const stopWorkflow = useCallback(() => { clearRunTimers(); setIsRunning(false); setNodesLive((current) => current.map((node) => node.status === "running" ? { ...node, status: "idle", debugResult: null } : node)); setMessagesLive((current) => [...current, { id: nextId("message"), role: "assistant", title: "运行已停止", text: "本次生成已由用户停止，可修改配置后重新运行。", nodeCount: nodesRef.current.filter((node) => node.status === "success").length, duration: "已停止" }]); }, [clearRunTimers, setMessagesLive, setNodesLive]);
  const retryWorkflow = useCallback(() => { const lastUser = messagesRef.current.slice().reverse().find((item) => item.role === "user"); if (lastUser && !isRunning) runWorkflow(lastUser.text, lastUser.attachments || [], lastUser.runtimeValues || {}); }, [isRunning, runWorkflow]);
  const addNode = useCallback((type) => { const id = `added-${newNodeIndex.current++}`, source = createInitialNodes().find((node) => node.type === type) || { type: "tool", name: "医学知识检索", width: NODE_WIDTH, height: 360, config: {} }; const currentNodes = nodesRef.current; const x = (currentNodes.length ? Math.max(...currentNodes.map((node) => node.x + NODE_WIDTH)) : 40) + 100; const newNode = { ...structuredClone(source), id, x, y: 40, width: NODE_WIDTH, status: "idle", debugResult: null }; const next = setNodesLive((current) => [...current, newNode]); setSelectedId(id); setPaletteOpen(false); recordHistory(`已添加「${newNode.name}」`, next); }, [recordHistory, setNodesLive]);
  const addConnectedNode = useCallback((sourceId, type) => {
    const sourceNode = nodesRef.current.find((node) => node.id === sourceId);
    const template = createInitialNodes().find((node) => node.type === type) || { type: "tool", name: "医学知识检索", width: NODE_WIDTH, height: 360, config: {} };
    if (!sourceNode) return;
    const id = `added-${newNodeIndex.current++}`;
    const x = sourceNode.x + NODE_WIDTH + 120;
    let y = sourceNode.y;
    while (nodesRef.current.some((node) => Math.abs(node.x - x) < 80 && Math.abs(node.y - y) < 80)) y += 96;
    const newNode = { ...structuredClone(template), id, x, y, width: NODE_WIDTH, status: "idle", debugResult: null };
    const nextNodes = setNodesLive((current) => [...current, newNode]);
    const nextEdges = setEdgesLive((current) => current.some(([from, to]) => from === sourceId && to === id) ? current : [...current, [sourceId, id]]);
    setSelectedId(id);
    recordHistory(`已连接「${newNode.name}」`, nextNodes, nextEdges);
  }, [recordHistory, setEdgesLive, setNodesLive]);
  const renameNode = useCallback((id, name) => { const next = setNodesLive((current) => current.map((node) => node.id === id ? { ...node, name } : node)); recordHistory("节点已重命名", next); }, [recordHistory, setNodesLive]);
  const duplicateNode = useCallback((id) => { const source = nodesRef.current.find((node) => node.id === id); if (!source) return; const copy = { ...structuredClone(source), id: `copy-${newNodeIndex.current++}`, name: `${source.name} 副本`, x: source.x + NODE_WIDTH + 80, y: source.y, width: NODE_WIDTH, status: "idle", debugResult: null }; const next = setNodesLive((current) => [...current, copy]); setSelectedId(copy.id); recordHistory("节点已复制", next); }, [recordHistory, setNodesLive]);
  const deleteNode = useCallback((id) => { const node = nodesRef.current.find((item) => item.id === id); if (!node || node.type === "start") return; const nextNodes = setNodesLive((current) => current.filter((item) => item.id !== id)); const nextEdges = setEdgesLive((current) => current.filter(([from, to]) => from !== id && to !== id)); setSelectedId(null); recordHistory("节点已删除", nextNodes, nextEdges); }, [recordHistory, setEdgesLive, setNodesLive]);
  const runSingleNode = useCallback((id) => { const node = nodesRef.current.find((item) => item.id === id); if (!node) return; if (rejectInvalidWorkflow("工作流校验失败，请检查节点是否正确填值，以及连线是否正常")) return; setDebugModal({ nodeId: id }); setSelectedId(id); }, [rejectInvalidWorkflow]);
  const executeSingleNode = useCallback((id, values) => { if (rejectInvalidWorkflow("工作流校验失败，请检查节点是否正确填值，以及连线是否正常")) return; clearRunTimers(); const started = performance.now(); setDebugModal(null); setNodesLive((current) => current.map((node) => node.id === id ? { ...node, status: "running", debugResult: { status: "running", showResult: false } } : node)); runTimersRef.current.push(window.setTimeout(() => { const node = nodesRef.current.find((item) => item.id === id); const duration = `${((performance.now() - started) / 1000).toFixed(2)}s`; setNodesLive((current) => current.map((item) => item.id === id ? { ...item, status: "success", debugResult: buildDebugResult(item, { runtimeValues: values, duration, showResult: true, answer: item.type === "model" ? "已根据当前输入生成健康评估建议。" : "" }) } : item)); showToast(`「${node?.name || "节点"}」调试完成`); }, 950)); }, [clearRunTimers, rejectInvalidWorkflow, setNodesLive, showToast]);
  const toggleDebugResult = useCallback((id) => setNodesLive((current) => current.map((node) => node.id === id && node.debugResult ? { ...node, debugResult: { ...node.debugResult, showResult: !node.debugResult.showResult } } : node)), [setNodesLive]);
  const clearDebugResult = useCallback((id) => setNodesLive((current) => current.map((node) => node.id === id ? { ...node, status: "idle", debugResult: null } : node)), [setNodesLive]);
  const focusNode = useCallback((id) => { const node = nodesRef.current.find((item) => item.id === id), viewport = viewportRef.current; if (!node || !viewport) return; setSelectedId(id); setPan({ x: viewport.clientWidth / 2 - (node.x + node.width / 2) * zoom, y: viewport.clientHeight / 2 - (node.y + Math.min(nodeHeights[id] || node.height || 300, 500) / 2) * zoom }); setCheckOpen(false); }, [nodeHeights, zoom]);
  const saveModal = (value) => { const next = setNodesLive((current) => current.map((node) => { if (node.id !== modal.nodeId) return node; const config = structuredClone(node.config), key = modal.kind === "variable" ? "variables" : "fields", index = config[key].findIndex((item) => item.id === value.id); if (index >= 0) config[key][index] = value; else config[key].unshift(value); return { ...node, config }; })); setModal(null); recordHistory(modal.kind === "variable" ? "会话变量已修改" : "表单配置已修改", next); setSaveLabel("自动保存于 刚刚"); };
  const saveWorkflowName = () => { const next = workflowNameDraft.trim(); if (!next) { setWorkflowNameDraft(workflowName); setEditingWorkflowName(false); return; } setWorkflowName(next); workflowNameRef.current = next; setEditingWorkflowName(false); recordHistory("工作流名称已修改", nodesRef.current, edgesRef.current, next); };
  const publish = (asTemplate = false) => { if (rejectInvalidWorkflow()) return; setPublished(true); setPublishOpen(false); showToast(asTemplate ? "已发布为工作流模板" : "工作流已上架"); };
  const toggleAllFold = () => { const next = !allCollapsed; setAllCollapsed(next); setFoldCommand({ collapsed: next, token: Date.now() }); };
  const arrangeNodes = () => {
    const current = nodesRef.current;
    const edgeList = edgesRef.current;
    const heights = nodeHeightsRef.current;
    const depth = new Map(current.map((node) => [node.id, 0]));
    let changed = true;
    let guard = edgeList.length + 1;
    while (changed && guard--) {
      changed = false;
      edgeList.forEach(([from, to]) => {
        const nextDepth = (depth.get(from) || 0) + 1;
        if (nextDepth > (depth.get(to) || 0)) { depth.set(to, nextDepth); changed = true; }
      });
    }
    const columns = new Map();
    current.forEach((node) => { const column = depth.get(node.id) || 0; const list = columns.get(column) || []; list.push(node); columns.set(column, list); });
    const positions = new Map();
    [...columns.keys()].sort((left, right) => left - right).forEach((column) => {
      let y = 80;
      columns.get(column).forEach((node) => { positions.set(node.id, { x: 40 + column * (NODE_WIDTH + 120), y }); y += (heights[node.id] || node.height || 280) + 72; });
    });
    const next = setNodesLive((nodes) => nodes.map((node) => positions.has(node.id) ? { ...node, ...positions.get(node.id) } : node));
    recordHistory("节点已整理", next);
    userAdjustedViewRef.current = false;
    fitCanvas();
  };
  return <div className={`workflow-demo ${isExpanded ? "is-expanded" : ""}`} onPointerDown={(event) => { if (paletteOpen && !event.target.closest(".workflow-palette, .wf-toolbar-add")) setPaletteOpen(false); }}>
    <header className="workflow-demo-header"><div className="workflow-demo-title-group"><button type="button" className="wf-icon-button" onClick={onClose} aria-label="关闭交互演示"><SourceIcon name="icon-a-left5x1" /></button><span className="workflow-header-divider" /><span className="workflow-app-icon"><NodeTypeIcon type="score" size={20} /></span><div className="workflow-title-copy"><div>{editingWorkflowName ? <input autoFocus value={workflowNameDraft} onChange={(event) => setWorkflowNameDraft(event.target.value)} onBlur={saveWorkflowName} onKeyDown={(event) => { if (event.key === "Enter") saveWorkflowName(); }} /> : <strong>{workflowName}</strong>}<button type="button" className="workflow-name-edit" onClick={() => setEditingWorkflowName(true)}><LinearEditIcon size={15} /></button>{published && <span className="workflow-status"><SourceIcon name="icon-a-correct_fill5x" /> 已上架</span>}</div><small><i>K</i>Kenzie <b /> {saveLabel}</small></div></div>
      <div className="workflow-demo-actions"><div className="workflow-run-group"><button type="button" className={checkOpen ? "is-active" : ""} onClick={() => { setCheckOpen((current) => !current); setPreviewOpen(false); setPublishOpen(false); setPaletteOpen(false); }}><SourceIcon name="icon-renwuzhongxin" /><span className="wf-action-label">检查{issues.length ? ` ${issues.length}` : ""}</span></button><span /><button type="button" className={previewOpen ? "is-active" : ""} onClick={openRunPreview}><SourceIcon name="icon-run" /><span>运行预览</span></button></div><div className="workflow-publish-wrap"><button type="button" className="workflow-publish" onClick={() => setPublishOpen((value) => !value)}>发布</button>{publishOpen && <div className="workflow-publish-menu"><button type="button" onClick={() => publish(false)}><SourceIcon name="icon-run" /><span><b>发布工作流</b><small>发布当前配置供用户使用</small></span></button><button type="button" onClick={() => publish(true)}><SourceIcon name="icon-a-addversion" /><span><b>发布为工作流模板</b><small>保存为可复用的创建模板</small></span></button></div>}</div></div></header>
    <div className="workflow-canvas" ref={viewportRef} onPointerDown={handlePanStart} onPointerMove={handlePanMove} onPointerUp={() => { panDragRef.current = null; }} onPointerCancel={() => { panDragRef.current = null; }}>
      <div className={`workflow-world ${connectionDraft ? "is-connecting" : ""}`} style={{ width: WORKSPACE.width, height: WORKSPACE.height, transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`, "--wf-zoom": zoom }}><svg className="workflow-edges" viewBox={`0 0 ${WORKSPACE.width} ${WORKSPACE.height}`}><defs><marker id="wf-edge-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0 8 4 0 8Z" /></marker><marker id="wf-edge-arrow-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0 8 4 0 8Z" /></marker></defs>{visibleEdgePaths.map((edge) => { const hot = hoverEdgeId === edge.id || edge.highlighted; return <g key={edge.id}><path className="wf-edge-hit" d={edge.d} onPointerDown={(event) => startConnection(edge.source, "source", event, [edge.source, edge.target])} onMouseEnter={() => showEdgeHover(edge.id)} onMouseLeave={hideEdgeHover} /><path data-source={edge.source} data-target={edge.target} d={edge.d} className={`${edge.tone} ${hot ? "is-hot" : ""}`.trim()} markerEnd={hot ? "url(#wf-edge-arrow-hot)" : "url(#wf-edge-arrow)"} /></g>; })}{connectionPreviewPath && <path className="is-connecting" d={connectionPreviewPath} markerEnd="url(#wf-edge-arrow-hot)" />}</svg>{visibleEdgePaths.map((edge) => hoverEdgeId === edge.id && <button type="button" key={`delete-${edge.id}`} className="wf-edge-delete" style={{ left: edge.midX, top: edge.midY }} onPointerDown={stop} onMouseEnter={() => showEdgeHover(edge.id)} onMouseLeave={hideEdgeHover} onClick={() => deleteEdge(edge.source, edge.target)} aria-label="删除连线"><SourceIcon name="icon-a-error_fill5x" /></button>)}{nodes.map((node) => <WorkflowNode key={node.id} node={node} selected={selectedId === node.id} zoom={zoom} foldCommand={foldCommand} onSelect={setSelectedId} onDrag={queueNodeMove} onDragEnd={() => markSaving("节点位置已修改")} onConnectStart={startConnection} onAddConnected={addConnectedNode} onConfigChange={updateConfig} variables={allVariables} onOpenModal={(kind, nodeId, value) => setModal({ kind, nodeId, value })} onRename={renameNode} onDuplicate={duplicateNode} onDelete={deleteNode} onRun={runSingleNode} onMeasure={measureNode} onToggleDebugResult={toggleDebugResult} onClearDebugResult={clearDebugResult} debugOpen={debugModal?.nodeId === node.id} onCloseDebug={() => setDebugModal(null)} onExecuteDebug={(values) => executeSingleNode(node.id, values)} />)}</div>
      {minimapOpen && <div className="workflow-minimap" role="presentation" onPointerDown={handleMinimapPointerDown} onPointerMove={handleMinimapPointerMove} onPointerUp={handleMinimapPointerUp} onPointerCancel={handleMinimapPointerUp}><span style={{ left: `${((-pan.x / zoom) - minimapBounds.minX) / minimapBounds.width * 100}%`, top: `${((-pan.y / zoom) - minimapBounds.minY) / minimapBounds.height * 100}%`, width: `${Math.min(100, (viewportRef.current?.clientWidth || 800) / zoom / minimapBounds.width * 100)}%`, height: `${Math.min(100, (viewportRef.current?.clientHeight || 500) / zoom / minimapBounds.height * 100)}%` }} />{nodes.map((node) => <i key={node.id} style={{ left: `${(node.x - minimapBounds.minX) / minimapBounds.width * 100}%`, top: `${(node.y - minimapBounds.minY) / minimapBounds.height * 100}%`, width: `${node.width / minimapBounds.width * 100}%`, height: `${(nodeHeights[node.id] || node.height || 300) / minimapBounds.height * 100}%` }} />)}</div>}
      <WorkflowToolbar zoom={zoom} setZoom={zoomTo} fitCanvas={fitCanvas} minimapOpen={minimapOpen} setMinimapOpen={setMinimapOpen} paletteOpen={paletteOpen} setPaletteOpen={setPaletteOpen} canUndo={historyIndex > 0} canRedo={historyIndex < historyItems.length - 1} undo={undo} redo={redo} historyItems={historyItems} historyIndex={historyIndex} setHistoryIndex={restoreHistory} clearHistory={clearHistory} onOpenPanel={() => { setCheckOpen(false); setPreviewOpen(false); setPublishOpen(false); }} externalPanelOpen={checkOpen || previewOpen || publishOpen} allCollapsed={allCollapsed} onToggleFold={toggleAllFold} onArrange={arrangeNodes} />
      {paletteOpen && <aside className="workflow-palette" onPointerDown={stop}><NodeAddPanel onPick={addNode} /></aside>}
      {checkOpen && <WorkflowCheckPanel issues={issues} nodeCount={nodes.length} edgeCount={edges.length} onClose={() => setCheckOpen(false)} onFocus={focusNode} />}
      {previewOpen && <WorkflowPreview nodes={nodes} messages={messages} variables={startVariables.filter((item) => item.variableType === "global")} isRunning={isRunning} runComplete={runComplete} onSend={runWorkflow} onStop={stopWorkflow} onClear={() => { clearRunTimers(); setIsRunning(false); setRunComplete(false); setMessagesLive([]); setNodesLive((current) => current.map((node) => ({ ...node, status: "idle", debugResult: null }))); }} onRetry={retryWorkflow} onClose={() => setPreviewOpen(false)} />}
      {modal && <ConfigModal key={`${modal.kind}-${modal.value?.id || "new"}`} modal={modal} onClose={() => setModal(null)} onSave={saveModal} />}
      {toast && <div className="workflow-toast"><FlowIcon name="check" /> {toast}</div>}
    </div>
  </div>;
}
