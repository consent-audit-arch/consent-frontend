import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createBillingRecord, getBillingWithProfile } from '../api/billing';
import { getConsentAuthorizations } from '../api/consent';
import { listUsers } from '../api/user';
import { ProofBanner } from '../components/ProofBanner';
import { newCorrelationId } from '../api/client';

export function BillingPage() {
  const [userId, setUserId] = useState<number | ''>('');
  const [billingId, setBillingId] = useState('');
  const [purpose, setPurpose] = useState('BILLING');
  const [recordDescription, setRecordDescription] = useState('Mensalidade do plano');
  const [recordAmount, setRecordAmount] = useState('199.90');
  const [correlationId, setCorrelationId] = useState('');

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers().then((r) => r.data),
    retry: false,
  });

  const createQ = useMutation({
    mutationFn: (data: { dataSubjectId: string; description: string; amount: number }) =>
      createBillingRecord(data),
    onSuccess: (res) => {
      setBillingId(String(res.data.id));
    },
  });

  const enabled = userId !== '' && billingId !== '';

  const run = useMemo(() => {
    if (!enabled) return null;
    const corr = newCorrelationId();
    setCorrelationId(corr);
    return { userId: Number(userId), billingId: Number(billingId), purpose, corr };
  }, [enabled, userId, billingId, purpose]);

  const resultQ = useQuery({
    queryKey: ['billing-with-profile', run?.userId, run?.billingId, run?.purpose, run?.corr],
    queryFn: () =>
      getBillingWithProfile(run!.userId, run!.billingId, run!.purpose).then((r) => r.data),
    enabled: !!run,
    retry: false,
  });

  const consentQ = useQuery({
    queryKey: ['consents', userId],
    queryFn: () => getConsentAuthorizations(Number(userId)).then((r) => r.data),
    enabled: userId !== '',
    retry: false,
  });

  const billingConsent = consentQ.data?.authorizations.filter(
    (a) => a.purpose === purpose && a.dataCategory === 'FINANCIAL_DATA',
  );
  const personalConsent = consentQ.data?.authorizations.filter(
    (a) => a.purpose === purpose && a.dataCategory === 'PERSONAL_DATA',
  );

  const result = resultQ.data;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Faturamento com Perfil</h2>

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
          <label className="block text-xs font-medium text-gray-500">Billing ID</label>
          <input
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Ex: 1"
            value={billingId}
            onChange={(e) => setBillingId(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Finalidade</label>
          <select
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          >
            <option value="BILLING">BILLING</option>
            <option value="ANALYTICS">ANALYTICS</option>
            <option value="CUSTOMER_SERVICE">CUSTOMER_SERVICE</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Criar registro de faturamento</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label className="block text-xs font-medium text-gray-500">Descrição</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={recordDescription}
              onChange={(e) => setRecordDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Valor (R$)</label>
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={recordAmount}
              onChange={(e) => setRecordAmount(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={userId === '' || createQ.isPending}
            onClick={() =>
              userId !== '' &&
              createQ.mutate({
                dataSubjectId: String(userId),
                description: recordDescription,
                amount: Number(recordAmount),
              })
            }
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {createQ.isPending ? 'Criando...' : 'Criar registro'}
          </button>
        </div>
        {createQ.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createQ.error instanceof Error ? createQ.error.message : 'Falha ao criar registro.'}
          </p>
        )}
      </div>

      {resultQ.isError && (
        <ProofBanner
          isCompliant={false}
          title="Erro no fluxo de faturamento"
          detail={
            resultQ.error instanceof Error
              ? resultQ.error.message
              : 'Consulte consentimento ativo para FINANCIAL_DATA e PERSONAL_DATA com finalidade BILLING.'
          }
        />
      )}

      {result && (
        <>
          <ProofBanner
            isCompliant
            title="Faturamento executado com consentimento ativo"
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
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Registro de Faturamento</h3>
              <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                {JSON.stringify(result.billingRecord, null, 2)}
              </pre>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Consentimento exigido pela OPA (finalidade {purpose})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <ConsentCheck
                label="FINANCIAL_DATA"
                ok={billingConsent?.some((a) => a.status === 'GRANTED') ?? false}
              />
              <ConsentCheck
                label="PERSONAL_DATA"
                ok={personalConsent?.some((a) => a.status === 'GRANTED') ?? false}
              />
            </div>
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
