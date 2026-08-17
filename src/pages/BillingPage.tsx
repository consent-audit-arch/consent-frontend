import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createBillingRecord, getBillingWithProfile } from '../api/billing';
import { listUsers } from '../api/user';
import { ProofBanner } from '../components/ProofBanner';
import { newCorrelationId } from '../api/client';

export function BillingPage() {
  const [userId, setUserId] = useState<number | ''>('');
  const [recordDescription, setRecordDescription] = useState('Mensalidade do plano');
  const [recordAmount, setRecordAmount] = useState('199.90');
  const [correlationId, setCorrelationId] = useState('');
  const [billingResult, setBillingResult] = useState<{
    userProfile: unknown;
    billingRecord: unknown;
  } | null>(null);
  const [noConsent, setNoConsent] = useState(false);

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers().then((r) => r.data),
    retry: false,
  });

  const createAndFetchMut = useMutation({
    mutationFn: async (data: { dataSubjectId: string; description: string; amount: number }) => {
      const bill = await createBillingRecord(data);
      const corr = newCorrelationId();
      setCorrelationId(corr);
      const profile = await getBillingWithProfile(
        Number(data.dataSubjectId),
        bill.data.id,
        'BILLING',
      );
      return profile.data;
    },
    onSuccess: (result) => {
      setBillingResult(result);
      setNoConsent(false);
    },
    onError: () => {
      setBillingResult(null);
      setNoConsent(true);
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Faturamento</h2>
      <p className="text-sm text-gray-500">
        Gere uma fatura para um titular. Os dados do perfil e contrato só são acessados se houver consentimento ativo para <strong>FINANCIAL_DATA</strong> e <strong>PERSONAL_DATA</strong> com finalidade <strong>BILLING</strong>.
      </p>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Gerar Fatura</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500">Titular</label>
            <select
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value ? Number(e.target.value) : '');
                setBillingResult(null);
                setNoConsent(false);
              }}
            >
              <option value="">Selecione um titular</option>
              {usersQ.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  #{u.id} — {u.fullName}
                </option>
              ))}
            </select>
          </div>
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
            disabled={userId === '' || createAndFetchMut.isPending}
            onClick={() =>
              userId !== '' &&
              createAndFetchMut.mutate({
                dataSubjectId: String(userId),
                description: recordDescription,
                amount: Number(recordAmount),
              })
            }
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {createAndFetchMut.isPending ? 'Gerando...' : 'Gerar Fatura'}
          </button>
        </div>
      </div>

      {noConsent && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <span className="text-xl text-gray-400">🔒</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Sem consentimento para acesso aos dados</h3>
          <p className="mt-1 text-sm text-gray-500">
            A fatura foi criada, mas os dados do perfil e contrato não puderam ser acessados.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Conceda consentimento para <strong>FINANCIAL_DATA</strong> e <strong>PERSONAL_DATA</strong> com finalidade <strong>BILLING</strong> na aba <strong>Consentimentos</strong>.
          </p>
        </div>
      )}

      {billingResult && (
        <>
          <ProofBanner
            isCompliant
            title="Fatura gerada com consentimento ativo"
            detail={`Correlation ID: ${correlationId}`}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Perfil do Usuário</h3>
              <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                {JSON.stringify(billingResult.userProfile, null, 2)}
              </pre>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Registro de Faturamento</h3>
              <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                {JSON.stringify(billingResult.billingRecord, null, 2)}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
