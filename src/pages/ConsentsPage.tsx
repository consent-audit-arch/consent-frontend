import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  grantConsent,
  deactivateConsent,
  revokeConsent,
  getConsentAuthorizations,
} from '../api/consent';
import { createUser, listUsers } from '../api/user';
import { ProofBanner } from '../components/ProofBanner';
import type {
  CreateUserCommand,
  ConsentAuthorizationDetail,
  GrantConsentRequest,
} from '../types';

const DEFAULT_AUTHORIZATIONS: GrantConsentRequest['authorizations'] = [
  { dataCategory: 'PERSONAL_DATA', purposes: ['BILLING', 'PROMOTION', 'ANALYTICS'] },
  { dataCategory: 'CONTRACT_DATA', purposes: ['BILLING'] },
  { dataCategory: 'USAGE_DATA', purposes: ['PROMOTION', 'ANALYTICS'] },
];

export function ConsentsPage() {
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserCommand>({
    fullName: '',
    email: '',
    documentNumber: '',
    birthDate: '',
  });

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
    onSuccess: () => authorizationsQ.refetch(),
  });

  const deactivateMut = useMutation({
    mutationFn: (data: { ownerId: number }) =>
      deactivateConsent({ ownerId: data.ownerId, issuedBy: { issuer: 'USER', id: data.ownerId } }),
    onSuccess: () => authorizationsQ.refetch(),
  });

  const revokeMut = useMutation({
    mutationFn: (data: { ownerId: number; category: string; purpose: string; reason: string }) =>
      revokeConsent(data.ownerId, {
        ownerId: data.ownerId,
        authorizations: [{ dataCategory: data.category, purposes: [data.purpose] }],
        reason: data.reason,
        issuedBy: { issuer: 'USER', id: data.ownerId },
      }),
    onSuccess: () => authorizationsQ.refetch(),
  });

  const createUserMut = useMutation({
    mutationFn: (data: CreateUserCommand) => createUser(data),
    onSuccess: () => {
      usersQ.refetch();
      setShowCreateUser(false);
      setNewUser({ fullName: '', email: '', documentNumber: '', birthDate: '' });
    },
  });

  const handleGrant = useCallback(() => {
    if (selectedUserId === '') return;
    grantMut.mutate({
      ownerId: Number(selectedUserId),
      authorizations: DEFAULT_AUTHORIZATIONS,
      legalBasis: 'CONSENT',
      issuedBy: { issuer: 'USER', id: Number(selectedUserId) },
    });
  }, [selectedUserId, grantMut]);

  const authorizations = authorizationsQ.data?.authorizations ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Consentimentos</h2>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">Selecione um usuário</option>
          {usersQ.data?.map((u) => (
            <option key={u.id} value={u.id}>
              #{u.id} — {u.fullName}
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
      </div>

      {usersQ.isError && (
        <ProofBanner
          isCompliant={false}
          title="Erro ao listar usuários"
          detail={usersQ.error instanceof Error ? usersQ.error.message : 'Consulte user-service.'}
        />
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGrant}
              disabled={grantMut.isPending}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
            >
              {grantMut.isPending ? 'Concedendo...' : 'Conceder Consentimentos'}
            </button>
            <button
              type="button"
              onClick={() => typeof selectedUserId === 'number' && deactivateMut.mutate({ ownerId: selectedUserId })}
              disabled={deactivateMut.isPending}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {deactivateMut.isPending ? 'Revogando...' : 'Desativar Todos'}
            </button>
          </div>

          {grantMut.isError && (
            <ProofBanner
              isCompliant={false}
              title="Falha ao conceder consentimentos"
              detail={grantMut.error instanceof Error ? grantMut.error.message : 'Erro desconhecido.'}
            />
          )}
          {grantMut.isSuccess && (
            <ProofBanner isCompliant title="Consentimentos concedidos com sucesso (202 Accepted)" />
          )}
          {deactivateMut.data && (
            <ProofBanner
              isCompliant
              title={`Consentimentos desativados (${deactivateMut.data.data.consentsRevoked} registros)`}
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
                ownerId={Number(selectedUserId)}
                onRevoke={(category, purpose) =>
                  revokeMut.mutate({
                    ownerId: Number(selectedUserId),
                    category,
                    purpose,
                    reason: 'Revogado via console de auditoria',
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
  ownerId,
  onRevoke,
}: {
  rows: ConsentAuthorizationDetail[];
  ownerId: number;
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
