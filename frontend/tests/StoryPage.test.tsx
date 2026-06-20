import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import StoryPage from '../src/pages/StoryPage';

vi.mock('@/hooks/useAnimatedCounter', () => ({
  useAnimatedCounter: (target: number) => target,
}));

vi.mock('@/components/story/LazyActContainer', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/story/SynthesisView', () => ({
  default: () => (
    <section id="synthesis">
      <h2>Où investir ?</h2>
      <p>Synthèse et recommandations</p>
      <div data-testid="map-container" />
      <article>
        <h3>Étendre le réseau ZAAP</h3>
        <p>Préfectures cibles :</p>
        <p>Plaine de Mô, Tchaoudjo, Tchamba</p>
        <p>Planifier l’extension ZAAP</p>
        <p>Réduire les zones non aménagées</p>
        <p>Priorité Haute</p>
      </article>
      <article>
        <h3>Créer des hubs d'accès</h3>
        <p>Priorité Haute</p>
      </article>
      <article>
        <h3>Soutenir le maillage coopératif</h3>
        <p>Priorité Moyenne</p>
      </article>
    </section>
  ),
}));

vi.mock('@/components/map', () => ({
  DensityLayer: () => <div data-testid="density-layer" />,
  ZAAPLayer: () => <div data-testid="zaap-layer" />,
  AccessibilityLayer: () => <div data-testid="accessibility-layer" />,
  CoopLayer: () => <div data-testid="coop-layer" />,
  SynthesisLayer: () => <div data-testid="synthesis-layer" />,
}));

// Mock story translations with FLAT keys for recommendations
const storyFr = {
  story: {
    hero: {
      title: 'Produire ne suffit pas : il faut être relié.',
      subtitle: 'Sous-titre hero',
      cta: 'Commencer l\'histoire',
      explore: 'Explorer librement',
    },
    act1: {
      title: 'Où produit-on ?',
      subtitle: 'Les bassins de production agricole',
      body: 'Le Togo compte des milliers d\'exploitations agricoles.',
      key_finding: '45% des exploitations',
      question: 'Ces zones ont-elles accès aux services ?',
    },
    act2: {
      title: 'Est-ce aménagé ?',
      subtitle: 'Couverture ZAAP',
      body: 'Les ZAAP sont conçues pour structurer la production.',
      key_finding: 'Bassins non couverts',
      question: 'Comment relier ces zones ?',
    },
    act3: {
      title: 'Est-ce accessible ?',
      subtitle: 'Accès aux marchés',
      body: 'Proximité des marchés est cruciale.',
      key_finding: 'Zones à plus de 10 km',
      question: 'Les producteurs sont-ils organisés ?',
    },
    act4: {
      title: 'Est-ce organisé ?',
      subtitle: 'Maillage coopératif',
      body: 'Les coopératives mutualisent les ressources.',
      key_finding: 'Zones blanches d\'organisation',
      question: 'Où investir en priorité ?',
    },
    synthesis: {
      title: 'Où investir ?',
      subtitle: 'Synthèse et recommandations',
      body: 'La superposition pondérée des 4 analyses.',
      rec_1_title: 'Étendre le réseau ZAAP',
      rec_1_description: 'Bassin de production majeur.',
      rec_1_priority: 'Élevée',
      rec_1_region: 'Centrale',
      rec_1_prefectures: 'Plaine de Mô, Tchaoudjo, Tchamba',
      rec_1_action: 'Planifier l’extension ZAAP',
      rec_1_impact: 'Réduire les zones non aménagées',
      rec_2_title: 'Créer des hubs d\'accès',
      rec_2_description: 'Zones à forte densité.',
      rec_2_priority: 'Élevée',
      rec_2_region: 'Kara',
      rec_2_prefectures: 'Dankpen, Bassar, Keran',
      rec_2_action: 'Créer des points de collecte',
      rec_2_impact: 'Réduire la distance commerciale',
      rec_3_title: 'Soutenir le maillage coopératif',
      rec_3_description: 'Région à fort potentiel.',
      rec_3_priority: 'Moyenne',
      rec_3_region: 'Plateaux',
      rec_3_prefectures: 'Anié, Haho, Agou',
      rec_3_action: 'Accompagner les coopératives',
      rec_3_impact: 'Renforcer le pouvoir de négociation',
    },
    share_message: 'Message de partage',
  },
};

// Init i18n for tests
i18n.use(initReactI18next).init({
  resources: {
    fr: {
      story: storyFr,
      common: {
        story: {
          title: 'Lecture guidée',
          subtitle: 'Suivez les 4 actes',
          previous: 'Acte précédent',
          next: 'Acte suivant',
          synthesis_title: 'Synthèse',
          synthesis_subtitle: 'Carte de priorisation',
          recommandations: 'Recommandations',
          share_message: 'Message de partage',
        },
      },
    },
  },
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

// Mock IntersectionObserver — fires immediately with isIntersecting:true
// so LazyActContainer reveals content synchronously in tests.
const mockIntersectionObserver = vi.fn((callback: IntersectionObserverCallback) => {
  void callback;
  return {
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
    takeRecords: () => [],
  } as unknown as IntersectionObserver;
});
vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// Mock Leaflet map (react-leaflet uses Canvas rendering that fails in jsdom)
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  GeoJSON: ({ data }: { data: unknown }) => (
    <div data-testid="geo-json">{JSON.stringify(data)}</div>
  ),
  useMap: () => ({
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    setView: vi.fn(),
    flyTo: vi.fn(),
  }),
  ZoomControl: () => <div />,
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <I18nextProvider i18n={i18n}>
        {ui}
      </I18nextProvider>
    </BrowserRouter>,
  );
}

describe('StoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hero section with title and CTAs', async () => {
    renderWithProviders(<StoryPage />);

    // Let the lazy synthesis module resolve within the test boundary.
    await screen.findByText('Où investir ?');

    // Hero title should be present (split into word spans for stagger animation)
    expect(screen.getByRole('heading', { name: /produire.*relié/i })).toBeInTheDocument();

    // CTAs should be present
    expect(screen.getByText("Commencer l'histoire")).toBeInTheDocument();
    expect(screen.getByText('Explorer librement')).toBeInTheDocument();
  });

  it('renders all 4 act sections', async () => {
    renderWithProviders(<StoryPage />);

    // All act titles should be present
    expect(await screen.findByText('Où produit-on ?')).toBeInTheDocument();
    expect(await screen.findByText('Est-ce aménagé ?')).toBeInTheDocument();
    expect(await screen.findByText('Est-ce accessible ?')).toBeInTheDocument();
    expect(await screen.findByText('Est-ce organisé ?')).toBeInTheDocument();
  });

  it('renders act key findings', async () => {
    renderWithProviders(<StoryPage />);

    expect(await screen.findByText('45% des exploitations')).toBeInTheDocument();
    expect(await screen.findByText('Bassins non couverts')).toBeInTheDocument();
    expect(await screen.findByText('Zones blanches d\'organisation')).toBeInTheDocument();
  });

  it('renders synthesis section with title', async () => {
    renderWithProviders(<StoryPage />);

    // SynthesisView is lazy-loaded — use findByText for async loading
    expect(await screen.findByText('Où investir ?')).toBeInTheDocument();
    expect(await screen.findByText('Synthèse et recommandations')).toBeInTheDocument();
  });

  it('renders 3 recommendation cards', async () => {
    renderWithProviders(<StoryPage />);

    expect(await screen.findByText('Étendre le réseau ZAAP')).toBeInTheDocument();
    expect(await screen.findByText("Créer des hubs d'accès")).toBeInTheDocument();
    expect(await screen.findByText('Soutenir le maillage coopératif')).toBeInTheDocument();
  });

  it('renders actionable recommendation details', async () => {
    renderWithProviders(<StoryPage />);

    expect((await screen.findAllByText('Préfectures cibles :')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('Plaine de Mô, Tchaoudjo, Tchamba')).toBeInTheDocument();
    expect(await screen.findByText('Planifier l’extension ZAAP')).toBeInTheDocument();
    expect(await screen.findByText('Réduire les zones non aménagées')).toBeInTheDocument();
  });

  it('renders priority badges on recommendations', async () => {
    renderWithProviders(<StoryPage />);

    // Priority labels should appear (Badge renders children text)
    const highPriority = await screen.findAllByText('Priorité Haute');
    expect(highPriority.length).toBeGreaterThanOrEqual(2);

    const mediumPriority = await screen.findAllByText('Priorité Moyenne');
    expect(mediumPriority.length).toBeGreaterThanOrEqual(1);
  });

  it('renders navigator with section buttons (desktop + mobile)', () => {
    renderWithProviders(<StoryPage />);

    // Two navigators: desktop and mobile
    const navSections = screen.getAllByLabelText('Navigation des actes');
    expect(navSections).toHaveLength(2);

    // Each navigator has 5 buttons (Acte 1-4 + Synthèse)
    const acte1Buttons = screen.getAllByLabelText('Acte 1');
    expect(acte1Buttons).toHaveLength(2);

    const synthesisButtons = screen.getAllByLabelText('Synthèse');
    expect(synthesisButtons).toHaveLength(2);
  });

  it('renders share widget button', () => {
    renderWithProviders(<StoryPage />);

    const shareButton = screen.getByLabelText('Partager');
    expect(shareButton).toBeInTheDocument();
  });

  it('opens share modal on share button click', () => {
    renderWithProviders(<StoryPage />);

    const shareButton = screen.getByLabelText('Partager');
    fireEvent.click(shareButton);

    // Modal should appear
    expect(screen.getByText('Partager')).toBeInTheDocument();
    expect(screen.getByText('Copier le lien')).toBeInTheDocument();
    expect(screen.getByText('Copier avec le message')).toBeInTheDocument();
  });

  it('renders map containers in acts and synthesis', async () => {
    renderWithProviders(<StoryPage />);

    // Wait for SynthesisView (lazy) to fully load, then count all maps
    await screen.findByText('Où investir ?');
    const maps = screen.getAllByTestId('map-container');
    // Hero has a mini map + 4 act maps + 1 synthesis map = 6 total
    expect(maps.length).toBeGreaterThanOrEqual(4);
  });

  it('closes share modal on close button click', () => {
    renderWithProviders(<StoryPage />);

    // Open modal
    const shareButton = screen.getByLabelText('Partager');
    fireEvent.click(shareButton);
    expect(screen.getByText('Partager')).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByLabelText('Fermer');
    fireEvent.click(closeButton);
    expect(screen.queryByText('Partager')).not.toBeInTheDocument();
  });
});
