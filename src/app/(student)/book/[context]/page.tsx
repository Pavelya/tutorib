export default async function BookPage({
  params,
}: {
  params: Promise<{ context: string }>;
}) {
  const { context } = await params;

  return (
    <div>
      <h1>Book a Lesson</h1>
      <p>Context: {context}</p>
    </div>
  );
}
