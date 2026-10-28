import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getConsentHistory } from '../api/consent';
import { getAccessProof, getSubjectTrail } from '../api/audit';
import { listUsers } from '../api/user';
import { consentHistoryAt } from '../utils/consentHistory';
import type {
  AccessProofResponse,
  ConsentHistoryEntry,
  TrailItem,
} from '../types';

type Entry =
  | { kind: 'grant'; at: number; category: string; purpose: string; legalBasis: string }
  | { kind: 'revoke'; at: number; category: string; purpose: string; reason: string }
  | { kind: 'access'; at: number; trail: TrailItem };

const toMs = (ts: string) => Date.parse(ts.endsWith('Z') ? ts : `${ts}Z`);

const entryId = (e: Entry): string => {
  if (e.kind === 'access') return `${e.trail.traceId}-${e.trail.timestamp}-${e.trail.endpoint}-${e.trail.decision}`;
  return `${e.kind}-${e.at}-${e.category}-${e.purpose}`;
};

export function TimelinePage() {
  const [userId, setUserId] = useState<number | ''>('');
  const [expanded, setExpanded] = useState<TrailItem | null>(null);

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers().then((r) => r.data),
    retry: false,
  });

  const enabled = userId !== '';

  const historyQ = useQuery({
    queryKey: ['consent-history', userId],
    queryFn: () => getConsentHistory(Number(userId)).then((r) => r.data),
    enabled,
    retry: false,
  });

  const trailQ = useQuery({
    queryKey: ['audit-trail', userId],
    queryFn: () => getSubjectTrail(Number(userId)).then((r) => r.data),
    enabled,
    retry: false,
  });

  const proofQ = useQuery({
    queryKey: ['proof', expanded?.traceId],
    queryFn: () => getAccessProof(expanded!.traceId).then((r) => r.data),
    enabled: expanded !== null,
    retry: false,
  });

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];
    for (const ev of historyQ.data?.events ?? []) {
      const at = toMs(ev.occurredAt);
      if (ev.eventType === 'ConsentGranted') {
        list.push({ kind: 'grant', at, category: ev.dataCategory, purpose: ev.finality, legalBasis: 'CONSENT' });
      } else if (ev.eventType === 'ConsentRevoked') {
        list.push({ kind: 'revoke', at, category: ev.dataCategory, purpose: ev.finality, reason: 'Revogação registrada' });
      }
    }
    for (const t of trailQ.data ?? []) {
      list.push({ kind: 'access', at: toMs(t.timestamp), trail: t });
    }
    return list.sort((a, b) => b.at - a.at);
  }, [historyQ.data, trailQ.data]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Linha do Tempo do Titular</h2>
      <p className="text-sm text-gray-500">
        Visualização cronológica de todos os eventos de consentimento e acesso. As ações (conceder, revogar, acessar dados) são realizadas nas abas correspondentes.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value ? Number(e.target.value) : '');
            setExpanded(null);
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

      {!enabled && <p className="text-sm text-gray-400">Selecione um titular para ver a linha do tempo.</p>}

      {enabled && entries.length === 0 && !historyQ.isLoading && !trailQ.isLoading && (
        <p className="text-sm text-gray-400">
          Nenhum evento registrado. Conceda consentimentos ou acesse dados nas abas correspondentes para gerar eventos.
        </p>
      )}

      <div className="space-y-3">
        {entries.map((e) => (
          <TimelineRow
            key={entryId(e)} entry={e} expanded={expanded}
            onToggle={() => e.kind === 'access' && setExpanded(expanded === e.trail ? null : e.trail)}
            proof={proofQ.data} proofLoading={proofQ.isLoading} proofError={proofQ.isError}
            history={historyQ.data?.events ?? []} historyLoading={historyQ.isLoading} historyError={historyQ.isError}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineRow({
  entry,
  expanded,
  onToggle,
  proof,
  proofLoading,
  proofError,
  history,
  historyLoading,
  historyError,
}: {
  entry: Entry;
  expanded: TrailItem | null;
  onToggle: () => void;
  proof?: AccessProofResponse;
  proofLoading: boolean;
  proofError: boolean;
  history: ConsentHistoryEntry[];
  historyLoading: boolean;
  historyError: boolean;
}) {
  if (entry.kind === 'grant') {
    return (
      <div className="flex gap-3">
        <Badge kind="grant" />
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 text-sm">
          <p className="font-medium text-green-800">
            Consentimento concedido — {entry.category} / {entry.purpose}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {new Date(entry.at).toLocaleString('pt-BR')} · base legal {entry.legalBasis}
          </p>
        </div>
      </div>
    );
  }

  if (entry.kind === 'revoke') {
    return (
      <div className="flex gap-3">
        <Badge kind="revoke" />
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 text-sm">
          <p className="font-medium text-red-800">
            Consentimento revogado — {entry.category} / {entry.purpose}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {new Date(entry.at).toLocaleString('pt-BR')} · {entry.reason}
          </p>
        </div>
      </div>
    );
  }

  const t = entry.trail;
  const allowed = t.decision === 'ALLOWED';
  const isOpen = expanded === t;

  return (
    <div className="flex gap-3">
      <Badge kind={allowed ? 'allow' : 'deny'} />
      <div className="flex-1 rounded-lg border border-gray-200 bg-white p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-medium text-gray-800">
              Acesso a dados — {t.purpose}
              <span
                className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  allowed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {t.decision}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {new Date(entry.at).toLocaleString('pt-BR')} · {t.method} {t.endpoint} ·{' '}
              {t.dataCategories.join(', ')} · via {t.clientId}
            </p>
            {!allowed && t.deniedReason && (
              <p className="mt-1 text-xs text-red-600">Motivo: {t.deniedReason}</p>
            )}
          </div>
          <button
              type="button"
              onClick={onToggle}
              aria-expanded={isOpen}
              className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              {isOpen ? 'Fechar prova' : 'Ver prova'}
          </button>
        </div>

        {isOpen && (
          <div className="mt-3 space-y-3 rounded border border-gray-200 bg-gray-50 p-3">
            {proofLoading && <p className="text-xs text-gray-400">Carregando prova de acesso…</p>}
            {proofError && <p role="alert" className="text-xs text-red-600">Não foi possível carregar a prova. Feche e tente novamente.</p>}
            {!proofLoading && proof && (
              <ProofView proof={proof} trail={t} history={history} historyLoading={historyLoading} historyError={historyError} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ kind }: { kind: 'grant' | 'revoke' | 'allow' | 'deny' }) {
  const map = {
    grant: 'bg-green-100 text-green-700',
    revoke: 'bg-red-100 text-red-700',
    allow: 'bg-emerald-100 text-emerald-700',
    deny: 'bg-red-100 text-red-700',
  } as const;
  const label = { grant: 'C', revoke: 'R', allow: 'A', deny: 'N' } as const;
  return (
    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${map[kind]}`}>
      {label[kind]}
    </span>
  );
}

function ProofView({ proof, trail, history, historyLoading, historyError }: {
  proof: AccessProofResponse;
  trail: TrailItem;
  history: ConsentHistoryEntry[];
  historyLoading: boolean;
  historyError: boolean;
}) {
  return (
    <div className="space-y-5">
      <pre className="overflow-x-auto rounded bg-white p-3 text-xs leading-relaxed text-gray-600">
        {JSON.stringify(trail, null, 2)}
      </pre>

      {historyLoading ? (
        <p className="text-xs text-gray-400">Carregando consentimentos...</p>
      ) : historyError ? (
        <p role="alert" className="text-xs text-red-600">Não foi possível carregar os consentimentos.</p>
      ) : [...new Set(trail.dataCategories)].map((category) => {
        const { events, activeIndex } = consentHistoryAt(history, category, trail.purpose, trail.timestamp);
        return (
          <div key={category}>
            <p className="mb-3 font-mono text-xs text-gray-500">{category} / {trail.purpose}</p>
            <ol className="ml-1 space-y-3 border-l border-gray-200 pl-4">
              {events.map((event, index) => (
                <li key={`${event.version}-${event.occurredAt}`} className="relative">
                  <span aria-hidden="true" className={`absolute -left-[21px] top-4 h-2 w-2 rounded-full ${index === activeIndex ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                  <div className={`rounded-md border p-3 ${index === activeIndex ? 'border-indigo-300 bg-indigo-50/60' : 'border-transparent bg-white/60'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-gray-700">{event.eventType}</span>
                      {index === activeIndex && <span className="text-xs font-medium text-indigo-700">Neste acesso</span>}
                    </div>
                    <p className="mt-1 font-mono text-xs text-gray-400">{event.occurredAt} · v{event.version}</p>
                    <details className="mt-2 text-xs text-gray-500">
                      <summary className="cursor-pointer">JSON</summary>
                      <pre className="mt-2 overflow-x-auto text-gray-600">{JSON.stringify(event, null, 2)}</pre>
                    </details>
                  </div>
                </li>
              ))}
              {activeIndex === -1 && (
                <li className="text-xs text-gray-400">Sem consentimento registrado antes deste acesso.</li>
              )}
            </ol>
          </div>
        );
      })}

      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer">Registros por serviço</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-white p-3 text-gray-600">{JSON.stringify(proof.flow, null, 2)}</pre>
      </details>
    </div>
  );
}
