export interface TenantConfig {
  logoUrl?: string;
  theme?: string;
  features: { customMonitoring: boolean; customReports: boolean };
}
export const tenantConfigs: Record<string, TenantConfig> = {
  default: { features: { customMonitoring: false, customReports: false } },
};
export const getTenantConfig = (tenantId?: string | null): TenantConfig => {
  if (!tenantId) return tenantConfigs.default;
  return tenantConfigs[tenantId] || tenantConfigs.default;
};
