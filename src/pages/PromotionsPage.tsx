import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPromotionWithProfile } from '../api/promotion';
import { getConsentAuthorizations } from '../api/consent';
import { listUsers } from '../api/user';
import { ProofBanner } from '../components/ProofBanner';
import { newCorrelationId } from '../api/client';
import type { PromotionResponse } from '../types';

export function PromotionsPage() {
  const [userId, setUserId] = useState<number | ''>('');
  const [purpose, setPurpose] = useState('PROMOTION');
  const [correlationId, setCorrelationId] = useState('');

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers().then((r) => r.data),
    retry: false,
  });

  const run = useMemo(() => {
    if (userId === '') return null;
    const corr = newCorrelationId();
    setCorrelationId(corr);
    return { userId: Number(userId), purpose, corr };
  }, [userId, purpose]);

  const resultQ = useQuery({
    queryKey: ['promotion-with-profile', run?.userId, run?.purpose, run?.corr],
    queryFn: () => getPromotionWithProfile(run!.userId, run!.purpose).then((r) => r.data),
    enabled: !!run,
    retry: false,
  });

  const consentQ = useQuery({
    queryKey: ['consents', userId],
    queryFn: () => getConsentAuthorizations(Number(userId)).then((r) => r.data),
    enabled: userId !== '',
    retry: false,
  });

  const usageConsent = consentQ.data?.authorizations.filter(
    (a) => a.purpose === purpose && a.dataCategory === 'USAGE_DATA',
  );
  const personalConsent = consentQ.data?.authorizations.filter(
    (a) => a.purpose === purpose && a.dataCategory === 'PERSONAL_DATA',
  );

  const result = resultQ.data;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Promoções com Perfil</h2>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500">Usuário</label>
          <select
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Selecione um usuário</option>
            {usersQ.data?.map((u) => (
              <option key={u.id} value={u.id}>
                #{u.id} — {u.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Finalidade</label>
          <select
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          >
            <option value="PROMOTION">PROMOTION</option>
            <option value="ANALYTICS">ANALYTICS</option>
          </select>
        </div>
      </div>

      {resultQ.isError && (
        <ProofBanner
          isCompliant={false}
          title="Erro no fluxo de promoções"
          detail={
            resultQ.error instanceof Error
              ? resultQ.error.message
              : 'Consulte consentimento ativo para USAGE_DATA e PERSONAL_DATA com finalidade PROMOTION.'
          }
        />
      )}

      {result && (
        <>
          <ProofBanner
            isCompliant
            title="Promoções carregadas com consentimento ativo"
            detail={`Correlation ID: ${correlationId}`}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Perfil do Usuário</h3>
              <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                {JSON.stringify(result.userProfile, null, 2)}
              </pre>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Dados de Uso</h3>
              {result.usageData.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum dado de uso registrado.</p>
              ) : (
                <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                  {JSON.stringify(result.usageData, null, 2)}
                </pre>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Consentimento exigido pela OPA (finalidade {purpose})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <ConsentCheck
                label="USAGE_DATA"
                ok={usageConsent?.some((a) => a.status === 'GRANTED') ?? false}
              />
              <ConsentCheck
                label="PERSONAL_DATA"
                ok={personalConsent?.some((a) => a.status === 'GRANTED') ?? false}
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Promoções Disponíveis</h3>
            {result.availablePromotions.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma promoção disponível no momento.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.availablePromotions.map((p) => (
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

function ConsentCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded border p-3 text-sm ${
        ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}
    >
      <span className={`font-semibold ${ok ? 'text-green-800' : 'text-red-800'}`}>{label}</span>
      <span className={`ml-auto ${ok ? 'text-green-700' : 'text-red-700'}`}>
        {ok ? 'CONSENTIDO' : 'SEM CONSENTIMENTO'}
      </span>
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
