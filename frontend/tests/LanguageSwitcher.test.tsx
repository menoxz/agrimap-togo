import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageSwitcher from '../src/components/layout/LanguageSwitcher';

// Init i18n for tests
i18n.use(initReactI18next).init({
  resources: {
    fr: { common: {} },
    en: { common: {} },
  },
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorageMock.clear();
    i18n.changeLanguage('fr');
  });

  it('renders in navbar variant', () => {
    renderWithI18n(<LanguageSwitcher variant="navbar" />);
    // Should have FR/EN buttons on desktop
    const buttons = screen.getAllByRole('radio');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('FR');
    expect(buttons[1]).toHaveTextContent('EN');
  });

  it('shows FR as active by default', () => {
    renderWithI18n(<LanguageSwitcher variant="navbar" />);
    const buttons = screen.getAllByRole('radio');
    expect(buttons[0]).toHaveAttribute('aria-checked', 'true');
    expect(buttons[1]).toHaveAttribute('aria-checked', 'false');
  });

  it('switches to EN on click', () => {
    renderWithI18n(<LanguageSwitcher variant="navbar" />);
    const buttons = screen.getAllByRole('radio');
    fireEvent.click(buttons[1]);
    expect(buttons[0]).toHaveAttribute('aria-checked', 'false');
    expect(buttons[1]).toHaveAttribute('aria-checked', 'true');
    expect(i18n.language).toBe('en');
  });

  it('renders footer variant', () => {
    renderWithI18n(<LanguageSwitcher variant="footer" />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('EN');
  });

  it('toggles language on footer variant click', () => {
    renderWithI18n(<LanguageSwitcher variant="footer" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button).toHaveTextContent('FR');
    expect(i18n.language).toBe('en');
  });
});
