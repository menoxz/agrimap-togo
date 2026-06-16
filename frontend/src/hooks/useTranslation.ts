import { useTranslation as useI18nTranslation } from 'react-i18next';
import type { SupportedLang } from '@/types';

export function useTranslation() {
  const { t, i18n } = useI18nTranslation();

  const currentLang = i18n.language?.startsWith('fr') ? 'fr' : 'en';

  const changeLanguage = (lang: SupportedLang) => {
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    localStorage.setItem('agrimap-lang', lang);
  };

  return {
    t,
    i18n,
    currentLang: currentLang as SupportedLang,
    changeLanguage,
  };
}
