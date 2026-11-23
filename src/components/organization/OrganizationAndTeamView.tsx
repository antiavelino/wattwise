import React, { useState } from 'react';
import {
  Building2,
  Check,
  History,
  MailPlus,
  Plus,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { OrgRole } from '../../types/energy';
import { formatDateTimePtBr } from '../../utils/formatters';
import { Badge } from '../common/Badge';

const ROLE_LABELS: Record<OrgRole, { label: string; tone: 'emerald' | 'sky' | 'amber' | 'slate' }> =
  {
    owner: { label: 'Owner (Proprietário)', tone: 'emerald' },
    admin: { label: 'Admin (Administrador)', tone: 'sky' },
    operator: { label: 'Operator (Operador)', tone: 'amber' },
    viewer: { label: 'Viewer (Leitura)', tone: 'slate' },
  };

export const OrganizationView: React.FC = () => {
  const {
    activeOrganization,
    userOrganizations,
    activeRole,
    auditLogs,
    state,
    switchOrganization,
    createOrganization,
    updateSettings,
    workspaceMode,
    navigatePublic,
  } = useWattWise();

  const [orgName, setOrgName] = useState(
    activeOrganization?.name ?? state.settings.establishmentName,
  );
  const [timezone, setTimezone] = useState(
    activeOrganization?.timezone ?? 'America/Sao_Paulo',
  );
  const [newOrgName, setNewOrgName] = useState('');

  const canEditOrg = activeRole === 'owner' || activeRole === 'admin';

  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    updateSettings({
      establishmentName: orgName.trim(),
      tariffPerKwh: state.settings.tariffPerKwh,
      anomalyThresholdPercent: state.settings.anomalyThresholdPercent,
      timezone,
    });
  };

  const handleCreateNewOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      createOrganization({
        name: newOrgName.trim(),
        timezone: 'America/Sao_Paulo',
      });
      setNewOrgName('');
    } catch {
      // Tratado via toast no contexto
    }
  };

  return (
    <div className="view-stack">
      {workspaceMode === 'demo' && (
        <div className="demo-banner">
          <div className="demo-banner-main">
            <Building2 size={16} className="demo-banner-icon" />
            <p className="demo-banner-text">
              <strong>Modo Demonstrativo:</strong> Crie uma conta gratuita para gerenciar múltiplas
              organizações e trilhas de auditoria reais.
            </p>
          </div>
          <button
            type="button"
            className="demo-banner-action"
            onClick={() => navigatePublic('register')}
          >
            Criar conta SaaS
          </button>
        </div>
      )}

      <div className="dashboard-split">
        {/* Identificação da Organização Ativa */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Dados da Organização Ativa</h2>
              <p className="panel-subtitle">
                Identificação corporativa, fuso horário e nível de permissão atual
              </p>
            </div>
            <Badge tone={ROLE_LABELS[activeRole].tone}>{ROLE_LABELS[activeRole].label}</Badge>
          </div>

          <div className="data-status-summary">
            <div className="data-status-row">
              <span>Identificador (Slug)</span>
              <strong className="tabular-nums">
                {activeOrganization?.slug ?? 'mercato-cafe-demo'}
              </strong>
            </div>
            <div className="data-status-row">
              <span>Data de criação</span>
              <strong className="tabular-nums">
                {formatDateTimePtBr(activeOrganization?.createdAt)}
              </strong>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleSaveOrg}>
            <div className="form-field">
              <label htmlFor="org-edit-name" className="form-label">
                Razão social / Nome da empresa
              </label>
              <input
                id="org-edit-name"
                type="text"
                className="form-input"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!canEditOrg}
              />
            </div>

            <div className="form-field">
              <label htmlFor="org-edit-tz" className="form-label">
                Fuso horário operacional
              </label>
              <select
                id="org-edit-tz"
                className="form-input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!canEditOrg}
              >
                <option value="America/Sao_Paulo">America/Sao_Paulo (BRT / UTC-3)</option>
                <option value="America/Manaus">America/Manaus (AMT / UTC-4)</option>
                <option value="America/Cuiaba">America/Cuiaba (AMT / UTC-4)</option>
                <option value="America/Fortaleza">America/Fortaleza (BRT / UTC-3)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={!canEditOrg}>
              <Check size={15} />
              <span>Salvar dados da organização</span>
            </button>
          </form>
        </section>

        {/* Alternância Multi-Tenant de Organizações */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Suas Organizações ({userOrganizations.length || 1})</h2>
              <p className="panel-subtitle">
                Alterne entre empresas ou cadastre uma nova unidade com isolamento total de dados
              </p>
            </div>
            <Building2 size={18} className="panel-header-icon" />
          </div>

          {userOrganizations.length > 0 && (
            <ul className="org-switcher-list">
              {userOrganizations.map(({ organization, role }) => {
                const isCurrent = organization.id === activeOrganization?.id;
                return (
                  <li
                    key={organization.id}
                    className={`org-switcher-item ${isCurrent ? 'org-switcher-item--active' : ''}`}
                  >
                    <div>
                      <strong>{organization.name}</strong>
                      <span className="cell-sub">
                        Slug: {organization.slug} · Função: {role.toUpperCase()}
                      </span>
                    </div>
                    {isCurrent ? (
                      <Badge tone="emerald">Ambiente Ativo</Badge>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => switchOrganization(organization.id)}
                      >
                        Alternar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {workspaceMode === 'saas' && (
            <form className="form-stack" onSubmit={handleCreateNewOrg} style={{ marginTop: 12 }}>
              <div className="form-field">
                <label htmlFor="new-org-name" className="form-label">
                  Criar nova organização / filial
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    id="new-org-name"
                    type="text"
                    className="form-input"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Ex.: Filial Zona Sul"
                  />
                  <button type="submit" className="btn btn-secondary">
                    <Plus size={15} />
                    <span>Criar unidade</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>
      </div>

      {/* Trilha de Auditoria (Audit Logs) */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Trilha de Auditoria (Audit Logs)</h2>
            <p className="panel-subtitle">
              Registro cronológico de criações, edições, exclusões, convites e mudanças de
              permissões nesta organização
            </p>
          </div>
          <History size={18} className="panel-header-icon" />
        </div>

        {auditLogs.length === 0 ? (
          <p className="form-hint">
            Nenhum evento de auditoria registrado nesta sessão. As operações executadas na
            organização aparecem automaticamente aqui.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 30).map((log) => (
                  <tr key={log.id}>
                    <td className="tabular-nums">{formatDateTimePtBr(log.createdAt)}</td>
                    <td className="cell-strong">{log.actorName}</td>
                    <td>
                      <Badge tone="slate">{log.action}</Badge>
                    </td>
                    <td>{log.entityType}</td>
                    <td>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export const TeamView: React.FC = () => {
  const {
    members,
    invitations,
    activeRole,
    currentUser,
    inviteMember,
    updateMemberRole,
    removeMember,
    workspaceMode,
  } = useWattWise();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('operator');

  const canManageTeam = activeRole === 'owner' || activeRole === 'admin';

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMember({ email: inviteEmail.trim(), role: inviteRole });
    setInviteEmail('');
  };

  return (
    <div className="view-stack">
      <div className="dashboard-split">
        {/* Formulário de Convite */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Convidar Membro para a Equipe</h2>
              <p className="panel-subtitle">
                Membros ativos na organização: {members.length}
              </p>
            </div>
            <MailPlus size={18} className="panel-header-icon" />
          </div>

          <form className="form-stack" onSubmit={handleInvite}>
            <div className="form-field">
              <label htmlFor="team-email" className="form-label">
                E-mail do colaborador
              </label>
              <input
                id="team-email"
                type="email"
                className="form-input"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colaborador@empresa.com.br"
                disabled={!canManageTeam || workspaceMode === 'demo'}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="team-role" className="form-label">
                Nível de acesso (RBAC)
              </label>
              <select
                id="team-role"
                className="form-input"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                disabled={!canManageTeam || workspaceMode === 'demo'}
              >
                <option value="viewer">Viewer — Somente leitura de indicadores e relatórios</option>
                <option value="operator">
                  Operator — Cadastro de equipamentos, medições e tratativa de alertas
                </option>
                <option value="admin">
                  Admin — Gestão operacional, configurações e membros
                </option>
                {activeRole === 'owner' && (
                  <option value="owner">Owner — Controle total da organização</option>
                )}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canManageTeam || workspaceMode === 'demo'}
            >
              <MailPlus size={15} />
              <span>Adicionar ou registrar convite</span>
            </button>
          </form>

          <p className="form-hint">
            Nota sobre envio de e-mail: quando o colaborador já possui conta, o vínculo é imediato.
            Caso ainda não possua, o convite fica salvo e é ativado automaticamente assim que ele
            se cadastrar com o mesmo e-mail (o disparo externo via SMTP depende das variáveis{' '}
            <code>SMTP_*</code> na Edge Function <code>team-invite</code>).
          </p>
        </section>

        {/* Matriz de Permissões RBAC */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Matriz de Permissões no Banco (RLS / RBAC)</h2>
              <p className="panel-subtitle">
                Todas as operações são validadas antes da persistência
              </p>
            </div>
            <Shield size={18} className="panel-header-icon" />
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Operação</th>
                  <th>Viewer</th>
                  <th>Operator</th>
                  <th>Admin</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Consultar Dashboard e Relatórios</td>
                  <td>Sim</td>
                  <td>Sim</td>
                  <td>Sim</td>
                  <td>Sim</td>
                </tr>
                <tr>
                  <td>Cadastrar/Editar Equipamentos e Medições</td>
                  <td>Não</td>
                  <td>Sim</td>
                  <td>Sim</td>
                  <td>Sim</td>
                </tr>
                <tr>
                  <td>Reconhecer e Resolver Alertas</td>
                  <td>Não</td>
                  <td>Sim</td>
                  <td>Sim</td>
                  <td>Sim</td>
                </tr>
                <tr>
                  <td>Alterar Tarifa e Limite de Alertas</td>
                  <td>Não</td>
                  <td>Não</td>
                  <td>Sim</td>
                  <td>Sim</td>
                </tr>
                <tr>
                  <td>Gerenciar Equipe (Operator/Viewer)</td>
                  <td>Não</td>
                  <td>Não</td>
                  <td>Sim</td>
                  <td>Sim</td>
                </tr>
                <tr>
                  <td>Gerenciar Owners da Organização</td>
                  <td>Não</td>
                  <td>Não</td>
                  <td>Não</td>
                  <td>Sim</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Lista de Membros da Organização */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Membros Ativos ({members.length})</h2>
            <p className="panel-subtitle">
              Usuários com acesso autorizado ao ambiente desta organização
            </p>
          </div>
          <Users size={18} className="panel-header-icon" />
        </div>

        {members.length === 0 ? (
          <p className="form-hint">
            Modo demonstrativo ativo. Crie uma organização SaaS para visualizar e gerenciar membros.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Função</th>
                  <th>Ingresso</th>
                  <th className="text-right">Gerenciar</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isSelf = m.userId === currentUser?.id;
                  return (
                    <tr key={m.id}>
                      <td className="cell-strong">
                        {m.fullName} {isSelf && <Badge tone="emerald">Você</Badge>}
                      </td>
                      <td>{m.email}</td>
                      <td>
                        {canManageTeam ? (
                          <select
                            className="form-input form-input--compact"
                            value={m.role}
                            onChange={(e) => updateMemberRole(m.id, e.target.value as OrgRole)}
                            aria-label={`Alterar função de ${m.fullName}`}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="operator">Operator</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        ) : (
                          <Badge tone={ROLE_LABELS[m.role].tone}>{m.role.toUpperCase()}</Badge>
                        )}
                      </td>
                      <td className="tabular-nums">{formatDateTimePtBr(m.joinedAt)}</td>
                      <td className="text-right">
                        {canManageTeam && !isSelf && (
                          <button
                            type="button"
                            className="icon-btn icon-btn--danger"
                            onClick={() => removeMember(m.id)}
                            title={`Remover ${m.fullName}`}
                            aria-label={`Remover ${m.fullName}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {invitations.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <h3 className="panel-title" style={{ fontSize: 14, marginBottom: 10 }}>
              Convites Pendentes ({invitations.length})
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>E-mail convidado</th>
                    <th>Função atribuída</th>
                    <th>Status</th>
                    <th>Envio SMTP</th>
                    <th>Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td className="cell-strong">{inv.email}</td>
                      <td>{inv.role.toUpperCase()}</td>
                      <td>
                        <Badge tone={inv.status === 'accepted' ? 'emerald' : 'amber'}>
                          {inv.status === 'accepted' ? 'Aceito' : 'Aguardando cadastro'}
                        </Badge>
                      </td>
                      <td>
                        <Badge tone="slate">
                          {inv.emailSent ? 'Enviado' : 'Vínculo local (SMTP pendente)'}
                        </Badge>
                      </td>
                      <td className="tabular-nums">{formatDateTimePtBr(inv.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
