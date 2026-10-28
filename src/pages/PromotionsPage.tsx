import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';
import { listPromotionsByUser, createPromotion } from '../api/promotion';
import { getUser, getUserUsage, listUsers } from '../api/user';
import { getConsentAuthorizations } from '../api/consent';
import type { PromotionRequest, PromotionResponse } from '../types';

export function PromotionsPage() {
  const [userId, setUserId] = useState<number | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [newPromo, setNewPromo] = useState<PromotionRequest>({
    dataSubjectId: '',
    name: '',
    description: '',
    discountPercent: 10,
    startDate: '2026-09-01',
    targetSegment: 'PREMIUM',
  });

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers().then((r) => r.data),
    retry: false,
  });

  const consentQ = useQuery({
    queryKey: ['consents', userId],
    queryFn: () => getConsentAuthorizations(Number(userId)).then((r) => r.data),
    enabled: userId !== '',
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: false,
  });

  const authorizations = consentQ.data?.authorizations ?? [];
  const hasPersonal = authorizations.some(
    (a) => a.dataCategory === 'PERSONAL_DATA' && a.purpose === 'PROMOTION' && a.status === 'GRANTED',
  );
  const hasUsage = authorizations.some(
    (a) => a.dataCategory === 'USAGE_DATA' && a.purpose === 'PROMOTION' && a.status === 'GRANTED',
  );

  const consentReady = userId !== '' && consentQ.isSuccess && !consentQ.isFetching;
  const consentVersion = JSON.stringify(authorizations);

  const profileQ = useQuery({
    queryKey: ['promotion-profile', userId, consentVersion],
    queryFn: () => getUser(Number(userId), 'PROMOTION').then((res) => res.data),
    enabled: consentReady && hasPersonal,
    staleTime: 0,
    retry: false,
  });

  const usageQ = useQuery({
    queryKey: ['promotion-usage', userId, consentVersion],
    queryFn: () => getUserUsage(Number(userId), 'PROMOTION').then((res) => res.data),
    enabled: consentReady && hasUsage,
    staleTime: 0,
    retry: false,
  });

  const promotionsQ = useQuery({
    queryKey: ['promotions-by-user', userId],
    queryFn: () => listPromotionsByUser(Number(userId)).then((res) => res.data),
    enabled: userId !== '',
    staleTime: 0,
    retry: false,
  });

  const createPromoMut = useMutation({
    mutationFn: (data: PromotionRequest) => createPromotion(data, 'PROMOTION'),
    onSuccess: () => {
      setShowCreate(false);
      setNewPromo({ dataSubjectId: '', name: '', description: '', discountPercent: 10, startDate: '2026-09-01', targetSegment: 'PREMIUM' });
      if (userId !== '') promotionsQ.refetch();
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Promoções</h2>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500">Titular</label>
          <select
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value ? Number(e.target.value) : '');
              setShowCreate(false);
              createPromoMut.reset();
            }}
          >
            <option value="">Selecione um titular</option>
            {usersQ.data?.map((u) => (
              <option key={u.id} value={u.id} disabled={!u.active}>
                #{u.id} — {u.fullName}{!u.active ? ' (INATIVO)' : ''}
              </option>
            ))}
          </select>
        </div>
        {userId !== '' && (
          <button
            type="button"
            onClick={() => {
              createPromoMut.reset();
              setShowCreate((v) => !v);
            }}
            className="rounded bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            + Criar Promoção
          </button>
        )}
      </div>

      {showCreate && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Nova Promoção para #{userId}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              placeholder="Nome"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={newPromo.name}
              onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
            />
            <input
              placeholder="Descrição"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={newPromo.description ?? ''}
              onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
            />
            <input
              type="number"
              placeholder="% Desconto"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={newPromo.discountPercent}
              onChange={(e) => setNewPromo({ ...newPromo, discountPercent: Number(e.target.value) })}
            />
            <input
              type="date"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={newPromo.startDate}
              onChange={(e) => setNewPromo({ ...newPromo, startDate: e.target.value })}
            />
            <select
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={newPromo.targetSegment}
              onChange={(e) => setNewPromo({ ...newPromo, targetSegment: e.target.value })}
            >
              <option value="PREMIUM">PREMIUM</option>
              <option value="STANDARD">STANDARD</option>
              <option value="BASIC">BASIC</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (userId !== '') {
                  createPromoMut.mutate({ ...newPromo, dataSubjectId: String(userId) });
                }
              }}
              disabled={createPromoMut.isPending || !newPromo.name}
              className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {createPromoMut.isPending ? 'Criando...' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
          {createPromoMut.isError && (
            <p role="alert" className="text-sm text-red-700">
              {isAxiosError(createPromoMut.error) && createPromoMut.error.response?.status === 403
                ? 'Não foi possível criar a promoção: acesso aos dados de uso não autorizado.'
                : 'Não foi possível criar a promoção. Verifique os dados e tente novamente.'}
            </p>
          )}
        </div>
      )}

      {userId !== '' && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Perfil do Titular</h3>
              {consentQ.isError ? (
                <DataError />
              ) : !consentReady ? (
                <LoadingData />
              ) : !hasPersonal || (isAxiosError(profileQ.error) && profileQ.error.response?.status === 403) ? (
                <LockedData />
              ) : profileQ.isError ? (
                <DataError />
              ) : !profileQ.data ? (
                <LoadingData />
              ) : (
                <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                  {JSON.stringify({
                    id: profileQ.data.id,
                    fullName: profileQ.data.fullName,
                    email: profileQ.data.email,
                    documentNumber: profileQ.data.documentNumber,
                    birthDate: profileQ.data.birthDate,
                    createdAt: profileQ.data.createdAt,
                  }, null, 2)}
                </pre>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Dados de Uso</h3>
              {consentQ.isError ? (
                <DataError />
              ) : !consentReady ? (
                <LoadingData />
              ) : !hasUsage || (isAxiosError(usageQ.error) && usageQ.error.response?.status === 403) ? (
                <LockedData />
              ) : usageQ.isError ? (
                <DataError />
              ) : !usageQ.data ? (
                <LoadingData />
              ) : usageQ.data.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum dado de uso registrado.</p>
              ) : (
                <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                  {JSON.stringify(usageQ.data, null, 2)}
                </pre>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Promoções Disponíveis</h3>
            {promotionsQ.isError ? (
              <DataError />
            ) : !promotionsQ.data ? (
              <LoadingData />
            ) : promotionsQ.data.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma promoção cadastrada para este titular.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {promotionsQ.data.map((p) => (
                  <PromotionCard key={p.id} promo={p} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LockedData() {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded bg-gray-50 p-4 text-gray-500">
      <span aria-hidden="true" className="text-2xl">🔒</span>
      <p className="text-sm">Acesso não autorizado.</p>
    </div>
  );
}

function LoadingData() {
  return <p role="status" className="text-sm text-gray-400">Carregando...</p>;
}

function DataError() {
  return <p role="alert" className="text-sm text-red-700">Não foi possível carregar os dados.</p>;
}

function PromotionCard({ promo }: { promo: PromotionResponse }) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <p className="font-semibold text-gray-800">{promo.name}</p>
      <p className="text-xs text-gray-500">{promo.description ?? '—'}</p>
      <p className="mt-1 text-lg font-bold text-indigo-600">{promo.discountPercent}% OFF</p>
      <p className="text-xs text-gray-400">
        {promo.startDate} — {promo.endDate ?? 'indeterminado'} · segmento{' '}
        {promo.targetSegment}
      </p>
    </div>
  );
}
