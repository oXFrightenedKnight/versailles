import Footer from "@/components/site/footer";
import Navbar from "@/components/site/navbar";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full h-full">
      <Navbar></Navbar>
      {children}
      <Footer></Footer>
    </div>
  );
}
