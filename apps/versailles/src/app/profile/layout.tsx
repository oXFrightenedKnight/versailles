import AuthGuard from "@/components/clerk/AuthGuard";
import Footer from "@/components/site/footer";
import Navbar from "@/components/site/navbar";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <div className="w-full h-full">
        <Navbar></Navbar>
        {children}
        <Footer></Footer>
      </div>
    </AuthGuard>
  );
}
