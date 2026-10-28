import type { ConsentHistoryEntry } from '../types';

function timestampNs(value: string): bigint | null {
  const utc = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  const milliseconds = Date.parse(utc);
  if (!Number.isFinite(milliseconds)) return null;
  const fraction = (value.match(/\.(\d+)/)?.[1] ?? '').padEnd(9, '0');
  return BigInt(milliseconds) * 1_000_000n + BigInt(fraction.slice(3, 9));
}

export function consentHistoryAt(
  history: ConsentHistoryEntry[], category: string, purpose: string, timestamp: string,
) {
  const events = history.filter((event) =>
    event.dataCategory === category && event.finality === purpose &&
    ['ConsentGranted', 'ConsentRevoked'].includes(event.eventType),
  ).sort((a, b) => {
    const first = timestampNs(a.occurredAt);
    const second = timestampNs(b.occurredAt);
    if (first !== null && second !== null && first !== second) return first < second ? -1 : 1;
    return a.version - b.version;
  });
  const at = timestampNs(timestamp);
  let activeIndex = -1;
  events.forEach((event, index) => {
    const time = timestampNs(event.occurredAt);
    if (at !== null && time !== null && time <= at) activeIndex = index;
  });
  return { events, activeIndex };
}
