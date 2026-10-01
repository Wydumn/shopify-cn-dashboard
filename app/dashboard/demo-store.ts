export interface DemoStoreEntry {
  id: string;
  shopUrl: string;
  accessToken: string;
  shopName: string;
  isDemo: true;
}

export function createDefaultDemoStore(): DemoStoreEntry {
  return {
    id: "demo-0",
    shopUrl: "tech-accessories-demo.myshopify.com",
    accessToken: "demo-mode",
    shopName: "TechGear Pro",
    isDemo: true,
  };
}

export function saveDefaultDemoStore(): DemoStoreEntry {
  const demoStore = createDefaultDemoStore();
  localStorage.setItem("shopify_stores", JSON.stringify([demoStore]));
  localStorage.setItem("shopify_current_store_id", demoStore.id);
  return demoStore;
}
