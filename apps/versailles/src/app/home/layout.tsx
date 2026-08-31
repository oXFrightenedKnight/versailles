import AuthGuard from "@/components/clerk/AuthGuard";
import Image from "next/image";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <div className="relative min-h-dvh w-full overflow-hidden">
        <div className="fixed inset-0 -z-10 bg-black">
          <Image
            src="/site_assets/guide_preview.png"
            alt=""
            fill
            priority
            draggable={false}
            className="pointer-events-none select-none object-cover blur-sm opacity-50"
          />
        </div>

        {children}
      </div>
    </AuthGuard>
  );
}
