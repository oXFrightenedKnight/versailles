export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-cyan-700" />
      {children}
    </div>
  );
}
