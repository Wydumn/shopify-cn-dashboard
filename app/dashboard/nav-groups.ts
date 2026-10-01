import type { MenuKey } from "./layout";

export interface PanelGroupTab {
  id: MenuKey;
  label: string;
}

export interface PanelGroup {
  key: string;
  label: string;
  tabs: PanelGroupTab[];
}

// 合并重复入口：侧栏只留一个入口，组内用顶部 Tab 切换原有面板（面板实现不变）。
export const PANEL_GROUPS: PanelGroup[] = [
  {
    key: "inventory",
    label: "库存中心",
    tabs: [
      { id: "inventory-alert", label: "库存健康" },
      { id: "multi-location", label: "多仓库存" },
    ],
  },
  {
    key: "pricing",
    label: "价格与批量",
    tabs: [
      { id: "product-control", label: "跨店改价" },
      { id: "bulk-edit", label: "批量编辑" },
      { id: "batch-op", label: "批量操作" },
      { id: "multi-currency", label: "多币种定价" },
    ],
  },
  {
    key: "customers",
    label: "客户中心",
    tabs: [
      { id: "customers", label: "客户管理" },
      { id: "customer-segmentation", label: "价值分层 RFM" },
    ],
  },
];

export function findGroup(id: MenuKey): PanelGroup | undefined {
  return PANEL_GROUPS.find((g) => g.tabs.some((t) => t.id === id));
}
