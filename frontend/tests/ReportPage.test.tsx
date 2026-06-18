import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import ReportPage from '../src/pages/ReportPage';

const reportFr = {
  report: {
    title: 'Rapport',
    subtitle: 'Démarche, sources et qualité des données',
    toc: 'Sommaire',
    download_pdf: 'Télécharger PDF',
    copy_link: 'Copier le lien',
    sections: {
      approach: '1. Démarche',
      sources: '2. Sources de données',
      quality: '3. Qualité des données',
      completeness: '3.1 Complétude',
      precision: '3.2 Précision',
      analyses: '4. Analyses',
      density: '4.1 Densité des exploitations',
      zaap: '4.2 Couverture ZAAP',
      access: '4.3 Accessibilité',
      coop: '4.4 Réseau coopératif',
      limits: '5. Limites',
      conclusion: '6. Conclusion',
    },
  },
  content: {
    approach: 'Contenu démarche',
    sources: 'Contenu sources',
    quality_completeness: 'Contenu complétude',
    quality_precision: 'Contenu précision',
    limits: 'Contenu limites',
    conclusion: 'Contenu conclusion',
  },
  badge: {
    data_freshness: 'Données : juin 2026',
  },
};

const i18n = createInstance();
i18n.use(initReactI18next).init({
  resources: {
    fr: {
      report: reportFr,
    },
  },
  lng: 'fr',
  fallbackLng: 'fr',
  defaultNS: 'report',
  ns: ['report'],
  interpolation: { escapeValue: false },
});

const observedElements: Element[] = [];
let observerCallback: IntersectionObserverCallback | null = null;
const mockObserve = vi.fn((element: Element) => {
  observedElements.push(element);
});
const mockDisconnect = vi.fn();
const mockIntersectionObserver = vi.fn((callback: IntersectionObserverCallback) => {
  observerCallback = callback;
  return {
    observe: mockObserve,
    disconnect: mockDisconnect,
    unobserve: vi.fn(),
  };
});
vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

const mockScrollIntoView = vi.fn();
Element.prototype.scrollIntoView = mockScrollIntoView;

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

function renderWithProviders() {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <ReportPage />
      </I18nextProvider>
    </BrowserRouter>,
  );
}

describe('ReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observedElements.length = 0;
    window.history.replaceState({}, '', '/report');
  });

  it('renders TOC entries that exactly map rendered section ids', () => {
    const { container } = renderWithProviders();

    const expectedIds = [
      'approach',
      'sources',
      'quality',
      'completeness',
      'precision',
      'analyses',
      'comparative',
      'limits',
      'conclusion',
    ];

    const tocButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-target]'));
    const uniqueTocTargets = [...new Set(tocButtons.map((button) => button.dataset.target).filter(Boolean))];
    expect(uniqueTocTargets).toEqual(expectedIds);

    const renderedSectionIds = Array.from(container.querySelectorAll<HTMLElement>('[id]'))
      .map((el) => el.id)
      .filter((id) => expectedIds.includes(id));
    expect([...new Set(renderedSectionIds)]).toEqual(expectedIds);
  });

  it('observes and links only existing sections for each TOC entry', () => {
    renderWithProviders();

    const observedIds = [...new Set(observedElements.map((el) => (el as HTMLElement).id))];
    expect(observedIds).toEqual([
      'approach',
      'sources',
      'quality',
      'completeness',
      'precision',
      'analyses',
      'comparative',
      'limits',
      'conclusion',
    ]);
  });

  it('clicking a TOC entry scrolls and updates hash anchor', () => {
    renderWithProviders();

    const target = screen.getAllByText('3.1 Complétude')[0];
    fireEvent.click(target.closest('button') as HTMLButtonElement);

    expect(mockScrollIntoView).toHaveBeenCalled();
    expect(window.location.hash).toBe('#completeness');
  });

  it('keeps 3.2 Précision active when multiple sections intersect', () => {
    const { container } = renderWithProviders();

    const precisionButton = container.querySelector<HTMLButtonElement>('button[data-target="precision"]');
    const limitsButton = container.querySelector<HTMLButtonElement>('button[data-target="limits"]');
    expect(precisionButton).toBeTruthy();
    expect(limitsButton).toBeTruthy();
    expect(observerCallback).toBeTypeOf('function');

    fireEvent.click(precisionButton as HTMLButtonElement);
    expect(window.location.hash).toBe('#precision');

    const precisionSection = document.getElementById('precision') as HTMLElement;
    const limitsSection = document.getElementById('limits') as HTMLElement;

    observerCallback?.(
      [
        {
          isIntersecting: true,
          target: precisionSection,
          boundingClientRect: { top: 10 },
        } as unknown as IntersectionObserverEntry,
        {
          isIntersecting: true,
          target: limitsSection,
          boundingClientRect: { top: 180 },
        } as unknown as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );

    expect(precisionButton?.className).toContain('bg-primary-light');
    expect(limitsButton?.className).not.toContain('bg-primary-light');
  });
});
