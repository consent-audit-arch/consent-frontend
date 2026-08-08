import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/20/solid';

export function ProofBanner({
  isCompliant,
  title,
  detail,
}: {
  isCompliant: boolean;
  title: string;
  detail?: string;
}) {
  return (
    <div
      className={`rounded-md border p-4 ${
        isCompliant
          ? 'border-green-200 bg-green-50'
          : 'border-red-200 bg-red-50'
      }`}
    >
      <div className="flex gap-3">
        {isCompliant ? (
          <CheckCircleIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-green-500" />
        ) : (
          <XCircleIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-red-500" />
        )}
        <div>
          <p
            className={`text-sm font-semibold ${
              isCompliant ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {title}
          </p>
          {detail && (
            <p
              className={`mt-1 text-xs ${
                isCompliant ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
