/*
 * Ported from med-dayi-bots-fe (commit b966699f):
 * - template/system/{workflowStart,ifElse,userSelect,formInput,aiChat,dialogueRefresh}.js
 * - components/nodes/{NodeFlowStart,NodeIfElse,NodeUserSelect,NodeFormInput,NodeSimple}.vue
 * - components/base/SettingLLMModel/SettingLLMModel.vue
 *
 * The source project is Vue + Element Plus + Vue Flow. This file keeps its field
 * names, defaults and operations while the portfolio renders them with local React
 * controls, so the demo does not ship the source app's API/client runtime.
 */

export const SYSTEM_VARIABLES = [
  { label: "用户本轮输入", key: "userChatInput", valueType: "String" },
  { label: "对话轮次", key: "conversationTurn", valueType: "Number" },
  { label: "当前时间", key: "currentDatetime", valueType: "String" },
  { label: "对话历史", key: "dialogueHistory", valueType: "Object" },
  { label: "会话id", key: "conversationIdStr", valueType: "String" },
  { label: "用户id", key: "identity", valueType: "String" }
];

export const RELATIONS = {
  String: ["等于", "不等于", "正则", "包含", "不包含", "开始为", "结束为", "长度等于", "长度不等于", "长度大于", "长度大于等于", "长度小于", "长度小于等于", "为空", "不为空"],
  Number: ["=", "≠", "＞", "＜", "≥", "≤", "为空", "不为空"],
  Boolean: ["为空", "不为空", "为TRUE", "为FALSE"],
  File: ["为空", "不为空"],
  Object: ["为空", "不为空", "等于", "不等于"],
  Array: ["包含", "不包含", "为空", "不为空", "开始为", "结束为", "长度等于", "长度不等于", "长度大于", "长度大于等于", "长度小于", "长度小于等于"]
};

export const VARIABLE_TYPES = ["String", "Number", "Integer", "Boolean", "Object", "Array<String>", "Array<Number>", "Image", "Doc", "Pdf", "Txt", "Excel"];
export const FORM_TYPES = [
  { value: "input", label: "文本输入框" },
  { value: "select", label: "单选框" },
  { value: "number", label: "数字输入框" }
];

export const MODEL_PARAMETER_DEFS = [
  { key: "randomness", label: "随机性", min: 0, max: 2, step: 0.1 },
  { key: "topP", label: "Top P", min: 0, max: 1, step: 0.05 },
  { key: "topK", label: "Top K", min: 1, max: 100, step: 1 },
  { key: "repetitionPenalty", label: "重复惩罚", min: 0, max: 2, step: 0.1 },
  { key: "presencePenalty", label: "存在惩罚", min: -2, max: 2, step: 0.1 },
  { key: "frequencyPenalty", label: "频率惩罚", min: -2, max: 2, step: 0.1 },
  { key: "token", label: "最大回复长度", min: 1, max: 8192, step: 1 },
  { key: "streamOutputIntervalMs", label: "流式吐字速率(ms)", min: 10, max: 200, step: 10 }
];

let sequence = 20;
export const nextId = (prefix) => `${prefix}-${sequence++}`;

export function createInitialNodes() {
  return [
    {
      id: "start", type: "start", name: "流程开始", x: 40, y: 40, width: 440, height: 720,
      config: {
        autoStart: true,
        variables: [
          { id: "v-name", variableType: "global", type: "input", key: "userName", name: "姓名", valueType: "String", required: true, maxValue: 50, defaultValue: "" },
          { id: "v-age", variableType: "global", type: "number", key: "age", name: "年龄", valueType: "Number", required: true, minValue: 0, maxValue: 120, defaultValue: "" },
          { id: "v-gender", variableType: "global", type: "select", key: "gender", name: "性别", valueType: "String", required: true, defaultValue: "", chooseOptions: [{ id: "gender-f", value: "女" }, { id: "gender-m", value: "男" }, { id: "gender-o", value: "其他" }] },
          { id: "v-history", variableType: "global", type: "select", key: "chronicHistory", name: "慢性病史", valueType: "String", required: true, defaultValue: "", chooseOptions: [{ id: "history-none", value: "无" }, { id: "history-hbp", value: "高血压" }, { id: "history-diabetes", value: "糖尿病" }, { id: "history-other", value: "其他" }] },
          { id: "v-symptom", variableType: "session", type: "input", key: "symptom", name: "症状描述", valueType: "String", required: false, defaultValue: "" }
        ]
      }
    },
    {
      id: "condition", type: "condition", name: "条件分支", x: 580, y: 200, width: 440, height: 360,
      config: {
        branches: [{ id: "branch-1", key: "elder", logic: "AND", conditions: [
          { id: "cond-1", variable: "age", valueType: "Number", relation: "≥", enterType: 1, value: "60" },
          { id: "cond-2", variable: "symptom", valueType: "String", relation: "不为空", enterType: 1, value: "" }
        ] }]
      }
    },
    {
      id: "choice", type: "choice", name: "单选分支", x: 1120, y: 40, width: 440, height: 520,
      config: {
        description: "请选择最符合当前情况的评估方向，输入“/”可引用变量",
        options: [
          { key: "option-1", value: "焦虑自评 GAD-7" },
          { key: "option-2", value: "睡眠质量评估" }
        ]
      }
    },
    {
      id: "score", type: "score", name: "焦虑自评表得分", x: 1660, y: 40, width: 440, height: 680,
      config: {
        description: "请根据最近两周的真实感受完成量表",
        fields: [
          { id: "form-1", key: "感觉紧张、焦虑或急切", variableName: "tenseScore", description: "0=完全没有，3=几乎每天", type: "select", required: true, defaultValue: "完全没有", list: [{ id: "o1", value: "完全没有" }, { id: "o2", value: "有几天" }, { id: "o3", value: "一半以上时间" }, { id: "o4", value: "几乎每天" }] },
          { id: "form-2", key: "不能停止或控制担忧", variableName: "worryScore", description: "请选择最符合的选项", type: "select", required: true, defaultValue: "完全没有", list: [{ id: "o5", value: "完全没有" }, { id: "o6", value: "有几天" }, { id: "o7", value: "一半以上时间" }, { id: "o8", value: "几乎每天" }] },
          { id: "form-3", key: "补充说明", variableName: "extraNote", description: "可选", type: "input", required: false, max: 400, defaultValue: "", list: [] }
        ]
      }
    },
    {
      id: "model", type: "model", name: "对话类大模型", x: 1120, y: 720, width: 440, height: 980,
      config: {
        modelClassCode: "general", modelClassName: "通用模型", modelName: "DeepSeek-V3", modelAnotherName: "医疗增强版",
        diversityChooseType: "balance", randomness: 0.7, topP: 0.9, topK: 40, repetitionPenalty: 1.1, presencePenalty: 0, frequencyPenalty: 0,
        token: 2000, round: 6, streamOutputIntervalMs: 50, think: true, openThink: true, reasoningEffort: "medium",
        userChatInput: "{{sys.userChatInput}}", showChatImage: false, chatImage: "", showKnowledgeReference: true,
        systemPrompt: "你是一名严谨、友好的健康评估助手。请结合量表结果提供清晰建议。",
        userPrompt: "结合 {{tenseScore}}、{{worryScore}} 与 {{extraNote}} 生成评估说明。"
      }
    },
    {
      id: "output", type: "output", name: "对话刷新", x: 1660, y: 860, width: 440, height: 220,
      config: { output: "会话刷新信号" }
    }
  ];
}

export const INITIAL_EDGES = [["start", "condition"], ["condition", "choice"], ["condition", "model"], ["choice", "score"], ["choice", "model"], ["score", "model"], ["model", "output"]];
