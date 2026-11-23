import { describe, expect, it } from 'vitest';
import {
  completePasswordRecovery,
  createEmptySaasDatabase,
  createEquipmentInOrg,
  createReadingInOrg,
  deleteEquipmentInOrg,
  deleteReadingInOrg,
  inviteMemberToOrganization,
  loginUserAccount,
  logoutUserAccount,
  queryOrganizationData,
  registerUserAccount,
  removeMemberFromOrganization,
  requestPasswordRecoveryOtp,
  resetUserPassword,
  updateAlertStatusInOrg,
  updateEquipmentInOrg,
  updateMemberRoleInOrganization,
  updateOrganizationSettingsInOrg,
  verifyPasswordRecoveryOtp,
} from '../storage/saasRepository';

describe('Autenticação e Ciclo de Vida de Conta', () => {
  it('registra usuário, rejeita e-mail duplicado, autentica, rejeita senha inválida, redefine senha e faz logout', () => {
    let db = createEmptySaasDatabase();

    // Registro inicial
    const reg = registerUserAccount(db, {
      fullName: 'Ana Martins',
      email: 'ana@empresa.com.br',
      password: 'Password123',
      organizationName: 'Martins Energia',
    });
    db = reg.db;

    expect(reg.user.email).toBe('ana@empresa.com.br');
    expect(reg.organization).toBeDefined();
    expect(db.currentSessionUserId).toBe(reg.user.id);

    // Rejeita e-mail duplicado (case-insensitive)
    expect(() =>
      registerUserAccount(db, {
        fullName: 'Ana Duplicada',
        email: 'ANA@empresa.com.br',
        password: 'Password123',
      }),
    ).toThrow(/Já existe uma conta cadastrada/);

    // Logout
    db = logoutUserAccount(db);
    expect(db.currentSessionUserId).toBeNull();

    // Rejeita credenciais inválidas
    expect(() =>
      loginUserAccount(db, {
        email: 'ana@empresa.com.br',
        password: 'WrongPassword',
      }),
    ).toThrow(/Credenciais inválidas/);

    // Login com senha correta
    const login = loginUserAccount(db, {
      email: 'ana@empresa.com.br',
      password: 'Password123',
    });
    db = login.db;
    expect(db.currentSessionUserId).toBe(reg.user.id);

    // Redefinição de senha
    db = resetUserPassword(db, {
      email: 'ana@empresa.com.br',
      newPassword: 'NewSecurePassword99',
    });

    // Senha antiga não funciona mais
    expect(() =>
      loginUserAccount(db, {
        email: 'ana@empresa.com.br',
        password: 'Password123',
      }),
    ).toThrow(/Credenciais inválidas/);

    // Nova senha autentica com sucesso
    const loginAfterReset = loginUserAccount(db, {
      email: 'ana@empresa.com.br',
      password: 'NewSecurePassword99',
    });
    expect(loginAfterReset.user.id).toBe(reg.user.id);
  });
});

describe('Isolamento Multitenant e Proteção contra Spoofing Cross-Tenant (RLS)', () => {
  it('isola completamente dados da Empresa A e Empresa B e bloqueia spoofing de organization_id', () => {
    let db = createEmptySaasDatabase();

    // Cria User A (Owner da Empresa A)
    const regA = registerUserAccount(db, {
      fullName: 'Roberto Owner A',
      email: 'roberto@empresaa.com.br',
      password: 'PasswordA123',
      organizationName: 'Empresa A',
    });
    db = regA.db;
    const userA = regA.user;
    const orgA = regA.organization!;

    // Cria User B (Owner da Empresa B)
    const regB = registerUserAccount(db, {
      fullName: 'Lucia Owner B',
      email: 'lucia@empresab.com.br',
      password: 'PasswordB123',
      organizationName: 'Empresa B',
    });
    db = regB.db;
    const userB = regB.user;
    const orgB = regB.organization!;

    // Popula Empresa A
    const eqARes = createEquipmentInOrg(db, userA.id, orgA.id, {
      name: 'Compressor Empresa A',
      category: 'Maquinário',
      powerWatts: 3000,
      status: 'active',
    });
    db = eqARes.db;

    const readARes = createReadingInOrg(db, userA.id, orgA.id, {
      date: '2026-03-01',
      consumptionKwh: 45.2,
    });
    db = readARes.db;

    // Popula Empresa B
    const eqBRes = createEquipmentInOrg(db, userB.id, orgB.id, {
      name: 'Forno Industrial Empresa B',
      category: 'Maquinário',
      powerWatts: 8000,
      status: 'active',
    });
    db = eqBRes.db;

    const readBRes = createReadingInOrg(db, userB.id, orgB.id, {
      date: '2026-03-01',
      consumptionKwh: 120.5,
    });
    db = readBRes.db;

    // Verifica que a consulta da Empresa A retorna apenas registros da Empresa A
    const dataA = queryOrganizationData(db, userA.id, orgA.id);
    expect(dataA.equipment).toHaveLength(1);
    expect(dataA.equipment[0].id).toBe(eqARes.equipment.id);
    expect(dataA.readings).toHaveLength(1);
    expect(dataA.readings[0].id).toBe(readARes.reading.id);

    // User A NÃO pode consultar dados da Empresa B
    expect(() => queryOrganizationData(db, userA.id, orgB.id)).toThrow(/Acesso negado \(RLS\)/);

    // User A NÃO pode editar ou excluir equipamento da Empresa B (nem passando orgB.id nem passando orgA.id com equipmentId de B)
    expect(() =>
      updateEquipmentInOrg(db, userA.id, orgB.id, eqBRes.equipment.id, {
        name: 'Sabotagem',
        category: 'Outros',
        powerWatts: 100,
        status: 'inactive',
      }),
    ).toThrow(/Acesso negado \(RLS\)/);

    expect(() =>
      updateEquipmentInOrg(db, userA.id, orgA.id, eqBRes.equipment.id, {
        name: 'Sabotagem via Org A',
        category: 'Outros',
        powerWatts: 100,
        status: 'inactive',
      }),
    ).toThrow(/Acesso negado \(RLS\)/);

    expect(() => deleteEquipmentInOrg(db, userA.id, orgA.id, eqBRes.equipment.id)).toThrow(
      /Acesso negado \(RLS\)/,
    );

    // User A NÃO pode excluir leitura da Empresa B
    expect(() => deleteReadingInOrg(db, userA.id, orgB.id, readBRes.reading.id)).toThrow(
      /Acesso negado \(RLS\)/,
    );
    expect(() => deleteReadingInOrg(db, userA.id, orgA.id, readBRes.reading.id)).toThrow(
      /Acesso negado \(RLS\)/,
    );

    // Tentativa de spoofing cross-tenant (targetOrganizationId: orgB.id autenticado em orgA.id)
    expect(() =>
      createEquipmentInOrg(db, userA.id, orgA.id, {
        name: 'Equipamento Spoofed',
        category: 'Outros',
        powerWatts: 500,
        status: 'active',
        targetOrganizationId: orgB.id,
      }),
    ).toThrow(/Violação de segurança \(RLS WITH CHECK\)/);

    expect(() =>
      createReadingInOrg(db, userA.id, orgA.id, {
        date: '2026-03-02',
        consumptionKwh: 99,
        targetOrganizationId: orgB.id,
      }),
    ).toThrow(/Violação de segurança \(RLS WITH CHECK\)/);
  });
});

describe('Controle de Acesso Baseado em Função (RBAC)', () => {
  it('aplica permissões granulares para owner, admin, operator e viewer', () => {
    let db = createEmptySaasDatabase();

    // Cria Owner da Empresa A (plano Pro permite até 5 membros)
    const ownerReg = registerUserAccount(db, {
      fullName: 'Owner Principal',
      email: 'owner@empresa.com',
      password: 'Password123',
      organizationName: 'Empresa RBAC',
    });
    db = ownerReg.db;
    const owner = ownerReg.user;
    const org = ownerReg.organization!;

    // Cria contas para Admin, Operator e Viewer
    const adminReg = registerUserAccount(db, {
      fullName: 'Carla Admin',
      email: 'admin@empresa.com',
      password: 'Password123',
    });
    db = adminReg.db;
    const adminUser = adminReg.user;

    const operatorReg = registerUserAccount(db, {
      fullName: 'Pedro Operator',
      email: 'operator@empresa.com',
      password: 'Password123',
    });
    db = operatorReg.db;
    const operatorUser = operatorReg.user;

    const viewerReg = registerUserAccount(db, {
      fullName: 'Julia Viewer',
      email: 'viewer@empresa.com',
      password: 'Password123',
    });
    db = viewerReg.db;
    const viewerUser = viewerReg.user;

    // Owner convida Admin
    db = inviteMemberToOrganization(db, owner.id, org.id, {
      email: adminUser.email,
      role: 'admin',
    }).db;

    // Admin convida Operator e Viewer
    db = inviteMemberToOrganization(db, adminUser.id, org.id, {
      email: operatorUser.email,
      role: 'operator',
    }).db;

    db = inviteMemberToOrganization(db, adminUser.id, org.id, {
      email: viewerUser.email,
      role: 'viewer',
    }).db;

    // 1. Viewer PODE ler dados, mas NÃO PODE criar/editar/excluir equipamentos ou medições nem alterar configurações
    const viewerData = queryOrganizationData(db, viewerUser.id, org.id);
    expect(viewerData.role).toBe('viewer');

    expect(() =>
      createEquipmentInOrg(db, viewerUser.id, org.id, {
        name: 'Tentativa Viewer',
        category: 'Iluminação',
        powerWatts: 100,
        status: 'active',
      }),
    ).toThrow(/Permissão insuficiente \(RBAC\)/);

    expect(() =>
      createReadingInOrg(db, viewerUser.id, org.id, {
        date: '2026-03-01',
        consumptionKwh: 15,
      }),
    ).toThrow(/Permissão insuficiente \(RBAC\)/);

    expect(() =>
      updateOrganizationSettingsInOrg(db, viewerUser.id, org.id, {
        establishmentName: 'Hack Viewer',
        tariffPerKwh: 0.5,
        anomalyThresholdPercent: 50,
      }),
    ).toThrow(/Permissão insuficiente \(RBAC\)/);

    // 2. Operator PODE criar/editar equipamentos, registrar leituras e reconhecer alertas
    const opEq = createEquipmentInOrg(db, operatorUser.id, org.id, {
      name: 'Bancada LED',
      category: 'Iluminação',
      powerWatts: 400,
      status: 'active',
    });
    db = opEq.db;

    db = updateEquipmentInOrg(db, operatorUser.id, org.id, opEq.equipment.id, {
      name: 'Bancada LED Atualizada',
      category: 'Iluminação',
      powerWatts: 450,
      status: 'active',
    });

    const opRead = createReadingInOrg(db, operatorUser.id, org.id, {
      date: '2026-03-01',
      consumptionKwh: 22.5,
    });
    db = opRead.db;

    db = updateAlertStatusInOrg(db, operatorUser.id, org.id, 'anomaly_test', 'acknowledged');
    expect(db.alertStatesByOrg[org.id]['anomaly_test'].status).toBe('acknowledged');

    // Viewer também NÃO pode editar ou excluir o equipamento criado pelo Operator
    expect(() =>
      updateEquipmentInOrg(db, viewerUser.id, org.id, opEq.equipment.id, {
        name: 'Viewer Edit',
        category: 'Iluminação',
        powerWatts: 450,
        status: 'active',
      }),
    ).toThrow(/Permissão insuficiente \(RBAC\)/);

    expect(() => deleteEquipmentInOrg(db, viewerUser.id, org.id, opEq.equipment.id)).toThrow(
      /Permissão insuficiente \(RBAC\)/,
    );

    expect(() => deleteReadingInOrg(db, viewerUser.id, org.id, opRead.reading.id)).toThrow(
      /Permissão insuficiente \(RBAC\)/,
    );

    // Operator NÃO PODE alterar configurações administrativas nem convidar membros
    expect(() =>
      updateOrganizationSettingsInOrg(db, operatorUser.id, org.id, {
        establishmentName: 'Alterado por Operador',
        tariffPerKwh: 1.2,
        anomalyThresholdPercent: 30,
      }),
    ).toThrow(/Permissão insuficiente \(RBAC\)/);

    expect(() =>
      inviteMemberToOrganization(db, operatorUser.id, org.id, {
        email: 'novo@empresa.com',
        role: 'viewer',
      }),
    ).toThrow(/Permissão insuficiente \(RBAC\)/);

    // 3. Admin PODE atualizar configurações da organização, mas NÃO PODE rebaixar ou remover um Owner
    db = updateOrganizationSettingsInOrg(db, adminUser.id, org.id, {
      establishmentName: 'Empresa RBAC Oficial',
      tariffPerKwh: 0.98,
      anomalyThresholdPercent: 25,
    });
    expect(db.settingsByOrg[org.id].tariffPerKwh).toBe(0.98);

    const ownerMembership = db.members.find(
      (m) => m.organizationId === org.id && m.userId === owner.id,
    )!;

    expect(() =>
      updateMemberRoleInOrganization(db, adminUser.id, org.id, ownerMembership.id, 'admin'),
    ).toThrow(/Somente um Owner pode alterar a função de outro Owner/);

    expect(() =>
      removeMemberFromOrganization(db, adminUser.id, org.id, ownerMembership.id),
    ).toThrow(/Somente um Owner pode remover outro Owner/);
  });
});

describe('Recuperação de Senha com Código OTP de 6 Dígitos', () => {
  it('gera código OTP de 6 dígitos, rejeita código incorreto ou expirado, valida e conclui redefinição', () => {
    let db = createEmptySaasDatabase();

    // Cria conta de teste
    const reg = registerUserAccount(db, {
      fullName: 'Carlos Engenheiro',
      email: 'carlos@wattwise.local',
      password: 'InitialPassword123',
      organizationName: 'EcoTech Lab',
    });
    db = reg.db;

    // 1. Rejeita e-mail inválido
    expect(() => requestPasswordRecoveryOtp(db, 'email-invalido')).toThrow(
      /Informe um endereço de e-mail válido/,
    );

    // 2. Rejeita conta não encontrada
    expect(() => requestPasswordRecoveryOtp(db, 'inexistente@wattwise.local')).toThrow(
      /Nenhuma conta encontrada/,
    );

    // 3. Solicita OTP para e-mail existente
    const otpRes = requestPasswordRecoveryOtp(db, 'carlos@wattwise.local');
    db = otpRes.db;
    const generatedOtp = otpRes.otpCode;

    expect(generatedOtp).toMatch(/^\d{6}$/);
    expect(db.recoveryChallenges?.['carlos@wattwise.local']).toBeDefined();
    expect(db.recoveryChallenges?.['carlos@wattwise.local'].verified).toBe(false);

    // 4. Tentativa com código errado
    expect(() =>
      verifyPasswordRecoveryOtp(db, 'carlos@wattwise.local', '000000'),
    ).toThrow(/Código de verificação incorreto/);

    // 5. Tentativa com comprimento inválido
    expect(() =>
      verifyPasswordRecoveryOtp(db, 'carlos@wattwise.local', '123'),
    ).toThrow(/Código de verificação incorreto/);

    // 6. Tentativa de redefinir senha sem antes verificar OTP
    expect(() =>
      completePasswordRecovery(db, 'carlos@wattwise.local', 'NovaSenhaValida99'),
    ).toThrow(/É necessário validar o código OTP/);

    // 7. Validação bem-sucedida do código correto
    const verifyRes = verifyPasswordRecoveryOtp(db, 'carlos@wattwise.local', generatedOtp);
    db = verifyRes.db;
    expect(verifyRes.valid).toBe(true);
    expect(db.recoveryChallenges?.['carlos@wattwise.local'].verified).toBe(true);

    // 8. Conclusão da redefinição
    db = completePasswordRecovery(db, 'carlos@wattwise.local', 'NovaSenhaValida99');

    // Desafio deve ser limpo após conclusão
    expect(db.recoveryChallenges?.['carlos@wattwise.local']).toBeUndefined();

    // 9. Login com senha antiga falha
    expect(() =>
      loginUserAccount(db, {
        email: 'carlos@wattwise.local',
        password: 'InitialPassword123',
      }),
    ).toThrow(/Credenciais inválidas/);

    // 10. Login com nova senha é bem-sucedido
    const nextLogin = loginUserAccount(db, {
      email: 'carlos@wattwise.local',
      password: 'NovaSenhaValida99',
    });
    expect(nextLogin.user.id).toBe(reg.user.id);
  });
});
