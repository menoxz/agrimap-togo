import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonFr from '../../public/locales/fr/common.json';
import actsFr from '../../public/locales/fr/acts.json';
import mapFr from '../../public/locales/fr/map.json';
import reportFr from '../../public/locales/fr/report.json';
import storyFr from '../../public/locales/fr/story.json';

import commonEn from '../../public/locales/en/common.json';
import actsEn from '../../public/locales/en/acts.json';
import mapEn from '../../public/locales/en/map.json';
import reportEn from '../../public/locales/en/report.json';
import storyEn from '../../public/locales/en/story.json';

const resources = {
  fr: {
    common: commonFr,
    acts: actsFr,
    map: mapFr,
    report: reportFr,
    story: storyFr,
  },
  en: {
    common: commonEn,
    acts: actsEn,
    map: mapEn,
    report: reportEn,
    story: storyEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    defaultNS: 'common',
    ns: ['common', 'acts', 'map', 'report', 'story'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'agrimap-lang',
    },
  });

export default i18n;
