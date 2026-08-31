import AuthGuard from "@/components/clerk/AuthGuard";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <div className="relative min-h-screen">{children}</div>
    </AuthGuard>
  );
}
