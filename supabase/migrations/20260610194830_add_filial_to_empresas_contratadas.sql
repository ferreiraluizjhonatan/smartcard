ALTER TABLE empresas_contratadas
ADD COLUMN filial_id UUID REFERENCES filiais(id) ON DELETE SET NULL;

CREATE INDEX idx_empresas_contratadas_filial_id ON empresas_contratadas(filial_id);
