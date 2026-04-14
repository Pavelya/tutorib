export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Public header — implemented in a later task */}
      <header />
      <main>{children}</main>
      {/* Public footer — implemented in a later task */}
      <footer />
    </>
  );
}
