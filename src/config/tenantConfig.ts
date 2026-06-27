export interface TenantConfig {
  logoUrl?: string;
  theme?: string;
  features: { customMonitoring: boolean; customReports: boolean };
}
export const tenantConfigs: Record<string, TenantConfig> = {
  // SUBSTITUA "a6430624-d8d5-42a1-a599-5e26b93cbfd6" PELO ID REAL DA EMPRESA LÁ NO SUPABASE
  'a6430624-d8d5-42a1-a599-5e26b93cbfd6': {
    logoUrl: '/logos/tkelevadores.png', // Exemplo: coloque o arquivo da logo na pasta public/logos/
    features: {
      customMonitoring: true,
      customReports: true
    }
  },
  default: { features: { customMonitoring: false, customReports: false } },
};
export const getTenantConfig = (tenantId?: string | null): TenantConfig => {
  if (!tenantId) return tenantConfigs.default;
  return tenantConfigs[tenantId] || tenantConfigs.default;
};
