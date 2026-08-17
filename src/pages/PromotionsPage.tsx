import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getPromotionWithProfile, createPromotion } from '../api/promotion';
import { listUsers } from '../api/user';
import { getConsentAuthorizations } from '../api/consent';
import { ProofBanner } from '../components/ProofBanner';
import { newCorrelationId } from '../api/client';
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
    queryKey: ['consent', userId],
    queryFn: () => getConsentAuthorizations(Number(userId)).then((r) => r.data),
    enabled: userId !== '',
    retry: false,
  });

  const authorizations = consentQ.data?.authorizations ?? [];
  const hasPersonal = authorizations.some(
    (a) => a.dataCategory === 'PERSONAL_DATA' && a.purpose === 'PROMOTION' && a.status === 'GRANTED',
  );
  const hasUsage = authorizations.some(
    (a) => a.dataCategory === 'USAGE_DATA' && a.purpose === 'PROMOTION' && a.status === 'GRANTED',
  );

  const fetchPromoQ = useQuery({
    queryKey: ['promotion-with-profile', userId],
    queryFn: async () => {
      const corr = newCorrelationId();
      const res = await getPromotionWithProfile(Number(userId), 'PROMOTION');
      return { data: res.data, correlationId: corr };
    },
    enabled: userId !== '' && hasUsage,
    retry: false,
  });

  const createPromoMut = useMutation({
    mutationFn: (data: PromotionRequest) => createPromotion(data, 'PROMOTION'),
    onSuccess: () => {
      setShowCreate(false);
      setNewPromo({ dataSubjectId: '', name: '', description: '', discountPercent: 10, startDate: '2026-09-01', targetSegment: 'PREMIUM' });
      if (userId !== '' && hasUsage) fetchPromoQ.refetch();
    },
  });

  const data = fetchPromoQ.data?.data ?? null;
  const selectedUser = userId !== '' ? usersQ.data?.find((u) => u.id === Number(userId)) : null;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Promoções</h2>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500">Titular</label>
          <select
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
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
            onClick={() => setShowCreate((v) => !v)}
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
            <ProofBanner
              isCompliant={false}
              title="Erro ao criar promoção"
              detail={createPromoMut.error instanceof Error ? createPromoMut.error.message : 'Erro desconhecido.'}
            />
          )}
        </div>
      )}

      {userId !== '' && consentQ.isLoading && (
        <p className="text-sm text-gray-400">Verificando consentimento...</p>
      )}

      {userId !== '' && consentQ.isSuccess && !hasPersonal && !hasUsage && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <span className="text-xl text-gray-400">🔒</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Sem consentimento para promoções</h3>
          <p className="mt-1 text-sm text-gray-500">
            Este titular não possui consentimento ativo para <strong>PERSONAL_DATA</strong> nem <strong>USAGE_DATA</strong> com finalidade <strong>PROMOTION</strong>.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Conceda o consentimento na aba <strong>Consentimentos</strong> para acessar promoções.
          </p>
        </div>
      )}

      {userId !== '' && consentQ.isSuccess && hasPersonal && !hasUsage && selectedUser && (
        <>
          <ProofBanner
            isCompliant={false}
            title="Dados de perfil disponíveis — dados de uso NÃO disponíveis"
            detail="PERSONAL_DATA/PROMOTION concedido. USAGE_DATA/PROMOTION não concedido."
          />
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Perfil do Titular</h3>
            <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
              {JSON.stringify({
                id: selectedUser.id,
                fullName: selectedUser.fullName,
                email: selectedUser.email,
                documentNumber: selectedUser.documentNumber,
                birthDate: selectedUser.birthDate,
                createdAt: selectedUser.createdAt,
              }, null, 2)}
            </pre>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-1 text-sm font-semibold text-amber-800">Dados de uso indisponíveis</h3>
            <p className="text-xs text-amber-700">
              Consentimento <strong>USAGE_DATA/PROMOTION</strong> não concedido. Promoções personalizadas requerem USAGE_DATA.
            </p>
          </div>
        </>
      )}

      {userId !== '' && consentQ.isSuccess && hasUsage && fetchPromoQ.isLoading && (
        <p className="text-sm text-gray-400">Carregando dados de uso e promoções...</p>
      )}

      {data && (
        <>
          <ProofBanner
            isCompliant
            title="Dados retornados com consentimento ativo"
            detail={`OPA permitiu acesso. Correlation ID: ${fetchPromoQ.data?.correlationId ?? '—'}`}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Perfil do Titular</h3>
              <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                {JSON.stringify(data.userProfile, null, 2)}
              </pre>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Dados de Uso</h3>
              <p className="mb-2 text-xs text-gray-500">
                Registros de uso que servem de base para promoções personalizadas.
              </p>
              {data.usageData.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum dado de uso registrado.</p>
              ) : (
                <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                  {JSON.stringify(data.usageData, null, 2)}
                </pre>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Promoções Disponíveis</h3>
            {data.availablePromotions.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma promoção cadastrada para este titular.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.availablePromotions.map((p) => (
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
