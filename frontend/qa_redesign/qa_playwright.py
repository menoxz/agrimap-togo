"""
QA Playwright Script — AgriMap Togo Redesign
Prend tous les screenshots requis + capture les erreurs console
"""
import json
import time
from playwright.sync_api import sync_playwright, Page

BASE_URL = "http://localhost:5173"
OUT_DIR = "C:/jeanluc/data_ai_lab_agri_project/frontend/qa_redesign"

console_errors = {}


def capture_console(page: Page, label: str):
    errors = []
    page.on("console", lambda msg: errors.append({
        "type": msg.type,
        "text": msg.text
    }) if msg.type in ("error", "warning") else None)
    page.on("response", lambda res: errors.append({
        "type": "404",
        "text": f"404 → {res.url}"
    }) if res.status == 404 else None)
    console_errors[label] = errors


def screenshot(page: Page, path: str, full_page=True):
    page.screenshot(path=path, full_page=full_page)
    print(f"  📸 {path}")


def wait_ready(page: Page, timeout=15000):
    page.wait_for_load_state("networkidle", timeout=timeout)


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        # ─────────────────────────────────────────────
        # 1. HOME PAGE — FR (défaut)
        # ─────────────────────────────────────────────
        print("\n[1] HomePage FR — vue complète")
        capture_console(page, "home_fr")
        page.goto(BASE_URL + "/", wait_until="networkidle")
        wait_ready(page)
        time.sleep(1)
        screenshot(page, f"{OUT_DIR}/home_fr_full.png", full_page=True)

        # ─────────────────────────────────────────────
        # 2. HOME PAGE — EN  (section Why visible)
        # ─────────────────────────────────────────────
        print("\n[2] HomePage EN — hero + section Why")
        capture_console(page, "home_en")

        # Chercher le switcher de langue et passer en EN
        try:
            # Essayer plusieurs sélecteurs courants pour switcher de langue
            lang_btn = page.locator("button:has-text('EN'), button:has-text('en'), [data-lang='en'], button[aria-label*='English']").first
            if lang_btn.count() == 0:
                lang_btn = page.locator("text=EN").first
            lang_btn.click(timeout=3000)
            wait_ready(page)
            time.sleep(0.5)
        except Exception as e:
            print(f"  ⚠️  Switcher langue introuvable: {e}")

        # Scroll jusqu'à la section Why
        page.evaluate("window.scrollBy(0, document.body.scrollHeight * 0.75)")
        time.sleep(0.8)
        screenshot(page, f"{OUT_DIR}/home_en_why.png", full_page=False)
        # Full page en EN aussi pour comparer
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.3)

        # ─────────────────────────────────────────────
        # 3. EXPLORER PAGE — hero
        # ─────────────────────────────────────────────
        print("\n[3] Explorer — hero complet")
        capture_console(page, "explorer")
        page.goto(BASE_URL + "/explorer", wait_until="networkidle")
        wait_ready(page)
        time.sleep(2)  # Leaflet a besoin de temps
        screenshot(page, f"{OUT_DIR}/explorer_hero.png", full_page=False)

        # ─────────────────────────────────────────────
        # 4. EXPLORER — FlyToRegion Maritime
        # ─────────────────────────────────────────────
        print("\n[4] Explorer — FlyToRegion Maritime")
        # Chercher le filtre région
        try:
            # Essayer select, combobox, ou bouton "Maritime"
            region_select = page.locator("select").first
            if region_select.count() > 0:
                region_select.select_option(label="Maritime")
                time.sleep(1.5)
            else:
                # Chercher un élément clickable avec "Maritime"
                maritime_btn = page.locator("text=Maritime").first
                maritime_btn.click(timeout=3000)
                time.sleep(1.5)
        except Exception as e:
            print(f"  ⚠️  Filtre Maritime introuvable: {e}")
            # Essai avec combobox / dropdown générique
            try:
                # Chercher le dropdown région plus générique
                dropdown = page.locator("[class*='region'], [id*='region'], select[name*='region']").first
                dropdown.select_option(label="Maritime")
                time.sleep(1.5)
            except Exception as e2:
                print(f"  ⚠️  Fallback aussi: {e2}")

        screenshot(page, f"{OUT_DIR}/explorer_flyto_maritime.png", full_page=False)

        # ─────────────────────────────────────────────
        # DUMP console errors
        # ─────────────────────────────────────────────
        browser.close()

    # Écrire le rapport console
    report_path = f"{OUT_DIR}/console_errors.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(console_errors, f, ensure_ascii=False, indent=2)
    print(f"\n✅ Console errors → {report_path}")

    # Résumé
    print("\n=== RÉSUMÉ CONSOLE ===")
    for label, errs in console_errors.items():
        red = [e for e in errs if e["type"] == "error"]
        warn = [e for e in errs if e["type"] == "warning"]
        nf = [e for e in errs if e["type"] == "404"]
        print(f"  {label}: {len(red)} erreurs, {len(warn)} warnings, {len(nf)} 404")
        for e in red[:5]:
            print(f"    ❌ {e['text'][:120]}")
        for e in nf[:3]:
            print(f"    🔴 {e['text'][:120]}")


if __name__ == "__main__":
    run()
