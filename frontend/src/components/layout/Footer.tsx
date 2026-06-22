import { Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

export default function Footer() {
  const { t } = useTranslation();

  const navLinks = [
    { to: '/',        label: t('nav.home') },
    { to: '/explore', label: t('nav.explore') },
    { to: '/dashboard', label: t('nav.dashboard') },
    { to: '/story',   label: t('nav.story') },
    { to: '/report',  label: t('nav.report') },
  ];

  return (
    <footer className="bg-[#F4F7F4] text-text" role="contentinfo">

      {/* Colonnes principales */}
      <div className="max-w-7xl mx-auto px-6 py-14
                      grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-10">

        {/* Colonne 1 — Identité */}
        <div className="space-y-4">
          {/* Logo app */}
          <div className="flex items-center gap-2">
            <Sprout size={20} className="text-togo-green" />
            <span className="font-black text-togo-green text-lg">AgriMap Togo</span>
          </div>
          {/* Entreprise */}
          <p className="text-secondary text-xs uppercase tracking-widest">
            by NATAAN GROUP
          </p>
          {/* Tagline */}
          <p className="text-muted text-sm leading-relaxed max-w-[200px]">
            {t('footer.tagline')}
          </p>
        </div>

        {/* Colonne 2 — Navigation */}
        <div className="space-y-4">
          <h4 className="text-muted text-xs uppercase tracking-widest font-semibold">
            {t('footer.nav.title')}
          </h4>
          <ul className="space-y-2">
            {navLinks.map(({ to, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="text-muted hover:text-togo-green text-sm transition-colors duration-150"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne 3 — Données */}
        <div className="space-y-4">
          <h4 className="text-muted text-xs uppercase tracking-widest font-semibold">
            {t('footer.data.title')}
          </h4>
          <ul className="space-y-2 text-sm text-muted">
            <li>{t('footer.data.source1')}</li>
            <li>{t('footer.data.source2')}</li>
            <li>{t('footer.data.source3')}</li>
            <li>
              <a
                href="/report"
                className="hover:text-togo-green transition-colors duration-150"
              >
                {t('footer.data.methodology')}
              </a>
            </li>
          </ul>
        </div>

        {/* Colonne 4 — Contact */}
        <div className="space-y-4">
          <h4 className="text-muted text-xs uppercase tracking-widest font-semibold">
            {t('footer.contact.title')}
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://nataan.group"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-togo-green transition-colors duration-150"
              >
                nataan.group ↗
              </a>
            </li>
            <li>
              <a
                href="mailto:contact@nataan.group"
                className="text-muted hover:text-togo-green transition-colors duration-150"
              >
                contact@nataan.group
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Barre tricolore Togo */}
      <div
        className="h-0.5 w-full"
        style={{ background: 'linear-gradient(90deg,#006A4E 33%,#FFD100 33% 66%,#D21034 66%)' }}
        aria-hidden="true"
      />

      {/* Bas de page */}
      <div className="bg-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5
                        flex flex-col tablet:flex-row items-center justify-between gap-3
                        text-gray-500 text-xs">
          <span>© {new Date().getFullYear()} NATAAN GROUP · AgriMap Togo</span>
          <span>{t('footer.open_data')}</span>
        </div>
      </div>

    </footer>
  );
}
