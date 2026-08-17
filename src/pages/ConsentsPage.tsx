import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  grantConsent,
  revokeConsent,
  getConsentAuthorizations,
} from '../api/consent';
import { createUser, listUsers, deactivateUser } from '../api/user';
import { ProofBanner } from '../components/ProofBanner';
import type {
  CreateUserCommand,
  ConsentAuthorizationDetail,
  GrantConsentRequest,
} from '../types';

const DATA_CATEGORIES = ['PERSONAL_DATA', 'CONTRACT_DATA', 'USAGE_DATA', 'FINANCIAL_DATA'] as const;
const PURPOSES = ['BILLING', 'PROMOTION', 'ANALYTICS'] as const;

export function ConsentsPage() {
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserCommand>({
    fullName: '',
    email: '',
    documentNumber: '',
    birthDate: '',
  });
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers().then((r) => r.data),
    retry: false,
  });

  const authorizationsQ = useQuery({
    queryKey: ['consents', selectedUserId],
    queryFn: () => getConsentAuthorizations(Number(selectedUserId)).then((r) => r.data),
    enabled: selectedUserId !== '',
    retry: false,
  });

  const grantMut = useMutation({
    mutationFn: (data: GrantConsentRequest) => grantConsent(data),
    onSuccess: () => {
      authorizationsQ.refetch();
      setChecked({});
    },
  });

  const deactivateMut = useMutation({
    mutationFn: async (data: { ownerId: number }) => {
      const granted = (authorizationsQ.data?.authorizations ?? []).filter((a) => a.status === 'GRANTED');
      for (const auth of granted) {
        await revokeConsent(data.ownerId, {
          ownerId: data.ownerId,
          authorizations: [{ dataCategory: auth.dataCategory, purposes: [auth.purpose] }],
          reason: 'USER_ACCOUNT_DEACTIVATED',
          issuedBy: { issuer: 'USER', id: data.ownerId },
        });
      }
    },
    onSuccess: () => authorizationsQ.refetch(),
  });

  const revokeSelectedMut = useMutation({
    mutationFn: async (data: { ownerId: number; authorizations: GrantConsentRequest['authorizations'] }) => {
      for (const auth of data.authorizations) {
        for (const purpose of auth.purposes) {
          await revokeConsent(data.ownerId, {
            ownerId: data.ownerId,
            authorizations: [{ dataCategory: auth.dataCategory, purposes: [purpose] }],
            reason: 'Revogado via console de auditoria',
            issuedBy: { issuer: 'USER', id: data.ownerId },
          });
        }
      }
    },
    onSuccess: () => {
      authorizationsQ.refetch();
      setChecked({});
    },
  });

  const deactivateUserMut = useMutation({
    mutationFn: async (userId: number) => {
      const granted = (authorizationsQ.data?.authorizations ?? []).filter((a) => a.status === 'GRANTED');
      for (const auth of granted) {
        await revokeConsent(userId, {
          ownerId: userId,
          authorizations: [{ dataCategory: auth.dataCategory, purposes: [auth.purpose] }],
          reason: 'USER_ACCOUNT_DEACTIVATED',
          issuedBy: { issuer: 'USER', id: userId },
        });
      }
      await deactivateUser(userId);
    },
    onSuccess: () => {
      usersQ.refetch();
      authorizationsQ.refetch();
      setSelectedUserId('');
      setChecked({});
    },
  });

  const createUserMut = useMutation({
    mutationFn: (data: CreateUserCommand) => createUser(data),
    onSuccess: () => {
      usersQ.refetch();
      setShowCreateUser(false);
      setNewUser({ fullName: '', email: '', documentNumber: '', birthDate: '' });
    },
  });

  const authorizations = authorizationsQ.data?.authorizations ?? [];
  const selectedUser = usersQ.data?.find((u) => u.id === selectedUserId);
  const isDeactivated = selectedUser !== undefined && !selectedUser.active;

  const toggle = (cat: string, pur: string) => {
    const key = `${cat}|${pur}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGrant = () => {
    if (selectedUserId === '') return;
    const auths = buildAuths();
    if (auths.length === 0) return;
    grantMut.mutate({
      ownerId: Number(selectedUserId),
      authorizations: auths,
      legalBasis: 'CONSENT',
      issuedBy: { issuer: 'USER', id: Number(selectedUserId) },
    });
  };

  const handleRevokeSelected = () => {
    if (selectedUserId === '') return;
    const auths = buildAuths();
    if (auths.length === 0) return;
    revokeSelectedMut.mutate({
      ownerId: Number(selectedUserId),
      authorizations: auths,
    });
  };

  const buildAuths = (): GrantConsentRequest['authorizations'] => {
    const auths: GrantConsentRequest['authorizations'] = [];
    for (const cat of DATA_CATEGORIES) {
      const purposes = PURPOSES.filter((p) => checked[`${cat}|${p}`]);
      if (purposes.length > 0) {
        auths.push({ dataCategory: cat, purposes });
      }
    }
    return auths;
  };

  const checkedCount = Object.values(checked).filter(Boolean).length;

  const isDeactivatedError =
    grantMut.isError &&
    grantMut.error instanceof Error &&
    grantMut.error.message.includes('deactivated');

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Consentimentos</h2>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={selectedUserId}
          onChange={(e) => {
            setSelectedUserId(e.target.value ? Number(e.target.value) : '');
            setChecked({});
          }}
        >
          <option value="">Selecione um usuário</option>
          {usersQ.data?.map((u) => (
            <option key={u.id} value={u.id} disabled={!u.active}>
              #{u.id} — {u.fullName}{!u.active ? ' (INATIVO)' : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowCreateUser((v) => !v)}
          className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          + Criar Usuário
        </button>

        {selectedUserId !== '' && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Desativar este titular? Isso revogará todos os consentimentos dele e impedirá novos consentimentos.')) {
                deactivateUserMut.mutate(Number(selectedUserId));
              }
            }}
            disabled={deactivateUserMut.isPending || isDeactivated}
            className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            {deactivateUserMut.isPending ? 'Desativando...' : 'Desativar Titular'}
          </button>
        )}
      </div>

      {usersQ.isError && (
        <ProofBanner
          isCompliant={false}
          title="Erro ao listar usuários"
          detail={usersQ.error instanceof Error ? usersQ.error.message : 'Consulte user-service.'}
        />
      )}

      {isDeactivated && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-amber-600">⚠</span>
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Titular desativado</h3>
              <p className="text-xs text-amber-700">
                Este titular foi desativado. Todos os consentimentos foram revogados e novos consentimentos não podem ser concedidos. Crie um novo titular para continuar.
              </p>
            </div>
          </div>
        </div>
      )}

      {showCreateUser && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Novo Usuário</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              placeholder="Nome completo"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
            />
            <input
              placeholder="Email"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <input
              placeholder="CPF"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={newUser.documentNumber}
              onChange={(e) => setNewUser({ ...newUser, documentNumber: e.target.value })}
            />
            <input
              type="date"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={newUser.birthDate}
              onChange={(e) => setNewUser({ ...newUser, birthDate: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => createUserMut.mutate(newUser)}
              disabled={createUserMut.isPending}
              className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {createUserMut.isPending ? 'Criando...' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateUser(false)}
              className="rounded bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
          {createUserMut.isError && (
            <p className="text-sm text-red-600">
              {createUserMut.error instanceof Error ? createUserMut.error.message : 'Falha ao criar usuário.'}
            </p>
          )}
        </div>
      )}

      {selectedUserId !== '' && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Selecionar Consentimentos
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              Marque as combinações de categoria × finalidade e use os botões para conceder ou revogar.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="pb-2 font-medium">Categoria de Dado</th>
                    {PURPOSES.map((p) => (
                      <th key={p} className="pb-2 text-center font-medium">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DATA_CATEGORIES.map((cat) => (
                    <tr key={cat} className="border-b last:border-0">
                      <td className="py-2 font-medium">{cat}</td>
                      {PURPOSES.map((pur) => {
                        const key = `${cat}|${pur}`;
                        return (
                          <td key={pur} className="py-2 text-center">
                            <input
                              type="checkbox"
                              checked={checked[key] ?? false}
                              onChange={() => toggle(cat, pur)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGrant}
                disabled={checkedCount === 0 || grantMut.isPending || revokeSelectedMut.isPending || isDeactivated}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
              >
                {grantMut.isPending
                  ? 'Concedendo...'
                  : `Conceder Selecionados (${checkedCount})`}
              </button>
              <button
                type="button"
                onClick={handleRevokeSelected}
                disabled={checkedCount === 0 || revokeSelectedMut.isPending || grantMut.isPending || isDeactivated}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {revokeSelectedMut.isPending
                  ? 'Revogando...'
                  : `Revogar Selecionados (${checkedCount})`}
              </button>
              <button
                type="button"
                onClick={() => typeof selectedUserId === 'number' && deactivateMut.mutate({ ownerId: selectedUserId })}
                disabled={deactivateMut.isPending || isDeactivated}
                className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deactivateMut.isPending ? 'Desativando...' : 'Desativar Todos (consentimentos)'}
              </button>
            </div>
          </div>

          {grantMut.isSuccess && (
            <ProofBanner isCompliant title="Consentimentos concedidos com sucesso (202 Accepted)" />
          )}
          {isDeactivatedError && (
            <ProofBanner
              isCompliant={false}
              title="Titular desativado"
              detail="Este titular foi desativado e não pode receber novos consentimentos. Crie um novo titular para continuar."
            />
          )}
          {grantMut.isError && !isDeactivatedError && (
            <ProofBanner
              isCompliant={false}
              title="Falha ao conceder consentimentos"
              detail={grantMut.error instanceof Error ? grantMut.error.message : 'Erro desconhecido.'}
            />
          )}
          {revokeSelectedMut.isSuccess && (
            <ProofBanner isCompliant title="Consentimentos revogados com sucesso" />
          )}
          {revokeSelectedMut.isError && (
            <ProofBanner
              isCompliant={false}
              title="Falha ao revogar consentimentos"
              detail={revokeSelectedMut.error instanceof Error ? revokeSelectedMut.error.message : 'Erro desconhecido.'}
            />
          )}
          {deactivateMut.isSuccess && (
            <ProofBanner
              isCompliant
              title="Todos os consentimentos foram revogados"
            />
          )}
          {deactivateUserMut.isSuccess && (
            <ProofBanner
              isCompliant
              title="Titular desativado com sucesso"
              detail="Todos os consentimentos foram revogados. Este titular não pode mais receber consentimentos."
            />
          )}
          {deactivateUserMut.isError && (
            <ProofBanner
              isCompliant={false}
              title="Falha ao desativar titular"
              detail={deactivateUserMut.error instanceof Error ? deactivateUserMut.error.message : 'Erro desconhecido.'}
            />
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Autorizações do Usuário #{selectedUserId}
            </h3>
            {authorizationsQ.isLoading && <p className="text-sm text-gray-400">Carregando...</p>}
            {authorizationsQ.isError && (
              <p className="text-sm text-red-600">
                {authorizationsQ.error instanceof Error
                  ? authorizationsQ.error.message
                  : 'Erro ao carregar autorizações.'}
              </p>
            )}
            {authorizations.length === 0 && !authorizationsQ.isLoading && (
              <p className="text-sm text-gray-400">Nenhuma autorização encontrada.</p>
            )}
            {authorizations.length > 0 && (
              <AuthorizationTable
                rows={authorizations}
                onRevoke={(category, purpose) =>
                  revokeSelectedMut.mutate({
                    ownerId: Number(selectedUserId),
                    authorizations: [{ dataCategory: category, purposes: [purpose] }],
                  })
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AuthorizationTable({
  rows,
  onRevoke,
}: {
  rows: ConsentAuthorizationDetail[];
  onRevoke: (category: string, purpose: string) => void;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b text-gray-500">
          <th className="pb-2 font-medium">Categoria</th>
          <th className="pb-2 font-medium">Finalidade</th>
          <th className="pb-2 font-medium">Status</th>
          <th className="pb-2 font-medium">Base Legal</th>
          <th className="pb-2 font-medium">Concedido em</th>
          <th className="pb-2 font-medium">Revogado em</th>
          <th className="pb-2 font-medium">Ações</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c, i) => (
          <tr key={i} className="border-b last:border-0">
            <td className="py-2">{c.dataCategory}</td>
            <td className="py-2">{c.purpose}</td>
            <td className="py-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.status === 'GRANTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {c.status}
              </span>
            </td>
            <td className="py-2">{c.legalBasis ?? '—'}</td>
            <td className="py-2">{new Date(c.grantedAt).toLocaleString('pt-BR')}</td>
            <td className="py-2">
              {c.revokedAt ? new Date(c.revokedAt).toLocaleString('pt-BR') : '—'}
            </td>
            <td className="py-2">
              {c.status === 'GRANTED' && (
                <button
                  type="button"
                  onClick={() => onRevoke(c.dataCategory, c.purpose)}
                  className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  Revogar
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
