import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Sprout } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from './LanguageSwitcher';

interface NavLinkItem {
  to: string;
  labelKey: string;
}

const navLinks: NavLinkItem[] = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/explore', labelKey: 'nav.explore' },
  { to: '/dashboard', labelKey: 'nav.dashboard' },
  { to: '/story', labelKey: 'nav.story' },
  { to: '/report', labelKey: 'nav.report' },
];

export default function Navbar() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  /* ── Scroll-aware navbar elevation ── */
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // synchronise l'état si page chargée en milieu de scroll
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── Fermeture menu mobile à la touche Escape ── */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  /* ── Active link : underline qui slide depuis le centre ── */
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'relative text-body-sm font-medium',
      'rounded-full px-3 py-2',
      'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
      'focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2',
      'hover:-translate-y-1 hover:shadow-md',
      // underline via ::after
      'after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2',
      'after:h-[3px] after:rounded-full after:bg-gradient-to-r after:from-togo-red after:via-togo-yellow after:to-togo-green',
      'after:transition-[width,opacity] after:duration-500 after:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
      isActive
        ? 'text-primary bg-primary-light shadow-[0_10px_30px_rgba(27,94,32,0.16)] after:w-[82%] after:opacity-100'
        : 'text-text-secondary hover:text-primary hover:bg-primary-light/70 after:w-0 after:opacity-0 hover:after:w-[82%] hover:after:opacity-100',
    ].join(' ');

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50 h-16 border-b border-border',
        'bg-white/95 backdrop-blur-sm',
        'transition-[box-shadow,background-color,border-color] duration-500',
        isScrolled ? 'nav-elevated' : '',
      ].join(' ')}
    >
      <nav
        className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 tablet:px-6 desktop:px-8"
        aria-label="Navigation principale"
      >
        {/* ── Logo — icône tourne légèrement au hover ── */}
        <Link
          to="/"
          className="group flex items-center gap-2 text-primary font-bold text-h4 focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 rounded-full px-2 py-1 transition-all duration-300 hover:bg-primary-light hover:shadow-md"
          aria-label={t('aria.home')}
        >
          <Sprout
            size={24}
            className="transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-[32deg] group-hover:scale-125"
          />
          <span className="hidden mobile:inline tablet:inline">
            {t('site.title')}
          </span>
          <span className="inline mobile:hidden tablet:hidden desktop:inline">
            {t('site.title')}
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <div className="hidden tablet:flex desktop:flex items-center gap-6">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass} end>
              {t(link.labelKey)}
            </NavLink>
          ))}
          <LanguageSwitcher variant="navbar" />
        </div>

        {/* ── Mobile hamburger ── */}
        <div className="flex tablet:hidden desktop:hidden items-center gap-2">
          <LanguageSwitcher variant="navbar" />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 text-text-secondary hover:text-primary transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 rounded"
            aria-label={menuOpen ? t('aria.close_menu') : t('aria.open_menu')}
            aria-expanded={menuOpen}
          >
            {/* Icône qui tourne lors du toggle */}
            <span
              className={[
                'block transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                menuOpen ? 'rotate-90 scale-90 opacity-90' : 'rotate-0 scale-100 opacity-100',
              ].join(' ')}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </span>
          </button>
        </div>
      </nav>

      {/* ── Mobile menu — toujours dans le DOM, animé via max-height + opacity ── */}
      <div
        className={`tablet:hidden desktop:hidden bg-white border-b border-border mobile-menu-animated${menuOpen ? ' open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="flex flex-col px-4 py-4 gap-3">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={linkClass}
              end
              onClick={() => setMenuOpen(false)}
              tabIndex={menuOpen ? 0 : -1}
            >
              {t(link.labelKey)}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}
