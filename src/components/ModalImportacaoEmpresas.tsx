import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Play } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface ModalImportacaoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportStage = 'upload' | 'preview' | 'processing' | 'report';

interface MappedData {
  empresa: any;
  tecnico: any;
  hasTecnico: boolean;
  status: 'valid' | 'duplicate_empresa' | 'internal_duplicate' | 'duplicate_tecnico' | 'error';
  errorMsg?: string;
}

export function ModalImportacaoEmpresas({ isOpen, onClose, onSuccess }: ModalImportacaoProps) {
  const [stage, setStage] = useState<ImportStage>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview Data
  const [mappedRows, setMappedRows] = useState<MappedData[]>([]);
  const [stats, setStats] = useState<{
    totalRows: number;
    empresasFound: number;
    tecnicosFound: number;
    duplicates: number;
    errors: number;
    errorDetails?: string[];
  }>({
    totalRows: 0,
    empresasFound: 0,
    tecnicosFound: 0,
    duplicates: 0,
    errors: 0,
    errorDetails: []
  });

  // Strategy Option
  const [conflictStrategy, setConflictStrategy] = useState<'ignore' | 'update' | 'update_link'>('ignore');

  // Filiais
  const [filiais, setFiliais] = useState<any[]>([]);
  const [selectedFilial, setSelectedFilial] = useState<string>('');

  React.useEffect(() => {
    const fetchFiliais = async () => {
      const { data } = await supabase.from('companies').select('id, name, branch').order('name');
      if (data) setFiliais(data);
    };
    fetchFiliais();
  }, []);

  // Report Data
  const [report, setReport] = useState({
    empresasImportadas: 0,
    tecnicosImportados: 0,
    atualizados: 0,
    ignorados: 0,
    erros: 0,
    importErrors: [] as string[],
    timeMs: 0
  });

  const DICTIONARY = {
    razao_social: ['empresa', 'razão social', 'razao social', 'nome fantasia', 'fornecedor', 'terceirizada'],
    cnpj: ['cnpj', 'documento', 'cadastro'],
    responsavel: ['responsável', 'responsavel', 'contato', 'gestor'],
    telefone: ['telefone', 'celular', 'whatsapp', 'fone'],
    email: ['email', 'e-mail', 'correio eletrônico', 'correio eletronico', 'correio'],
    nome_tecnico: ['nome', 'técnico', 'tecnico', 'funcionário', 'funcionario', 'colaborador'],
    matricula: ['matrícula', 'matricula', 'registro', 'código', 'codigo'],
    rg: ['rg', 'identidade'],
    cpf: ['cpf', 'c.p.f.', 'c.p.f', 'cpf.'],
    data_nascimento: ['nascimento', 'dt de nascimento', 'data de nascimento', 'nasc', 'dt nasc', 'dt. nascimento'],
    data_admissao: ['admissão', 'admissao', 'dt admissao', 'data de admissão', 'admitido', 'dt. admissão', 'dt. admissao'],
    funcao: ['função', 'funcao', 'cargo'],
    telegram_id: ['telegram', 'telegram id', 'chat id']
  };

  const parseDateString = (dateStr: any) => {
    if (!dateStr) return null;
    if (typeof dateStr === 'number' || (typeof dateStr === 'string' && !isNaN(Number(dateStr)))) {
      const excelEpoch = new Date(1899, 11, 30);
      const parsedDate = new Date(excelEpoch.getTime() + Number(dateStr) * 86400000);
      return parsedDate.toISOString().split('T')[0];
    }
    
    if (typeof dateStr === 'string') {
      // extract just the date part if there is time
      const datePart = dateStr.split(' ')[0];
      const parts = datePart.split('/');
      if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) year = `20${year}`;
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      // try YYYY-MM-DD
      if (datePart.includes('-')) {
          return datePart;
      }
    }
    return null;
  };

  const getMappedKey = (header: string) => {
    const normalized = header.toLowerCase().trim();
    for (const [key, aliases] of Object.entries(DICTIONARY)) {
      if (aliases.some(alias => normalized.includes(alias))) {
        return key;
      }
    }
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    await processFile(selectedFile);
  };

  const processFile = async (selectedFile: File) => {
    setLoading(true);
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false, dateNF: 'dd/mm/yyyy' });

      if (json.length === 0) throw new Error("Planilha vazia");

      // Identify columns
      const rawHeaders = Object.keys(json[0] as object);
      const headerMap: Record<string, string> = {};
      rawHeaders.forEach(h => {
        const mapped = getMappedKey(h);
        if (mapped) headerMap[h] = mapped;
      });

      // Fetch existing CNPJs and CPFs for validation
      const { data: dbEmpresas } = await supabase.from('empresas_contratadas').select('cnpj');
      const { data: dbTecnicos } = await supabase.from('tecnicos_empresas').select('cpf');
      
      const existingCnpjs = new Set(dbEmpresas?.map(e => e.cnpj) || []);
      const existingCpfs = new Set(dbTecnicos?.map(t => t.cpf) || []);

      const processed: MappedData[] = [];
      let empCount = 0;
      let tecCount = 0;
      let dupCount = 0;
      let errCount = 0;

      // Unique tracking for current sheet to avoid internal duplicates
      const sheetCnpjs = new Set();
      const sheetMatriculas = new Set();

      json.forEach((row: any) => {
        const mappedData: any = {};
        for (const [rawH, val] of Object.entries(row)) {
          if (headerMap[rawH] && val !== '') {
            mappedData[headerMap[rawH]] = String(val).trim();
          }
        }

        const empresa: any = {
          razao_social: mappedData.razao_social || 'Desconhecida',
          nome_fantasia: mappedData.razao_social || 'Desconhecida',
          cnpj: mappedData.cnpj || '',
          responsavel: mappedData.responsavel || 'Não informado',
          telefone: mappedData.telefone || '',
          email: mappedData.email || '',
          status: 'Ativa'
        };

        const hasTecnico = !!mappedData.nome_tecnico;
        const fallbackId = `${Date.now()}-${Math.floor(Math.random()*1000000)}-${empCount}-${tecCount}`;
        const tecnico: any = hasTecnico ? {
          nome: mappedData.nome_tecnico,
          matricula: mappedData.matricula || `MAT-${fallbackId}`,
          cpf: mappedData.cpf || (mappedData.cnpj ? `N/A-${fallbackId}` : ''),
          rg: mappedData.rg || null,
          data_nascimento: parseDateString(mappedData.data_nascimento),
          data_admissao: parseDateString(mappedData.data_admissao),
          telefone: mappedData.telefone || '',
          email: mappedData.email || '',
          telegram_id: mappedData.telegram_id || '',
          funcao: mappedData.funcao || 'Montador',
          status: 'Ativo'
        } : null;

        let status: MappedData['status'] = 'valid';
        let errorMsg = '';

        if (!empresa.cnpj) {
          status = 'error';
          errorMsg = 'CNPJ não encontrado';
          errCount++;
        } else if (existingCnpjs.has(empresa.cnpj)) {
          status = 'duplicate_empresa';
          errorMsg = 'Empresa já existe';
          dupCount++;
        } else if (sheetCnpjs.has(empresa.cnpj)) {
          status = 'internal_duplicate';
          // It's just another technician for a new company we are about to create.
        } else {
          sheetCnpjs.add(empresa.cnpj);
          empCount++;
        }

        if (hasTecnico) {
          if (sheetMatriculas.has(tecnico.matricula)) {
            status = 'duplicate_tecnico';
            errorMsg = 'Técnico duplicado na planilha';
            dupCount++;
          } else {
            sheetMatriculas.add(tecnico.matricula);
            tecCount++;
          }
        }

        processed.push({ empresa, tecnico, hasTecnico, status, errorMsg });
      });

      setMappedRows(processed);
      setStats({
        totalRows: processed.length,
        empresasFound: empCount,
        tecnicosFound: tecCount,
        duplicates: dupCount,
        errors: errCount,
        errorDetails: []
      });
      setStage('preview');

    } catch (err: any) {
      alert(`Erro ao ler arquivo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const executeImport = async () => {
    setStage('processing');
    const startTime = Date.now();
    let empOk = 0;
    let tecOk = 0;
    let atualizados = 0;
    let ignorados = 0;
    let erros = 0;
    const executionErrors: string[] = [];

    // Cache CNPJ -> ID mapping to link technicians
    const empresaIdMap: Record<string, string> = {};

    // Group rows by Empresa to batch inserts
    const validEmpresas = mappedRows.filter(r => r.status === 'valid' || r.status === 'internal_duplicate' || r.status.startsWith('duplicate'));
    
    // Process unique empresas first
    const uniqueEmpresasMap = new Map<string, any>();
    validEmpresas.forEach(r => {
      if (r.empresa.cnpj && !uniqueEmpresasMap.has(r.empresa.cnpj)) {
        uniqueEmpresasMap.set(r.empresa.cnpj, r);
      }
    });

    for (const [cnpj, row] of uniqueEmpresasMap.entries()) {
      try {
        if (row.status === 'duplicate_empresa') {
          if (conflictStrategy === 'ignore') {
            ignorados++;
            // Fetch ID so we can still link new technicians if update_link strategy is partially used
            const { data } = await supabase.from('empresas_contratadas').select('id').eq('cnpj', cnpj).single();
            if (data) empresaIdMap[cnpj] = data.id;
            continue;
          } else {
            const updatePayload = { ...row.empresa };
            if (selectedFilial) updatePayload.company_id = selectedFilial;
            
            const { data, error } = await supabase
              .from('empresas_contratadas')
              .update(updatePayload)
              .eq('cnpj', cnpj)
              .select('id')
              .single();
            if (error) throw error;
            if (data) empresaIdMap[cnpj] = data.id;
            atualizados++;
          }
        } else {
          const insertPayload = { ...row.empresa };
          if (selectedFilial) insertPayload.company_id = selectedFilial;

          const { data, error } = await supabase
            .from('empresas_contratadas')
            .insert([insertPayload])
            .select('id')
            .single();
          if (error) throw error;
          if (data) empresaIdMap[cnpj] = data.id;
          empOk++;
        }
      } catch (err: any) {
        erros++;
        executionErrors.push(`Erro Empresa ${cnpj}: ${err.message}`);
      }
    }

    const techniciansToInsert = [];
    for (const row of mappedRows) {
      if (row.hasTecnico && row.empresa.cnpj) {
        const empId = empresaIdMap[row.empresa.cnpj];
        if (empId && (row.status === 'valid' || row.status === 'internal_duplicate' || conflictStrategy === 'update_link')) {
           techniciansToInsert.push({
             ...row.tecnico,
             empresa_id: empId
           });
        }
      }
    }

    const chunkSize = 100;
    for (let i = 0; i < techniciansToInsert.length; i += chunkSize) {
      const chunk = techniciansToInsert.slice(i, i + chunkSize);
      try {
        const { error } = await supabase.from('tecnicos_empresas').insert(chunk);
        if (error) throw error;
        tecOk += chunk.length;
      } catch (err) {
        erros += chunk.length;
      }
    }

    const timeMs = Date.now() - startTime;

    await supabase.from('importacoes_empresas').insert([{
      arquivo: file?.name || 'desconhecido',
      empresas_importadas: empOk,
      tecnicos_importados: tecOk,
      registros_atualizados: atualizados,
      erros: erros,
      status: erros === 0 ? 'Concluído' : 'Parcial'
    }]);

      setReport({
        empresasImportadas: empOk,
        tecnicosImportados: tecOk,
        atualizados,
        ignorados,
        erros,
        importErrors: executionErrors,
        timeMs: Date.now() - startTime
      });
    setStage('report');
  };

  const handleClose = () => {
    if (stage === 'report') onSuccess();
    setStage('upload');
    setFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column',
        margin: '16px', overflow: 'hidden', padding: 0
      }}>
        
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '20px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', backgroundColor: 'rgba(0, 210, 255, 0.1)', borderRadius: '12px' }}>
              <FileSpreadsheet color="var(--accent-cyan)" size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Importação Inteligente</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Excel ou CSV</p>
            </div>
          </div>
          <button onClick={handleClose} disabled={stage === 'processing'} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px'
          }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '32px', minHeight: '300px' }}>
          
          {stage === 'upload' && (
            <div 
              style={{
                border: '2px dashed var(--accent-cyan)', borderRadius: '16px', padding: '60px 24px',
                textAlign: 'center', backgroundColor: 'rgba(0, 210, 255, 0.02)', cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls, .csv" 
                style={{ display: 'none' }} 
              />
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <Loader2 size={48} className="animate-spin" color="var(--accent-cyan)" />
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Lendo arquivo e mapeando colunas...</h3>
                </div>
              ) : (
                <>
                  <UploadCloud size={48} color="var(--accent-cyan)" style={{ margin: '0 auto 16px auto', opacity: 0.8 }} />
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Clique ou arraste sua planilha aqui</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '400px', marginInline: 'auto' }}>
                    O sistema identificará automaticamente as colunas de Empresas e Técnicos. Formatos aceitos: .xlsx, .xls, .csv
                  </p>
                </>
              )}
            </div>
          )}

          {stage === 'preview' && (
            <div style={{ animation: 'slideUp 0.3s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{stats.totalRows}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Linhas Lidas</div>
                </div>
                <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{stats.empresasFound}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Novas Empresas</div>
                </div>
                <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{stats.tecnicosFound}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Novos Técnicos</div>
                </div>
                <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', border: stats.duplicates > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-yellow)' }}>{stats.duplicates}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duplicados</div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ marginBottom: '12px', fontSize: '1rem' }}>Estratégia para registros duplicados:</h4>
                <div className="input-group">
                  <label>Comportamento para Empresas já Cadastradas (CNPJ igual)</label>
                  <select 
                    value={conflictStrategy} 
                    onChange={(e) => setConflictStrategy(e.target.value as any)}
                    className="input-field"
                    style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                  >
                    <option value="ignore">Ignorar Empresa (só importar se for nova)</option>
                    <option value="update">Atualizar dados da Empresa com os da planilha</option>
                    <option value="update_link">Atualizar dados da Empresa E adicionar o Técnico a ela</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginTop: '16px' }}>
                  <label>Vincular Empresas Importadas a qual Filial? (Opcional)</label>
                  <select 
                    value={selectedFilial} 
                    onChange={(e) => setSelectedFilial(e.target.value)}
                    className="input-field"
                    style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                  >
                    <option value="">Não vincular a nenhuma filial</option>
                    {filiais.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.branch ? `- ${f.branch}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                <button onClick={() => setStage('upload')} className="btn btn-secondary">Cancelar</button>
                <button onClick={executeImport} className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Play size={18} /> Iniciar Importação
                </button>
              </div>
            </div>
          )}

          {stage === 'processing' && (
            <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'pulse 2s infinite' }}>
              <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px auto' }}>
                <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(0, 210, 255, 0.2)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--accent-cyan)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileSpreadsheet size={32} color="var(--accent-cyan)" />
                </div>
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Processando Lotes...</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Isso pode levar alguns segundos dependendo do tamanho do arquivo. Por favor, aguarde.</p>
            </div>
          )}

          {stage === 'report' && (
            <div style={{ animation: 'slideUp 0.3s ease', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                <CheckCircle2 size={48} color="var(--accent-green)" />
              </div>
              <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Importação Concluída</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>A operação durou {(report.timeMs / 1000).toFixed(1)} segundos.</p>

              <div className="glass-panel" style={{ padding: '24px', textAlign: 'left', marginBottom: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Empresas Criadas</span>
                    <span style={{ fontWeight: 'bold' }}>{report.empresasImportadas}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Técnicos Vinculados</span>
                    <span style={{ fontWeight: 'bold' }}>{report.tecnicosImportados}</span>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--accent-cyan)' }}>Registros Atualizados</span>
                    <span style={{ fontWeight: 'bold' }}>{report.atualizados}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--accent-yellow)' }}>Registros Ignorados</span>
                    <span style={{ fontWeight: 'bold' }}>{report.ignorados}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Erros Lógicos</span>
                  <span style={{ fontWeight: 'bold', color: report.erros > 0 ? 'var(--accent-red)' : '#fff' }}>{report.erros}</span>
                </div>
              </div>
              
              {report.importErrors && report.importErrors.length > 0 && (
                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-red)', fontSize: '0.9rem', textAlign: 'left' }}>Detalhes dos Erros:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'left' }}>
                    {report.importErrors.map((err, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {stats.errorDetails && stats.errorDetails.length > 0 && (
                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-red)', fontSize: '0.9rem' }}>Detalhes dos Erros:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--accent-red)', fontSize: '0.85rem' }}>
                    {stats.errorDetails.map((err: string, i: number) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>

              <button onClick={handleClose} className="btn btn-primary" style={{ width: '100%' }}>
                Finalizar e Voltar para Lista
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
