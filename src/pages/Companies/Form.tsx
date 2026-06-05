import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';

export default function CompaniesForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [formData, setFormData] = useState({
    name: '', region: '', branch: '', supervisor_id: ''
  });
  const [supervisors, setSupervisors] = useState<any[]>([]);

  useEffect(() => {
    // Buscar supervisores para o dropdown
    supabase.from('user_profiles')
      .select('id, full_name, role')
      .in('role', ['supervisor', 'gerente_regional'])
      .order('full_name')
      .then(({data}) => {
        if(data) setSupervisors(data);
      });

    if (id) {
      supabase.from('companies').select('*').eq('id', id).single().then(({data}) => {
        if(data) setFormData({
          name: data.name || '',
          region: data.region || '',
          branch: data.branch || '',
          supervisor_id: data.supervisor_id || ''
        });
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (id) {
      const { error } = await supabase.from('companies').update({
        name: formData.name,
        region: formData.region,
        branch: formData.branch,
        supervisor_id: formData.supervisor_id || null
      }).eq('id', id);

      if (error) alert(error.message);
      else navigate('/companies');
    } else {
      const { error } = await supabase.from('companies').insert([{
        name: formData.name,
        region: formData.region,
        branch: formData.branch,
        supervisor_id: formData.supervisor_id || null
      }]);

      if (error) alert(error.message);
      else navigate('/companies');
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '24px' }}>
        {id ? 'Editar Empresa' : 'Nova Empresa Parceira'}
      </h2>
      
      <div className="neon-card border-cyan">
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          <div className="input-group">
            <label>Nome da Empresa *</label>
            <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="input-group">
            <label>Região</label>
            <input type="text" className="input-field" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} />
          </div>

          <div className="input-group">
            <label>Filial</label>
            <input type="text" className="input-field" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} />
          </div>

          <div className="input-group">
            <label>Supervisor Responsável</label>
            <select className="select-field" value={formData.supervisor_id} onChange={e => setFormData({...formData, supervisor_id: e.target.value})}>
              <option value="">Selecione um supervisor...</option>
              {supervisors.map(sup => (
                <option key={sup.id} value={sup.id}>{sup.full_name} ({sup.role.replace('_', ' ')})</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/companies')}>Cancelar</button>
            <button type="submit" className="btn-glow">Salvar Empresa</button>
          </div>
        </form>
      </div>
    </div>
  );
}
