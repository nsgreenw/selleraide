import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 backdrop-blur-lg border-b border-white/10 bg-black/40">
        <div className="max-w-3xl mx-auto flex items-center justify-between py-4 px-6">
          <Link href="/">
            <Logo variant="full" size="sm" />
          </Link>
          <Link href="/login" className="btn-secondary text-sm py-1.5 px-3">
            Sign In
          </Link>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            &copy; 2026 SellerAide. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="text-xs text-zinc-500 hover:text-zinc-300">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-zinc-500 hover:text-zinc-300">
              Terms
            </Link>
            <Link href="/cookies" className="text-xs text-zinc-500 hover:text-zinc-300">
              Cookies
            </Link>
            <Link href="/acceptable-use" className="text-xs text-zinc-500 hover:text-zinc-300">
              Acceptable Use
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
