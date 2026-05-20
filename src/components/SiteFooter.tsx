import { Link } from "@tanstack/react-router";
import logoImg from "@/assets/prima-donna-logo.png";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 px-6 py-10">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="The Preschool Prima Donna" width={56} height={56} className="h-10 sm:h-12 md:h-14 w-auto aspect-square" />
          <span className="hidden sm:inline">© {new Date().getFullYear()} — Strategy for women who run rooms full of futures.</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link to="/privacy" className="hover:text-primary transition">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-primary transition">Terms of Service</Link>
          <Link to="/cookies" className="hover:text-primary transition">Cookie Policy</Link>
        </nav>
      </div>
    </footer>
  );
}
