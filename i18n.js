import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import am from './translations/am.json';
import en from './translations/en.json';

const locale = Localization.getLocales()[0]?.languageCode || 'en';
const language = locale.startsWith('am') ? 'am' : 'en';

i18n
  .use(initReactI18next)
  .init({
    lng: language,
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      am: { translation: am },
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
