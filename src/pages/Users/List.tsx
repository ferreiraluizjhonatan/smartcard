import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, UserX, UserCheck, Trash2, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';

const UserRow = ({ user, depth, navigate, handleDeleteUser }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasSubordinates = user.subordinates && user.subordinates.length > 0;
  
  const colors = ['border-cyan', 'border-purple', 'border-yellow', 'border-green'];
  const colorClass = colors[(depth + 1) % colors.length];

  return (
    <React.Fragment>
      <tr style={{ borderBottom: '1px solid var(--border-color)', background: isOpen ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
        <td style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {hasSubordinates ? (
              <button 
                onClick={() => setIsOpen(!isOpen)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
            ) : (
              <div style={{ width: '26px' }}></div>
            )}
            <div>
              <div style={{ fontWeight: 500, color: hasSubordinates ? `var(--accent-${colorClass.split('-')[1]})` : 'inherit' }}>{user.full_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.matricula || 'Sem matrícula'}</div>
            </div>
          </div>
        </td>
        <td style={{ padding: '16px' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user.region_name || '-'}</span>
        </td>
        <td style={{ padding: '16px' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user.branch_name || '-'}</span>
        </td>
        <td style={{ padding: '16px' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user.companies?.name || 'Interno'}</span>
        </td>
        <td style={{ padding: '16px' }}>
          <span style={{ color: 'var(--accent-yellow)', fontWeight: 500, textTransform: 'capitalize' }}>
            {user.role.replace('_', ' ')}
          </span>
        </td>
        <td style={{ padding: '16px' }}>
          <div>{user.email || 'Sem e-mail'}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.telefone || 'Sem telefone'}</div>
        </td>
        <td style={{ padding: '16px' }}>
          {user.is_active ? (
            <span className="badge badge-green"><UserCheck size={12} style={{marginRight: 4}}/> Ativo</span>
          ) : (
            <span className="badge badge-red"><UserX size={12} style={{marginRight: 4}}/> Inativo</span>
          )}
        </td>
        <td style={{ padding: '16px', textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => navigate(`/users/${user.id}/edit`)} style={{ padding: '6px' }} title="Editar">
              <Edit2 size={16} />
            </button>
            <button className="btn btn-secondary" onClick={() => handleDeleteUser(user.id)} style={{ padding: '6px', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.3)' }} title="Excluir">
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
      
      {isOpen && hasSubordinates && (
        <tr>
          <td colSpan={8} style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.1)' }}>
            <div className={`neon-card ${colorClass}`} style={{ padding: 0 }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={16} color={`var(--accent-${colorClass.split('-')[1]})`} />
                  Equipe de: {user.full_name}
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Nome & Matrícula</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Regional</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Filial</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Empresa</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Cargo</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Contato</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.subordinates.map((sub: any) => (
                      <UserRow key={sub.id} user={sub} depth={depth + 1} navigate={navigate} handleDeleteUser={handleDeleteUser} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

export default function UsersList() {
  const [users, setUsers] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('user_profiles').select('*, companies:company_id(name)').order('created_at', { ascending: false });
    if (error) console.error("Error fetching users:", error);
    if (data) setUsers(data);
  };

  const handleDeleteUser = async (userId: string) => {
    if(!confirm("ATENÇÃO: Deseja realmente EXCLUIR este usuário? Essa ação apagará o acesso dele ao sistema definitivamente.")) return;
    
    const { error } = await supabase.rpc('delete_user_account', { target_user_id: userId });
    
    if (error) {
      alert("Erro ao excluir usuário: " + error.message);
    } else {
      alert("Usuário excluído com sucesso!");
      fetchUsers();
    }
  };

  const buildTree = (usersList: any[]) => {
    const userMap = new Map();
    usersList.forEach(u => userMap.set(u.id, { ...u, subordinates: [] }));

    const tree: any[] = [];
    userMap.forEach(user => {
      if (user.supervisor_id && userMap.has(user.supervisor_id)) {
        userMap.get(user.supervisor_id).subordinates.push(user);
      } else {
        tree.push(user);
      }
    });
    return tree;
  };

  const usersTree = buildTree(users);
  
  const rootManagers = usersTree.filter(u => u.subordinates.length > 0);
  const rootIndividuals = usersTree.filter(u => u.subordinates.length === 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Gestão de Usuários</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Equipe e técnicos vinculados</p>
        </div>
        <button className="btn-glow" onClick={() => navigate('/users/new')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Adicionar Usuário
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {rootManagers.map((manager, idx) => {
          const colors = ['border-cyan', 'border-purple', 'border-yellow', 'border-green'];
          const colorClass = colors[idx % colors.length];

          return (
            <div key={manager.id} className={`neon-card ${colorClass}`} style={{ padding: '0' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={20} color={`var(--accent-${colorClass.split('-')[1]})`} />
                  Equipe de: {manager.full_name}
                </h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {manager.subordinates.length} {manager.subordinates.length === 1 ? 'membro direto' : 'membros diretos'} na equipe
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                      <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Nome & Matrícula</th>
                      <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Regional</th>
                      <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Filial</th>
                      <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Empresa</th>
                      <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Cargo</th>
                      <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Contato</th>
                      <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    <UserRow user={manager} depth={0} navigate={navigate} handleDeleteUser={handleDeleteUser} />
                    {manager.subordinates.map((sub: any) => (
                      <UserRow key={sub.id} user={sub} depth={1} navigate={navigate} handleDeleteUser={handleDeleteUser} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {rootIndividuals.length > 0 && (
          <div className="neon-card border-cyan" style={{ padding: '0' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="var(--accent-cyan)" />
                Outros Colaboradores / Diretoria
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Nome & Matrícula</th>
                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Regional</th>
                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Filial</th>
                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Empresa</th>
                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Cargo</th>
                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Contato</th>
                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rootIndividuals.map((u: any) => (
                    <UserRow key={u.id} user={u} depth={0} navigate={navigate} handleDeleteUser={handleDeleteUser} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {usersTree.length === 0 && (
          <div className="neon-card border-cyan" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Nenhum usuário encontrado na sua jurisdição.
          </div>
        )}
      </div>
    </div>
  );
}
