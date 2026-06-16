import { Languages } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface LanguageSwitcherProps {
  variant?: 'navbar' | 'footer';
}

export default function LanguageSwitcher({
  variant = 'navbar',
}: LanguageSwitcherProps) {
  const { currentLang, changeLanguage } = useTranslation();
  const isFr = currentLang === 'fr';

  const toggleLang = () => {
    changeLanguage(isFr ? 'en' : 'fr');
  };

  if (variant === 'footer') {
    return (
      <button
        onClick={toggleLang}
        className="inline-flex items-center gap-2 text-body-sm text-text-secondary hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 rounded-md px-2 py-1"
        aria-label={
          isFr ? 'Switch to English' : 'Basculer en français'
        }
      >
        <Languages size={16} />
        <span className="font-semibold">{isFr ? 'EN' : 'FR'}</span>
      </button>
    );
  }

  return (
    <div
      className="flex items-center"
      role="radiogroup"
      aria-label={isFr ? 'Sélection de la langue' : 'Language selection'}
    >
      {/* Mobile: compact toggle */}
      <button
        onClick={toggleLang}
        className="flex tablet:hidden items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-body-sm font-medium hover:bg-primary-light transition-colors focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2"
        aria-label={
          isFr ? 'Switch to English' : 'Basculer en français'
        }
      >
        <Languages size={16} />
        <span>{isFr ? 'EN' : 'FR'}</span>
      </button>

      {/* Desktop: two pills */}
      <div className="hidden tablet:flex desktop:flex items-center border border-border rounded-full overflow-hidden">
        <button
          onClick={() => changeLanguage('fr')}
          className={`px-3 py-1.5 text-body-sm font-medium transition-colors
            ${
              isFr
                ? 'bg-primary text-white'
                : 'bg-transparent text-text-secondary hover:bg-primary-light'
            }
            focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2`}
          role="radio"
          aria-checked={isFr}
          aria-label="Basculer en français"
        >
          FR
        </button>
        <button
          onClick={() => changeLanguage('en')}
          className={`px-3 py-1.5 text-body-sm font-medium transition-colors
            ${
              !isFr
                ? 'bg-primary text-white'
                : 'bg-transparent text-text-secondary hover:bg-primary-light'
            }
            focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2`}
          role="radio"
          aria-checked={!isFr}
          aria-label="Switch to English"
        >
          EN
        </button>
      </div>
    </div>
  );
}
