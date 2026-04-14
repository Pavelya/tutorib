'use client';

export default function InternalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h1>Something went wrong</h1>
      <p>An error occurred in the internal tool. Please try again.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
