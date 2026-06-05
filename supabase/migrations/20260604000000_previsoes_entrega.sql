-- Criar tabela de Previsões de Entrega
CREATE TABLE IF NOT EXISTS previsoes_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elevator_id uuid REFERENCES elevators(id) ON DELETE CASCADE,
  probabilidade numeric(5,2) DEFAULT 0,
  mes_previsto int,
  ano_previsto int,
  classificacao varchar(20),
  risco_atraso boolean DEFAULT false,
  motivo_risco text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(elevator_id)
);

-- Habilitar RLS
ALTER TABLE previsoes_entrega ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Enable read access for all authenticated users" ON previsoes_entrega FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON previsoes_entrega FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Função principal de cálculo da probabilidade
CREATE OR REPLACE FUNCTION fn_calculate_elevator_probability(p_elevator_id uuid)
RETURNS void AS $$
DECLARE
  v_elevator RECORD;
  v_overall_percentage numeric := 0;
  v_phase_weight numeric := 0;
  v_team_prod numeric := 50; -- Default 50%
  v_super_hist numeric := 50; -- Default 50%
  v_regional_hist numeric := 50; -- Default 50%
  v_prob numeric := 0;
  v_class varchar(20);
  v_risco boolean := false;
  v_motivo text := '';
  v_expected_date date;
  v_mes int;
  v_ano int;
  
  v_pre_pct numeric := 0;
  v_mont_pct numeric := 0;
  v_ajuste_pct numeric := 0;
  
BEGIN
  -- Buscar o elevador
  SELECT * INTO v_elevator FROM elevators WHERE id = p_elevator_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Obter datas
  v_expected_date := v_elevator.expected_end_date;
  IF v_expected_date IS NOT NULL THEN
    v_mes := EXTRACT(MONTH FROM v_expected_date);
    v_ano := EXTRACT(YEAR FROM v_expected_date);
  END IF;

  -- Peso da Fase e Andamento Percentual
  IF v_elevator.status = 'pre_instalacao' THEN
    v_phase_weight := 20;
    SELECT COALESCE(AVG(percentage), 0) INTO v_pre_pct FROM pre_installation_checklists WHERE elevator_id = p_elevator_id;
    v_overall_percentage := v_pre_pct / 3.0; 
  ELSIF v_elevator.status = 'montagem' THEN
    v_phase_weight := 60;
    v_pre_pct := 100;
    SELECT COALESCE(AVG(percentage), 0) INTO v_mont_pct FROM assembly_checklists WHERE elevator_id = p_elevator_id;
    v_overall_percentage := (v_pre_pct + v_mont_pct) / 3.0;
  ELSIF v_elevator.status = 'ajuste' THEN
    v_phase_weight := 90;
    v_pre_pct := 100;
    v_mont_pct := 100;
    SELECT COALESCE(AVG(percentage), 0) INTO v_ajuste_pct FROM adjustment_checklists WHERE elevator_id = p_elevator_id;
    v_overall_percentage := (v_pre_pct + v_mont_pct + v_ajuste_pct) / 3.0;
  ELSIF v_elevator.status = 'concluido' THEN
    v_phase_weight := 100;
    v_overall_percentage := 100;
  END IF;

  -- Aplicar Fórmula: (40% andamento) + (30% prod eq) + (20% hist sup) + (10% hist reg)
  v_prob := (v_overall_percentage * 0.40) + (v_team_prod * 0.30) + (v_super_hist * 0.20) + (v_regional_hist * 0.10);
  
  -- Para status concluido cravar 100
  IF v_elevator.status = 'concluido' THEN
    v_prob := 100;
  END IF;

  -- Determinar classificação
  IF v_prob >= 95 THEN v_class := 'Muito Alta';
  ELSIF v_prob >= 80 THEN v_class := 'Alta';
  ELSIF v_prob >= 60 THEN v_class := 'Média';
  ELSIF v_prob >= 40 THEN v_class := 'Baixa';
  ELSE v_class := 'Crítica';
  END IF;

  -- Determinar Risco de Atraso
  IF v_expected_date IS NOT NULL AND v_elevator.status != 'concluido' THEN
    IF v_expected_date < CURRENT_DATE THEN
      v_risco := true;
      v_motivo := 'Prazo original expirado.';
    ELSIF (v_expected_date - CURRENT_DATE) <= 30 AND v_prob < 60 THEN
      v_risco := true;
      v_motivo := 'Baixo andamento em relação à proximidade da data de entrega.';
    END IF;
  END IF;

  -- Atualizar ou Inserir
  INSERT INTO previsoes_entrega (
    elevator_id, probabilidade, mes_previsto, ano_previsto, classificacao, risco_atraso, motivo_risco, updated_at
  ) VALUES (
    p_elevator_id, v_prob, v_mes, v_ano, v_class, v_risco, v_motivo, now()
  ) ON CONFLICT (elevator_id) DO UPDATE SET
    probabilidade = EXCLUDED.probabilidade,
    mes_previsto = EXCLUDED.mes_previsto,
    ano_previsto = EXCLUDED.ano_previsto,
    classificacao = EXCLUDED.classificacao,
    risco_atraso = EXCLUDED.risco_atraso,
    motivo_risco = EXCLUDED.motivo_risco,
    updated_at = now();

END;
$$ LANGUAGE plpgsql;

-- Gatilho no Elevador
CREATE OR REPLACE FUNCTION trigger_recalc_elevators()
RETURNS trigger AS $$
BEGIN
  PERFORM fn_calculate_elevator_probability(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_elevators ON elevators;
CREATE TRIGGER trg_recalc_elevators
AFTER UPDATE OF status, expected_end_date ON elevators
FOR EACH ROW
EXECUTE FUNCTION trigger_recalc_elevators();

-- Gatilho nos Checklists (Pre, Montagem, Ajuste)
CREATE OR REPLACE FUNCTION trigger_recalc_checklists()
RETURNS trigger AS $$
BEGIN
  PERFORM fn_calculate_elevator_probability(NEW.elevator_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_pre ON pre_installation_checklists;
CREATE TRIGGER trg_recalc_pre
AFTER UPDATE OF percentage ON pre_installation_checklists
FOR EACH ROW EXECUTE FUNCTION trigger_recalc_checklists();

DROP TRIGGER IF EXISTS trg_recalc_assembly ON assembly_checklists;
CREATE TRIGGER trg_recalc_assembly
AFTER UPDATE OF percentage ON assembly_checklists
FOR EACH ROW EXECUTE FUNCTION trigger_recalc_checklists();

DROP TRIGGER IF EXISTS trg_recalc_adjust ON adjustment_checklists;
CREATE TRIGGER trg_recalc_adjust
AFTER UPDATE OF percentage ON adjustment_checklists
FOR EACH ROW EXECUTE FUNCTION trigger_recalc_checklists();

-- Chamar a função para todos os elevadores existentes uma vez para preencher a tabela
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM elevators LOOP
    PERFORM fn_calculate_elevator_probability(r.id);
  END LOOP;
END;
$$;
