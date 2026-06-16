import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Github, Sprout } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from './LanguageSwitcher';

interface NavLinkItem {
  to: string;
  labelKey: string;
}

const navLinks: NavLinkItem[] = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/explore', labelKey: 'nav.explore' },
  { to: '/story', labelKey: 'nav.story' },
  { to: '/report', labelKey: 'nav.report' },
];

export default function Navbar() {
  const { t, currentLang } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-body-sm font-medium transition-colors ${
      isActive
        ? 'text-primary'
        : 'text-text-secondary hover:text-primary'
    } focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 rounded px-2 py-1`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/95 backdrop-blur-sm border-b border-border">
      <nav
        className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 tablet:px-6 desktop:px-8"
        aria-label="Navigation principale"
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-primary font-bold text-h4 focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 rounded"
          aria-label={t('aria.home')}
        >
          <Sprout size={24} />
          <span className="hidden mobile:inline tablet:inline">
            {t('site.title')}
          </span>
          <span className="inline mobile:hidden tablet:hidden desktop:inline">
            {t('site.title')}
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden tablet:flex desktop:flex items-center gap-6">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass} end>
              {t(link.labelKey)}
            </NavLink>
          ))}
          <LanguageSwitcher variant="navbar" />
          <a
              href="https://github.com/menoxz/agrimap-togo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 rounded p-1"
            aria-label={t('nav.github')}
          >
            <Github size={20} />
          </a>
        </div>

        {/* Mobile hamburger */}
        <div className="flex tablet:hidden desktop:hidden items-center gap-2">
          <LanguageSwitcher variant="navbar" />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-text-secondary hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 rounded"
            aria-label={menuOpen ? t('aria.close_menu') : t('aria.open_menu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="tablet:hidden desktop:hidden bg-white border-b border-border">
          <div className="flex flex-col px-4 py-4 gap-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={linkClass}
                end
                onClick={() => setMenuOpen(false)}
              >
                {t(link.labelKey)}
              </NavLink>
            ))}
            <a
            href="https://github.com/menoxz/agrimap-togo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-body-sm font-medium text-text-secondary hover:text-primary transition-colors px-2 py-1"
              onClick={() => setMenuOpen(false)}
            >
              <Github size={18} />
              {t('nav.github')}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
