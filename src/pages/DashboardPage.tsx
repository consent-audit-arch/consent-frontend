import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics, getDashboardTimeSeries } from '../api/dashboard';
import { ProofBanner } from '../components/ProofBanner';
import type { DimensionMetrics, TimeSeriesEntry } from '../types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function DashboardPage() {
  const [from, setFrom] = useState(addDaysIso(todayIso(), -6));
  const [to, setTo] = useState(todayIso());

  const metricsQ = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => getDashboardMetrics().then((r) => r.data),
    retry: false,
  });

  const tsQ = useQuery({
    queryKey: ['dashboard-timeseries', from, to],
    queryFn: () => getDashboardTimeSeries(from, to).then((r) => r.data),
    retry: false,
  });

  const metrics = metricsQ.data;
  const ts = tsQ.data?.data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-500">Período</label>
        <input
          type="date"
          value={from}
          onChange={(e) => e.target.value && setFrom(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <label className="text-xs text-gray-500">até</label>
        <input
          type="date"
          value={to}
          onChange={(e) => e.target.value && setTo(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <span className="font-mono text-xs text-gray-400">
          {from} → {to}
        </span>
      </div>

      {metricsQ.isError && (
        <ProofBanner
          isCompliant={false}
          title="Erro ao carregar métricas"
          detail={
            metricsQ.error instanceof Error
              ? metricsQ.error.message
              : 'Verifique se o dashboard-query-service está ativo.'
          }
        />
      )}

      {metrics && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Consentimentos Ativos" value={metrics.activeConsents} />
            <StatCard label="Total Concedidos" value={metrics.totalGranted} />
            <StatCard label="Total Revogados" value={metrics.totalRevoked} />
          </div>

          {metrics.lastUpdated && (
            <p className="text-xs text-gray-400">
              Última atualização:{' '}
              {new Date(metrics.lastUpdated).toLocaleString('pt-BR')} · último evento:{' '}
              {metrics.lastProcessedEventId ?? '—'}
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DimensionTable title="Por Finalidade" rows={metrics.byFinality} />
            <DimensionTable title="Por Categoria" rows={metrics.byCategory} />
          </div>
        </>
      )}

      {tsQ.isError && (
        <ProofBanner
          isCompliant={false}
          title="Erro na série temporal"
          detail={tsQ.error instanceof Error ? tsQ.error.message : 'Consulte o intervalo corretamente.'}
        />
      )}

      {ts.length > 0 && <TimeSeriesTable rows={ts} />}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-indigo-600">{value}</p>
    </div>
  );
}

function DimensionTable({
  title,
  rows,
}: {
  title: string;
  rows: DimensionMetrics[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">Sem dados.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="pb-2 font-medium">Nome</th>
              <th className="pb-2 font-medium">Ativos</th>
              <th className="pb-2 font-medium">Concedidos</th>
              <th className="pb-2 font-medium">Revogados</th>
              <th className="pb-2 font-medium">Revoke %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b last:border-0">
                <td className="py-2 font-medium text-gray-800">{row.name}</td>
                <td className="py-2">{row.active}</td>
                <td className="py-2">{row.granted}</td>
                <td className="py-2">{row.revoked}</td>
                <td className="py-2">{row.revokeRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TimeSeriesTable({ rows }: { rows: TimeSeriesEntry[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Série Temporal</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="pb-2 font-medium">Data</th>
            <th className="pb-2 font-medium">Concedidos</th>
            <th className="pb-2 font-medium">Revogados</th>
            <th className="pb-2 font-medium">Ativos (fim do dia)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date} className="border-b last:border-0">
              <td className="py-2">{row.date}</td>
              <td className="py-2">{row.granted}</td>
              <td className="py-2">{row.revoked}</td>
              <td className="py-2">{row.activeAtEnd}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
