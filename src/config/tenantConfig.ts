export interface TenantConfig {
  logoUrl?: string;
  theme?: string;
  features: { customMonitoring: boolean; customReports: boolean };
}
export const tenantConfigs: Record<string, TenantConfig> = {
  // SUBSTITUA "COLOQUE_O_ID_DA_TKELEVADORES_AQUI" PELO ID REAL DA EMPRESA LÁ NO SUPABASE
  'COLOQUE_O_ID_DA_TKELEVADORES_AQUI': {
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
