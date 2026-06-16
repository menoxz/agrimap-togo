#!/usr/bin/env python3
"""
QA Test — Parcours utilisateur AgriMap Togo
=============================================
Teste les parcours obligatoires : Home, Story, Explore, Report, i18n.
Utilise Playwright (Python) avec screenshot à chaque étape clé.
Rapport de test généré en fin de script.
"""

import os
import sys
import traceback
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

BASE_URL = "http://localhost:5173"
SCREENSHOT_DIR = r"C:\jeanluc\data_ai_lab_agri_project\qa_screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# ── Test results accumulator ──────────────────────────────────────────────
results = []
passed = 0
failed = 0
console_errors = []

def screenshot(page, name):
    """Take a screenshot with timestamp."""
    ts = datetime.now().strftime("%H%M%S")
    path = os.path.join(SCREENSHOT_DIR, f"{ts}_{name}.png")
    page.screenshot(path=path, full_page=True)
    return path

def test(name, condition, detail=""):
    """Record a test result."""
    global passed, failed
    if condition:
        passed += 1
        results.append((name, "✅ PASS", detail))
    else:
        failed += 1
        results.append((name, "❌ FAIL", detail))

def check_console(page):
    """Capture console errors from the page."""
    for msg in page.context._pages[0].list_console_messages() if hasattr(page.context, '_pages') and page.context._pages else []:
        pass
    # We check via page.on callback
    try:
        logs = page.evaluate("""() => {
            if (window.__qa_console_logs) return window.__qa_console_logs;
            return [];
        }""")
        if logs:
            for log in logs:
                if log.get('type') in ('error', 'warning'):
                    console_errors.append(log)
    except:
        pass

def capture_console(page):
    """Setup console capture."""
    page.on("console", lambda msg: console_errors.append({
        "type": msg.type,
        "text": msg.text,
        "page": page.url,
    }) if msg.type in ("error", "warning") else None)


# ══════════════════════════════════════════════════════════════════════════
# MAIN TEST RUNNER
# ══════════════════════════════════════════════════════════════════════════

def run_tests():
    global passed, failed, results, console_errors
    passed = 0
    failed = 0
    results = []
    console_errors = []
    screenshots_taken = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="fr-FR",
        )
        page = context.new_page()
        capture_console(page)

        # ──────── 1. HOME PAGE ────────────────────────────────────────────
        print("\n" + "="*60)
        print("🏠 PARCOURS 1 : PAGE D'ACCUEIL")
        print("="*60)

        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)  # Let lazy components load

            sp = screenshot(page, "01-home-full")
            screenshots_taken.append(sp)

            # 1.1 Title "AgriMap Togo" is visible
            title_visible = page.get_by_text("AgriMap Togo").first.is_visible()
            test("Home: titre AgriMap Togo visible", title_visible,
                 "Le titre 'AgriMap Togo' doit être visible dans la navbar")

            # 1.2 Hero headline visible (FR default)
            hero_text = page.get_by_text("Produire ne suffit pas").first
            hero_visible = hero_text.is_visible()
            test("Home: accroche hero visible", hero_visible,
                 "Le texte 'Produire ne suffit pas' doit être visible")

            # 1.3 CTA "Explorer les zones blanches" present
            cta_explore = page.get_by_role("link", name=re.compile(r"Explorer", re.IGNORECASE)).first
            cta_explore_visible = cta_explore.is_visible()
            test("Home: CTA 'Explorer les zones blanches' présent", cta_explore_visible,
                 "Le bouton CTA 'Explorer les zones blanches' doit être visible")

            # 1.4 CTA "Suivre l'histoire" or similar
            cta_story = page.get_by_role("link", name=re.compile(r"histoire|story", re.IGNORECASE)).first
            cta_story_visible = cta_story.is_visible()
            test("Home: CTA 'Suivre l histoire' présent", cta_story_visible,
                 "Le bouton CTA 'Suivre l'histoire' doit être visible")

            # 1.5 Navigation links visible
            nav_explore = page.get_by_role("link", name=re.compile(r"explorer|explore", re.IGNORECASE)).first
            nav_story = page.get_by_role("link", name=re.compile(r"lire|story", re.IGNORECASE)).first
            nav_report = page.get_by_role("link", name=re.compile(r"rapport|report", re.IGNORECASE)).first
            nav_visible = nav_explore.is_visible() and nav_story.is_visible() and nav_report.is_visible()
            test("Home: navigation (Explore/Story/Report) visible", nav_visible,
                 "Les trois liens de navigation doivent être visibles")

            # 1.6 Mini-map Togo (Leaflet) displayed
            leaflet = page.locator(".leaflet-container").first
            leaflet_visible = leaflet.is_visible()
            test("Home: mini-carte Leaflet Togo affichée", leaflet_visible,
                 "La carte Leaflet doit être visible dans la section map")

            # 1.7 Language switcher FR/EN visible
            lang_fr = page.get_by_role("radio", name=re.compile(r"Basculer en français|français", re.IGNORECASE)).first
            lang_en = page.get_by_role("radio", name=re.compile(r"Switch to English|anglais", re.IGNORECASE)).first
            lang_visible = lang_fr.is_visible() and lang_en.is_visible()
            test("Home: bascule langue FR/EN visible", lang_visible,
                 "Les deux boutons radio FR et EN doivent être visibles dans la navbar")

        except Exception as e:
            test("Home: exception", False, f"Erreur: {str(e)}")
            sp = screenshot(page, "01-home-error")
            screenshots_taken.append(sp)

        # ──────── 2. STORY PAGE ────────────────────────────────────────────
        print("\n" + "="*60)
        print("📖 PARCOURS 2 : PAGE STORY")
        print("="*60)

        try:
            # Navigate via link "Suivre l'histoire"
            story_link = page.get_by_role("link", name=re.compile(r"histoire|story", re.IGNORECASE)).first
            if story_link.is_visible():
                story_link.click()
            else:
                page.goto(f"{BASE_URL}/story", wait_until="networkidle", timeout=30000)

            page.wait_for_load_state("networkidle", timeout=30000)
            page.wait_for_timeout(3000)  # Let lazy/animated components load

            sp = screenshot(page, "02-story-hero")
            screenshots_taken.append(sp)

            # 2.1 Story page loaded (check URL)
            on_story = "/story" in page.url
            test("Story: navigation vers /story", on_story,
                 f"L'URL doit contenir /story (actuelle: {page.url})")

            # 2.2 StoryHero visible
            hero_title = page.get_by_text(re.compile(r"Produire ne suffit|Producing is not enough", re.IGNORECASE)).first
            hero_visible = hero_title.is_visible()
            test("Story: StoryHero (titre plein écran) visible", hero_visible,
                 "Le titre du StoryHero doit être visible")

            # 2.3 StoryNavigator visible (contains numbered buttons)
            # Desktop: fixed sidebar with buttons 1,2,3,4,S
            nav_act_1 = page.get_by_role("button", name="Acte 1").first
            nav_act_2 = page.get_by_role("button", name="Acte 2").first
            nav_synthesis = page.get_by_role("button", name="Synthèse").first
            navigator_visible = nav_act_1.is_visible() and nav_act_2.is_visible()
            test("Story: StoryNavigator avec sections visible", navigator_visible,
                 "Les boutons de navigation Acte 1, Acte 2 doivent être visibles")

            # 2.4 Scroll to Act 1
            act1 = page.locator("#act-1")
            act1.scroll_into_view_if_needed()
            page.wait_for_load_state("networkidle", timeout=15000)
            page.wait_for_timeout(2000)  # Wait for leaflet map + IntersectionObserver

            sp = screenshot(page, "02-story-act1")
            screenshots_taken.append(sp)

            act1_title = page.get_by_text(re.compile(r"Où produit-on|Where is production", re.IGNORECASE)).first
            act1_visible = act1_title.is_visible()
            test("Story: Acte 1 avec titre visible", act1_visible,
                 "Le titre de l'Acte 1 doit être visible après scroll")

            # 2.5 Act 1 Leaflet map visible
            act1_map = act1.locator(".leaflet-container").first
            act1_map_visible = act1_map.is_visible()
            test("Story: Acte 1 affiche carte Leaflet", act1_map_visible,
                 "La carte Leaflet dans Acte 1 doit être visible")

            # 2.6 Scroll to Act 2
            act2 = page.locator("#act-2")
            act2.scroll_into_view_if_needed()
            page.wait_for_load_state("networkidle", timeout=15000)
            page.wait_for_timeout(2000)

            act2_title = page.get_by_text(re.compile(r"Est-ce aménagé|Is it developed", re.IGNORECASE)).first
            act2_visible = act2_title.is_visible()
            test("Story: Acte 2 visible après scroll", act2_visible,
                 "Le titre de l'Acte 2 doit être visible après scroll")

            act2_map = act2.locator(".leaflet-container").first
            act2_map_visible = act2_map.is_visible()
            test("Story: Acte 2 affiche carte Leaflet", act2_map_visible,
                 "La carte Leaflet dans Acte 2 doit être visible")

            # 2.7 Scroll to Act 3
            act3 = page.locator("#act-3")
            act3.scroll_into_view_if_needed()
            page.wait_for_load_state("networkidle", timeout=15000)
            page.wait_for_timeout(2000)

            act3_map = act3.locator(".leaflet-container").first
            act3_map_visible = act3_map.is_visible()
            test("Story: Acte 3 affiche carte Leaflet", act3_map_visible,
                 "La carte Leaflet dans Acte 3 doit être visible")
            sp = screenshot(page, "02-story-act3")
            screenshots_taken.append(sp)

            # 2.8 Scroll to Act 4
            act4 = page.locator("#act-4")
            act4.scroll_into_view_if_needed()
            page.wait_for_load_state("networkidle", timeout=15000)
            page.wait_for_timeout(2000)

            act4_map = act4.locator(".leaflet-container").first
            act4_map_visible = act4_map.is_visible()
            test("Story: Acte 4 affiche carte Leaflet", act4_map_visible,
                 "La carte Leaflet dans Acte 4 doit être visible")

            # 2.9 Scroll to Synthesis
            synthesis = page.locator("#synthesis")
            synthesis.scroll_into_view_if_needed()
            page.wait_for_load_state("networkidle", timeout=15000)
            page.wait_for_timeout(2000)

            synthesis_title = page.get_by_text(re.compile(r"Où investir|Where to invest", re.IGNORECASE)).first
            synthesis_visible = synthesis_title.is_visible()
            test("Story: Synthèse affichée avec titre 'Où investir?'", synthesis_visible,
                 "Le titre de la synthèse doit être visible")

            sp = screenshot(page, "02-story-synthesis")
            screenshots_taken.append(sp)

            # 2.10 Synthesis has 3 recommendations
            # Recommendation cards should be inside the synthesis section
            rec_cards = synthesis.locator("h3").all()
            rec_count = len(rec_cards)
            test("Story: Synthèse affiche recommandations", rec_count >= 1,
                 f"Au moins 1 recommandation doit être visible (trouvé: {rec_count})")

            # 2.11 ShareWidget visible
            share_btn = page.get_by_label("Partager").first
            share_btn_visible = share_btn.is_visible()
            test("Story: ShareWidget (bouton partage) présent", share_btn_visible,
                 "Le bouton flottant de partage doit être visible")

            # 2.12 Click share widget opens modal
            if share_btn_visible:
                share_btn.click()
                page.wait_for_timeout(1000)
                share_modal = page.get_by_text("Copier le lien").first
                modal_visible = share_modal.is_visible()
                test("Story: Cliquer ShareWidget ouvre le modal", modal_visible,
                     "Le modal de partage avec 'Copier le lien' doit s'ouvrir")

                # Close modal by clicking outside
                page.locator("body").click(position={"x": 10, "y": 10})
                page.wait_for_timeout(500)
                sp = screenshot(page, "02-story-share-modal")
                screenshots_taken.append(sp)

        except Exception as e:
            test("Story: exception", False, f"Erreur: {str(e)}")
            sp = screenshot(page, "02-story-error")
            screenshots_taken.append(sp)
            traceback.print_exc()

        # ──────── 3. EXPLORE PAGE ──────────────────────────────────────────
        print("\n" + "="*60)
        print("🗺  PARCOURS 3 : PAGE EXPLORE")
        print("="*60)

        try:
            # Navigate via link in navbar
            explore_link = page.get_by_role("link", name=re.compile(r"explorer|explore", re.IGNORECASE)).first
            if explore_link.is_visible():
                explore_link.click()
            else:
                page.goto(f"{BASE_URL}/explore", wait_until="networkidle", timeout=30000)

            page.wait_for_load_state("networkidle", timeout=30000)
            page.wait_for_timeout(3000)  # Let map load

            sp = screenshot(page, "03-explore-full")
            screenshots_taken.append(sp)

            # 3.1 Explore page loaded
            on_explore = "/explore" in page.url
            test("Explore: navigation vers /explore", on_explore,
                 f"L'URL doit contenir /explore (actuelle: {page.url})")

            # 3.2 Page title visible
            explore_title = page.get_by_role("heading", name=re.compile(r"Exploration libre|Free exploration", re.IGNORECASE)).first
            explore_title_visible = explore_title.is_visible()
            test("Explore: titre 'Exploration libre' visible", explore_title_visible,
                 "Le titre de la page Explore doit être visible")

            # 3.3 Leaflet map centered on Togo visible
            explore_map = page.locator(".leaflet-container").first
            explore_map_visible = explore_map.is_visible()
            test("Explore: carte Leaflet centrée sur Togo visible", explore_map_visible,
                 "La carte Leaflet doit être visible sur la page Explore")

            # 3.4 FilterPanel visible (with radio buttons)
            filter_panel = page.get_by_label(re.compile(r"Filtres|Filters", re.IGNORECASE)).first
            filter_visible = filter_panel.is_visible()
            test("Explore: FilterPanel avec options visible", filter_visible,
                 "Le panneau de filtres doit être visible sur desktop")

            # 3.5 Radio buttons for layers
            density_radio = page.get_by_role("radio", name=re.compile(r"Densité|Farm density", re.IGNORECASE)).first
            radio_visible = density_radio.is_visible()
            test("Explore: radio bouton 'Densité' dans FilterPanel", radio_visible,
                 "L'option radio 'Densité' doit être visible dans le panneau")

            # 3.6 MapLegend visible
            legend = page.get_by_text(re.compile(r"Densité d'exploitations|Farm density", re.IGNORECASE)).first
            legend_visible = legend.is_visible()
            test("Explore: légende dynamique affichée", legend_visible,
                 "La légende doit être visible avec le nom de la couche active")

            # 3.7 MapController buttons (zoom, recenter)
            zoom_in = page.get_by_label("Zoom avant").first
            zoom_out = page.get_by_label("Zoom arrière").first
            recenter = page.get_by_label("Recentrer sur le Togo").first
            controller_visible = zoom_in.is_visible() and zoom_out.is_visible()
            test("Explore: MapController (zoom avant/arrière) présent", controller_visible,
                 "Les boutons de zoom avant et arrière doivent être visibles")

            # 3.8 Change layer — click ZAAP radio
            zaap_radio = page.get_by_role("radio", name=re.compile(r"ZAAP", re.IGNORECASE)).first
            if zaap_radio.is_visible():
                zaap_radio.check()
                page.wait_for_timeout(2000)  # Wait for layer to change
                sp = screenshot(page, "03-explore-zaap-layer")
                screenshots_taken.append(sp)
                zaap_checked = zaap_radio.is_checked()
                test("Explore: changer couche vers ZAAP fonctionne", zaap_checked,
                     "Le radio bouton ZAAP doit être coché après clic")

                # Legend should update
                zaap_legend = page.get_by_text(re.compile(r"Couverture ZAAP|ZAAP coverage", re.IGNORECASE)).first
                zaap_legend_visible = zaap_legend.is_visible()
                test("Explore: légende mise à jour après changement couche", zaap_legend_visible,
                     "La légende doit afficher 'Couverture ZAAP' après sélection")

        except Exception as e:
            test("Explore: exception", False, f"Erreur: {str(e)}")
            sp = screenshot(page, "03-explore-error")
            screenshots_taken.append(sp)
            traceback.print_exc()

        # ──────── 4. REPORT PAGE ───────────────────────────────────────────
        print("\n" + "="*60)
        print("📋 PARCOURS 4 : PAGE REPORT")
        print("="*60)

        try:
            # Navigate via navbar
            report_link = page.get_by_role("link", name=re.compile(r"rapport|report", re.IGNORECASE)).first
            if report_link.is_visible():
                report_link.click()
            else:
                page.goto(f"{BASE_URL}/report", wait_until="networkidle", timeout=30000)

            page.wait_for_load_state("networkidle", timeout=30000)
            page.wait_for_timeout(2000)

            sp = screenshot(page, "04-report-full")
            screenshots_taken.append(sp)

            # 4.1 Report page loaded
            on_report = "/report" in page.url
            test("Report: navigation vers /report", on_report,
                 f"L'URL doit contenir /report (actuelle: {page.url})")

            # 4.2 Report title visible
            report_title = page.get_by_role("heading", name=re.compile(r"rapport|report", re.IGNORECASE)).first
            report_title_visible = report_title.is_visible()
            test("Report: titre 'Rapport' visible", report_title_visible,
                 "Le titre de la page Rapport doit être visible")

            # 4.3 Content sections visible
            approach_section = page.get_by_text(re.compile(r"1\. Démarche|1\. Methodology", re.IGNORECASE)).first
            approach_visible = approach_section.is_visible()
            test("Report: section '1. Démarche' présente", approach_visible,
                 "La section Démarche doit être visible")

            # 4.4 TOC (table of contents) visible on desktop
            toc = page.get_by_text(re.compile(r"Sommaire|Table of contents", re.IGNORECASE)).first
            toc_visible = toc.is_visible()
            test("Report: sommaire/TOC présent", toc_visible,
                 "Le sommaire doit être visible sur desktop")

            # 4.5 Data quality table present
            quality_table = page.locator("table").first
            table_visible = quality_table.is_visible()
            test("Report: tableau qualité des données présent", table_visible,
                 "Le tableau de qualité des données doit être visible")

        except Exception as e:
            test("Report: exception", False, f"Erreur: {str(e)}")
            sp = screenshot(page, "04-report-error")
            screenshots_taken.append(sp)
            traceback.print_exc()

        # ──────── 5. i18n LANGUAGE SWITCHING ───────────────────────────────
        print("\n" + "="*60)
        print("🌐 PARCOURS 5 : BASCULE LINGUISTIQUE i18n")
        print("="*60)

        try:
            # Navigate to Home first
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1500)

            # 5.1 Check FR is default
            fr_headline = page.get_by_text("Produire ne suffit pas").first
            fr_visible = fr_headline.is_visible()
            test("i18n: texte FR par défaut (accroche hero)", fr_visible,
                 "L'accroche 'Produire ne suffit pas' doit être visible en français")

            # 5.2 Click EN pill to switch to English
            en_btn = page.get_by_role("radio", name=re.compile(r"Switch to English", re.IGNORECASE)).first
            en_btn.click()
            page.wait_for_timeout(1500)

            sp = screenshot(page, "05-i18n-switched-to-en")
            screenshots_taken.append(sp)

            en_headline = page.get_by_text("Producing is not enough").first
            en_visible = en_headline.is_visible()
            test("i18n: bascule FR→EN change le texte", en_visible,
                 "L'accroche 'Producing is not enough' doit être visible après bascule")

            # 5.3 Check nav also changed
            nav_story_en = page.get_by_role("link", name="Story").first
            nav_story_en_visible = nav_story_en.is_visible()
            test("i18n: navigation change aussi en EN", nav_story_en_visible,
                 "Le lien 'Story' doit être visible dans la navbar après bascule")

            # 5.4 Switch back to FR
            fr_btn = page.get_by_role("radio", name=re.compile(r"Basculer en français", re.IGNORECASE)).first
            fr_btn.click()
            page.wait_for_timeout(1500)

            sp = screenshot(page, "05-i18n-switched-back-to-fr")
            screenshots_taken.append(sp)

            fr_headline_back = page.get_by_text("Produire ne suffit pas").first
            fr_back_visible = fr_headline_back.is_visible()
            test("i18n: rebascule EN→FR fonctionne", fr_back_visible,
                 "L'accroche 'Produire ne suffit pas' doit être visible après retour au français")

        except Exception as e:
            test("i18n: exception", False, f"Erreur: {str(e)}")
            sp = screenshot(page, "05-i18n-error")
            screenshots_taken.append(sp)
            traceback.print_exc()

        # ──────── DONE ─────────────────────────────────────────────────────
        browser.close()

    # ──────── GENERATE REPORT ──────────────────────────────────────────────
    total = passed + failed
    if total == 0:
        total = 1  # avoid div by zero

    # Determine status
    if failed == 0:
        status = "🟢 All passed"
    elif passed > failed:
        status = "🟡 Partial failures"
    else:
        status = "🔴 Critical failures"

    print("\n" + "="*60)
    print("📊 RAPPORT QA — AgriMap Togo")
    print("="*60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Base URL: {BASE_URL}")
    print()
    print(f"## QA Report")
    print(f"1. **Pages testées**: Home (/), Story (/story), Explore (/explore), Report (/report), i18n")
    print(f"2. **Tests réussis**: {passed}/{total}")
    print()
    print(f"3. **Échecs**:")
    any_fail = False
    for name, status_str, detail in results:
        if status_str == "❌ FAIL":
            any_fail = True
            print(f"   - **{name}**: {detail}")
    if not any_fail:
        print(f"   Aucun échec 🎉")
    print()
    print(f"4. **Screenshots**:")
    for sp in screenshots_taken:
        print(f"   - `{sp}`")
    print()
    print(f"5. **Console errors**:")
    if console_errors:
        for err in console_errors[:10]:  # Show first 10
            print(f"   - [{err['type']}] {err['text'][:120]}")
        if len(console_errors) > 10:
            print(f"   ... et {len(console_errors) - 10} autres erreurs")
    else:
        print(f"   Aucune erreur console détectée")
    print()
    print(f"6. **Status**: {status}")
    print()

    # Detailed results table
    print("## Détail des tests")
    print()
    for name, status_str, detail in results:
        print(f"   {status_str} {name}")
        if detail and status_str == "❌ FAIL":
            print(f"      → {detail}")
    print()

    return failed == 0


# ══════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import re
    success = run_tests()
    sys.exit(0 if success else 1)
