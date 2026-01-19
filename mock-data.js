// Offline mock dataset (kept as JS so the prototype can work via file://).
// If you later add a backend, replace this with real API responses.
globalThis.__MOCK_DATA__ = {
  generated_at: "2026-01-19 18:40",
  season: "2026",
  lead: "14d",
  all: {
    forecast_total_tons: { q10: 383000, q50: 412000, q90: 444000 },
    last_week_q50_tons: 418500,
    confidence: 0.76,
    risk_prob_under_10pct_below_normal: 0.68,
    trend_weeks: [
      { t: "W-6", q10: 398000, q50: 422000, q90: 452000 },
      { t: "W-5", q10: 395000, q50: 421000, q90: 451000 },
      { t: "W-4", q10: 392000, q50: 420000, q90: 450000 },
      { t: "W-3", q10: 389000, q50: 419000, q90: 448000 },
      { t: "W-2", q10: 386500, q50: 418500, q90: 446000 },
      { t: "W-1", q10: 384000, q50: 415500, q90: 444500 },
      { t: "W0", q10: 383000, q50: 412000, q90: 444000 }
    ],
    hazards: [
      {
        type: "连阴雨/寡照",
        h7: { p: 0.62, s: "mid" },
        h15: { p: 0.71, s: "high" },
        h30: { p: 0.55, s: "mid" }
      },
      {
        type: "渍涝/田间积水",
        h7: { p: 0.44, s: "mid" },
        h15: { p: 0.63, s: "mid" },
        h30: { p: 0.41, s: "low" }
      },
      {
        type: "干旱/土壤偏干",
        h7: { p: 0.18, s: "low" },
        h15: { p: 0.22, s: "low" },
        h30: { p: 0.31, s: "mid" }
      },
      { type: "高温热害", h7: { p: 0.08, s: "low" }, h15: { p: 0.11, s: "low" }, h30: { p: 0.19, s: "low" } }
    ],
    alerts: [
      {
        id: "A-001",
        severity: "high",
        type: "连阴雨/寡照",
        region: "山东",
        window: "未来 10-18 天",
        probability: 0.76,
        desc: "关键期光照偏低概率上升，需关注病害与田间管理压力。"
      },
      {
        id: "A-002",
        severity: "mid",
        type: "渍涝/田间积水",
        region: "河北",
        window: "未来 7-15 天",
        probability: 0.62,
        desc: "局地强降雨叠加排水能力差区域，需关注渍涝风险。"
      },
      {
        id: "A-003",
        severity: "low",
        type: "干旱/土壤偏干",
        region: "辽宁",
        window: "未来 20-30 天",
        probability: 0.41,
        desc: "中期偏干信号出现，建议提前准备灌溉与墒情监测。"
      }
    ],
    drivers: [
      { name: "连续降雨日数上升", dir: "推高渍涝/病害风险", evidence: "山东/河北：未来15天>6天降雨的集合成员占比提升（示意）" },
      { name: "有效辐射偏低", dir: "压制同化与块茎膨大效率", evidence: "连阴雨触发器概率：15天窗口 0.71（示意）" },
      { name: "土壤湿度偏高", dir: "加大根系缺氧与烂根概率", evidence: "渍涝触发器概率：15天窗口 0.63（示意）" }
    ],
    advice: [
      "建议对重点县建立“降雨-田间积水-病害”联动监测；当连雨持续>5天时提升巡田频次。",
      "建议提前核对排水与沟渠能力，对低洼地块准备应急排涝预案。",
      "建议将采购/仓储/物流资源按风险等级预留弹性，避免在极端天气窗口出现执行瓶颈。"
    ]
  },
  regions: {
    SD: {
      name: "山东",
      forecast_total_tons: { q10: 215000, q50: 238000, q90: 259000 },
      risk_prob_under_10pct_below_normal: 0.74,
      key_risks: [
        { name: "连阴雨", severity: "high" },
        { name: "渍涝", severity: "mid" }
      ],
      decomp: { area_mu: 312000, yield_kg_per_mu: 760 },
      counties: [
        { name: "安丘", risk: 0.81 },
        { name: "莱芜", risk: 0.77 },
        { name: "昌邑", risk: 0.73 }
      ]
    },
    HE: {
      name: "河北",
      forecast_total_tons: { q10: 86000, q50: 98000, q90: 112000 },
      risk_prob_under_10pct_below_normal: 0.63,
      key_risks: [
        { name: "渍涝", severity: "mid" },
        { name: "连阴雨", severity: "mid" }
      ],
      decomp: { area_mu: 138000, yield_kg_per_mu: 710 },
      counties: [
        { name: "深州", risk: 0.69 },
        { name: "饶阳", risk: 0.62 },
        { name: "武强", risk: 0.58 }
      ]
    },
    LN: {
      name: "辽宁",
      forecast_total_tons: { q10: 69000, q50: 76000, q90: 84000 },
      risk_prob_under_10pct_below_normal: 0.52,
      key_risks: [
        { name: "偏干", severity: "low" },
        { name: "冷空气波动", severity: "low" }
      ],
      decomp: { area_mu: 112000, yield_kg_per_mu: 680 },
      counties: [
        { name: "盖州", risk: 0.57 },
        { name: "普兰店", risk: 0.53 },
        { name: "瓦房店", risk: 0.49 }
      ]
    }
  }
};

