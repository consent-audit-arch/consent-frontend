import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAuditStats,
  getSubjectTrail,
  getComplianceReport,
  getAnomalies,
  getAccessProof,
} from '../api/audit';
import { listUsers } from '../api/user';
import { ProofBanner } from '../components/ProofBanner';
import type {
  AnomalyResponse,
  ComplianceDetail,
  StatsResponse,
  TrailItem,
  AccessProofResponse,
} from '../types';

type Tab = 'stats' | 'trail' | 'compliance' | 'anomalies' | 'proof';

const TABS: { key: Tab; label: string }[] = [
  { key: 'stats', label: 'Estatísticas' },
  { key: 'trail', label: 'Trilha do Titular' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'anomalies', label: 'Anomalias' },
  { key: 'proof', label: 'Prova de Acesso' },
];

export function AuditPage() {
  const [tab, setTab] = useState<Tab>('stats');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [traceId, setTraceId] = useState('');

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers().then((r) => r.data),
    retry: false,
  });

  const statsQ = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => getAuditStats().then((r) => r.data),
    enabled: tab === 'stats',
    retry: false,
  });

  const trailQ = useQuery({
    queryKey: ['audit-trail', selectedUserId],
    queryFn: () => getSubjectTrail(Number(selectedUserId)).then((r) => r.data),
    enabled: tab === 'trail' && selectedUserId !== '',
    retry: false,
  });

  const complianceQ = useQuery({
    queryKey: ['audit-compliance', selectedUserId],
    queryFn: () => getComplianceReport(Number(selectedUserId)).then((r) => r.data),
    enabled: tab === 'compliance' && selectedUserId !== '',
    retry: false,
  });

  const anomaliesQ = useQuery({
    queryKey: ['audit-anomalies'],
    queryFn: () => getAnomalies().then((r) => r.data),
    enabled: tab === 'anomalies',
    retry: false,
  });

  const proofQ = useQuery({
    queryKey: ['audit-proof', traceId],
    queryFn: () => getAccessProof(traceId).then((r) => r.data),
    enabled: tab === 'proof' && traceId.trim() !== '',
    retry: false,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Auditoria</h2>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">Selecione um usuário (titular)</option>
          {usersQ.data?.map((u) => (
            <option key={u.id} value={u.id}>
              #{u.id} — {u.fullName}
            </option>
          ))}
        </select>

        {tab === 'proof' && (
          <input
            placeholder="Trace ID"
            className="min-w-64 rounded border border-gray-300 px-3 py-2 font-mono text-sm"
            value={traceId}
            onChange={(e) => setTraceId(e.target.value)}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm font-medium transition ${
              tab === key
                ? '-mb-px border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'stats' && statsQ.data && <StatsView stats={statsQ.data} />}
      {tab === 'stats' && statsQ.isError && <QueryError error={statsQ.error} />}

      {tab === 'trail' && trailQ.data && <TrailView items={trailQ.data} />}
      {tab === 'trail' && trailQ.isError && <QueryError error={trailQ.error} />}

      {tab === 'compliance' && complianceQ.data && <ComplianceView report={complianceQ.data} />}
      {tab === 'compliance' && complianceQ.isError && <QueryError error={complianceQ.error} />}

      {tab === 'anomalies' && anomaliesQ.data && <AnomaliesView items={anomaliesQ.data} />}
      {tab === 'anomalies' && anomaliesQ.isError && <QueryError error={anomaliesQ.error} />}

      {tab === 'proof' &&
        (proofQ.data ? (
          <ProofView proof={proofQ.data} />
        ) : proofQ.isError ? (
          <QueryError error={proofQ.error} />
        ) : (
          <p className="text-sm text-gray-400">
            Digite um Trace ID (ex.: disponível na trilha do titular) para montar a prova de acesso.
          </p>
        ))}
    </div>
  );
}

function QueryError({ error }: { error: unknown }) {
  return (
    <ProofBanner
      isCompliant={false}
      title="Erro na consulta de auditoria"
      detail={error instanceof Error ? error.message : 'Falha na chamada ao audit-service.'}
    />
  );
}

function StatsView({ stats }: { stats: StatsResponse }) {
  const mapEntries = (m: Record<string, number>) =>
    Object.entries(m).length ? Object.entries(m).join(' · ') : '—';
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Total ALLOW" value={stats.totalAllows} />
      <StatCard label="Total DENY" value={stats.totalDenies} />
      <StatCard label="Por Categoria" value={mapEntries(stats.byCategory)} small />
      <StatCard label="Por Cliente" value={mapEntries(stats.byClient)} small />
      <StatCard label="Por Finalidade" value={mapEntries(stats.byPurpose)} small />
    </div>
  );
}

function StatCard({
  label,
  value,
  small = false,
}: {
  label: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 font-bold text-indigo-600 ${small ? 'text-sm break-all' : 'text-lg'}`}>
        {value}
      </p>
    </div>
  );
}

function TrailView({ items }: { items: TrailItem[] }) {
  if (items.length === 0) return <p className="text-sm text-gray-400">Nenhum acesso registrado.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-gray-500">
            <th className="p-3 font-medium">Timestamp</th>
            <th className="p-3 font-medium">Trace ID</th>
            <th className="p-3 font-medium">Cliente</th>
            <th className="p-3 font-medium">Método</th>
            <th className="p-3 font-medium">Endpoint</th>
            <th className="p-3 font-medium">Decisão</th>
            <th className="p-3 font-medium">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.traceId + t.timestamp} className="border-b last:border-0">
              <td className="p-3 text-xs">{new Date(t.timestamp).toLocaleString('pt-BR')}</td>
              <td className="p-3 font-mono text-xs">{t.traceId}</td>
              <td className="p-3">{t.clientId}</td>
              <td className="p-3">{t.method}</td>
              <td className="p-3 font-mono text-xs">{t.endpoint}</td>
              <td className="p-3">
                <DecisionPill decision={t.decision} />
              </td>
              <td className="p-3 text-xs text-gray-500">{t.deniedReason ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComplianceView({
  report,
}: {
  report: { dataSubjectId: number; totalAccesses: number; compliant: number; violations: number; details: ComplianceDetail[] };
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total de Acessos" value={report.totalAccesses} />
        <StatCard label="Compliant" value={report.compliant} />
        <StatCard label="Violações" value={report.violations} />
      </div>
      {report.details.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum acesso avaliado no período.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="p-3 font-medium">Timestamp</th>
                <th className="p-3 font-medium">Categoria</th>
                <th className="p-3 font-medium">Decisão</th>
                <th className="p-3 font-medium">Consent Status</th>
                <th className="p-3 font-medium">Compliant</th>
                <th className="p-3 font-medium">Violação</th>
              </tr>
            </thead>
            <tbody>
              {report.details.map((d, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3 text-xs">{new Date(d.timestamp).toLocaleString('pt-BR')}</td>
                  <td className="p-3">{d.dataCategory}</td>
                  <td className="p-3">
                    <DecisionPill decision={d.decision} />
                  </td>
                  <td className="p-3">{d.consentStatus}</td>
                  <td className="p-3">
                    {d.compliant ? (
                      <span className="font-medium text-green-600">Sim</span>
                    ) : (
                      <span className="font-medium text-red-600">Não</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-red-600">{d.violation ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AnomaliesView({ items }: { items: AnomalyResponse[] }) {
  if (items.length === 0) return <p className="text-sm text-gray-400">Nenhuma anomalia detectada.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-gray-500">
            <th className="p-3 font-medium">Timestamp</th>
            <th className="p-3 font-medium">Trace ID</th>
            <th className="p-3 font-medium">Titular</th>
            <th className="p-3 font-medium">Categoria</th>
            <th className="p-3 font-medium">Finalidade</th>
            <th className="p-3 font-medium">Violação</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.traceId} className="border-b last:border-0">
              <td className="p-3 text-xs">{new Date(a.timestamp).toLocaleString('pt-BR')}</td>
              <td className="p-3 font-mono text-xs">{a.traceId}</td>
              <td className="p-3">{a.dataSubjectId}</td>
              <td className="p-3">{a.dataCategory}</td>
              <td className="p-3">{a.purpose}</td>
              <td className="p-3 text-red-600">{a.violationReason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProofView({ proof }: { proof: AccessProofResponse }) {
  const ok = proof.verdict === 'LEGITIMATE' || proof.verdict?.toUpperCase() === 'LEGITIMATE';
  return (
    <div className="space-y-4">
      <ProofBanner
        isCompliant={ok}
        title={`Veredito: ${proof.verdict}`}
        detail={`Trace ID: ${proof.traceId}`}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Fluxo do Acesso (por serviço)</h3>
        <div className="space-y-2">
          {proof.flow.map((f, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded border p-3 text-sm">
              <span className="font-semibold">{f.service}</span>
              <span className="text-xs text-gray-500">
                {f.method} {f.endpoint}
              </span>
              <span className="ml-auto">
                <DecisionPill decision={f.decision} />
              </span>
              {f.deniedReason && <span className="text-xs text-red-600">{f.deniedReason}</span>}
              <span className="w-full text-xs text-gray-400">
                purpose={f.purpose ?? '—'} · resource={f.resource} · categories=
                {f.dataCategories.join(',') || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Prova de Consentimento</h3>
        <div className="space-y-2">
          {proof.consentProof.map((c, i) => (
            <div
              key={i}
              className={`rounded border p-3 text-sm ${
                c.legitimate ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{c.dataCategory}</span>
                <span className="text-xs text-gray-500">purpose={c.purpose}</span>
                <span
                  className={`ml-auto font-medium ${
                    c.legitimate ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {c.statusAtAccessTime}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                concedido por evento {c.grantedByEvent.eventId} em{' '}
                {new Date(c.grantedByEvent.timestamp).toLocaleString('pt-BR')}
              </div>
              {!c.legitimate && (
                <div className="mt-1 text-xs font-medium text-red-700">
                  Violação: {c.violationReason ?? '—'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DecisionPill({ decision }: { decision: string }) {
  const upper = decision.toUpperCase();
  const cls =
    upper === 'ALLOW' || upper === 'GRANTED' || upper === 'TRUE'
      ? 'bg-green-100 text-green-800'
      : upper === 'DENY' || upper === 'DENIED' || upper === 'FALSE'
        ? 'bg-red-100 text-red-800'
        : 'bg-yellow-100 text-yellow-800';
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {decision}
    </span>
  );
}
