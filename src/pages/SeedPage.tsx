import { useState } from 'react';
import { createUser } from '../api/user';
import { grantConsent } from '../api/consent';
import { createBillingRecord, getBillingWithProfile } from '../api/billing';
import { createPromotion, getPromotionWithProfile } from '../api/promotion';
import { ProofBanner } from '../components/ProofBanner';

const AUTHORS = [
  { dataCategory: 'PERSONAL_DATA', purposes: ['BILLING', 'PROMOTION', 'ANALYTICS'] },
  { dataCategory: 'CONTRACT_DATA', purposes: ['BILLING'] },
  { dataCategory: 'USAGE_DATA', purposes: ['PROMOTION', 'ANALYTICS'] },
  { dataCategory: 'FINANCIAL_DATA', purposes: ['BILLING'] },
];

interface LogLine {
  kind: 'ok' | 'err' | 'info';
  text: string;
}

export function SeedPage() {
  const [count, setCount] = useState(5);
  const [consentPct, setConsentPct] = useState(80);
  const [withData, setWithData] = useState(true);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [stats, setStats] = useState({ users: 0, consented: 0, allowed: 0, denied: 0 });

  const push = (line: LogLine) => setLogs((prev) => [...prev, line]);
  const pushLog = (kind: LogLine['kind'], text: string) => push({ kind, text });

  const run = async () => {
    setRunning(true);
    setLogs([]);
    setStats({ users: 0, consented: 0, allowed: 0, denied: 0 });
    const run = Date.now();
    const s = { users: 0, consented: 0, allowed: 0, denied: 0 };

    for (let i = 1; i <= count; i++) {
      try {
        const user = await createUser({
          fullName: `Titular Demo ${i}`,
          email: `demo${run}${i}@console.local`,
          documentNumber: String(10000000000 + (run % 100000000) + i * 3).padStart(11, '0'),
          birthDate: '1992-05-15',
        });
        s.users++;
        const uid = user.data.id;

        const consented = Math.random() * 100 < consentPct;
        if (!consented) {
          pushLog('err', `#${uid} sem consentimento — acessos serão negados`);
        } else {
          s.consented++;
          await grantConsent({
            ownerId: uid,
            authorizations: AUTHORS,
            legalBasis: 'CONSENT',
            issuedBy: { issuer: 'USER', id: uid },
          });
          pushLog('ok', `#${uid} consentimento concedido`);
          await new Promise((r) => setTimeout(r, 250));

          if (withData) {
            const bill = await createBillingRecord({
              dataSubjectId: String(uid),
              description: `Fatura demo ${i}`,
              amount: Math.round(50 + Math.random() * 400),
            });
            const c1 = await tryAccess(() => getBillingWithProfile(uid, bill.data.id, 'BILLING'));
            c1 ? s.allowed++ : s.denied++;
            pushLog(c1 ? 'ok' : 'err', `#${uid} billing with-profile → ${c1 ? 'ALLOWED' : 'DENIED'}`);

            const c2 = await tryAccess(() => getPromotionWithProfile(uid, 'PROMOTION'));
            c2 ? s.allowed++ : s.denied++;
            pushLog(c2 ? 'ok' : 'err', `#${uid} promotion with-profile → ${c2 ? 'ALLOWED' : 'DENIED'}`);
          }
        }
      } catch (e) {
        pushLog('err', `erro ao criar #${i}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (withData) {
      try {
        await createPromotion(
          {
            dataSubjectId: '1',
            name: `Mega Oferta ${run}`,
            description: 'Gerada pelo console',
            discountPercent: 20,
            startDate: '2026-09-01',
            endDate: '2026-12-31',
            targetSegment: 'PREMIUM',
          },
          'PROMOTION',
        );
      } catch {
        /* opcional */
      }
    }

    setStats(s);
    setRunning(false);
    pushLog('info', 'Concluído. Confira Auditoria → Trilha e a Linha do Tempo.');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Gerar massa de dados</h2>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-600">Quantidade de usuários</span>
          <input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-600">% com consentimento</span>
          <input
            type="number"
            min={0}
            max={100}
            value={consentPct}
            onChange={(e) => setConsentPct(Number(e.target.value))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-end gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            checked={withData}
            onChange={(e) => setWithData(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="font-medium text-gray-600">Gerar faturas/promoções e acessos</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {running ? 'Gerando…' : 'Gerar massa'}
        </button>
        <button
          type="button"
          onClick={() => setLogs([])}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Limpar log
        </button>
      </div>

      {stats.users > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Usuários criados" value={stats.users} color="text-gray-700" />
          <Stat label="Com consentimento" value={stats.consented} color="text-green-600" />
          <Stat label="Acessos ALLOWED" value={stats.allowed} color="text-green-600" />
          <Stat label="Acessos DENIED" value={stats.denied} color="text-red-600" />
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-black p-3 font-mono text-xs leading-5 text-green-300">
        {logs.length === 0 && <p className="text-gray-500">$ aguardando geração…</p>}
        {logs.map((l, i) => (
          <p key={i} className={l.kind === 'err' ? 'text-red-400' : l.kind === 'info' ? 'text-yellow-300' : ''}>
            {l.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}

async function tryAccess(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch {
    return false;
  }
}
