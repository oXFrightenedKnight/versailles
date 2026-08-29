export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen">
      <div
        className="fixed inset-0 -z-10 opacity-75"
        style={{
          backgroundImage: "url('/textures/water17.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "60px 60px",
        }}
      />
      {children}
    </div>
  );
}
