'use client';

export default function TutorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h1>Something went wrong</h1>
      <p>We could not load this page. Please try again.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
