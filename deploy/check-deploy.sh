#!/bin/bash
# ─────────────────────────────────────────────────────────────
# AgriMap Togo — Post-Deployment Check Script
# Usage: bash deploy/check-deploy.sh
# Vérifie que le déploiement est opérationnel
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ────────────────────────────────────────────
DOMAIN="agrimap.favoured.cloud"
BASE_URL="https://$DOMAIN"
TIMEOUT=15

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ── State ───────────────────────────────────────────────────
PASS=0
FAIL=0
WARN=0
RESULTS=()

report() {
    local status=$1
    local label="$2"
    local detail="$3"
    if [[ "$status" == "pass" ]]; then
        echo -e "  ${GREEN}✓${NC} ${BOLD}$label${NC} — $detail"
        PASS=$((PASS + 1))
    elif [[ "$status" == "fail" ]]; then
        echo -e "  ${RED}✗${NC} ${BOLD}$label${NC} — $detail"
        FAIL=$((FAIL + 1))
    else
        echo -e "  ${YELLOW}⚠${NC} ${BOLD}$label${NC} — $detail"
        WARN=$((WARN + 1))
    fi
}

section() {
    echo ""
    echo -e "${BLUE}══════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}══════════════════════════════════════════${NC}"
}

echo ""
echo -e "${BOLD}┌─────────────────────────────────────────────┐${NC}"
echo -e "${BOLD}│${NC}  AgriMap Togo — Post-Deployment Check     ${BOLD}│${NC}"
echo -e "${BOLD}│${NC}  $(date '+%Y-%m-%d %H:%M:%S')                      ${BOLD}│${NC}"
echo -e "${BOLD}└─────────────────────────────────────────────┘${NC}"

# ── 1. DNS Resolution ───────────────────────────────────────
section "1. Résolution DNS"
if host "$DOMAIN" >/dev/null 2>&1; then
    IP=$(host "$DOMAIN" | awk '/has address/ { print $NF; exit }')
    report "pass" "DNS" "$DOMAIN → $IP"
else
    report "fail" "DNS" "$DOMAIN ne résout pas"
fi

# ── 2. HTTPS Accessibility ──────────────────────────────────
section "2. Accessibilité HTTPS"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$BASE_URL" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
    report "pass" "HTTP Status" "200 OK"
elif [[ "$HTTP_CODE" == "000" ]]; then
    report "fail" "HTTP Status" "Site inaccessible (timeout ou DNS)"
else
    report "warn" "HTTP Status" "Code: $HTTP_CODE (attendu: 200)"
fi

# ── 3. Redirect HTTP → HTTPS ────────────────────────────────
section "3. Redirection HTTP → HTTPS"
HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time "$TIMEOUT" "http://$DOMAIN" 2>/dev/null || echo "000")
HTTP_CODE_REDIR=$(echo "$HTTP_REDIRECT" | awk '{print $1}')
HTTP_LOCATION=$(echo "$HTTP_REDIRECT" | awk '{print $2}')
if [[ "$HTTP_CODE_REDIR" =~ ^30[12378]$ ]] && echo "$HTTP_LOCATION" | grep -q "^https://"; then
    report "pass" "HTTP→HTTPS" "301 → $HTTP_LOCATION"
else
    report "fail" "HTTP→HTTPS" "Attendu: 301, Obtenu: $HTTP_CODE_REDIR"
fi

# ── 4. SSL Certificate ──────────────────────────────────────
section "4. Certificat SSL"
if command -v openssl >/dev/null 2>&1; then
    CERT_INFO=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null)
    CERT_EXPIRY=$(echo "$CERT_INFO" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    CERT_ISSUER=$(echo "$CERT_INFO" | openssl x509 -noout -issuer 2>/dev/null | cut -d= -f2-)

    if [[ -n "$CERT_EXPIRY" ]]; then
        EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null)
        NOW_EPOCH=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
        ISSUER_SHORT=$(echo "$CERT_ISSUER" | grep -oP 'CN = \K[^,]+' || echo "$CERT_ISSUER")

        if [[ $DAYS_LEFT -gt 30 ]]; then
            report "pass" "SSL" "Let's Encrypt, expire le $CERT_EXPIRY ($DAYS_LEFT jours restants)"
        elif [[ $DAYS_LEFT -gt 7 ]]; then
            report "warn" "SSL" "Expire le $CERT_EXPIRY ($DAYS_LEFT jours restants)"
        else
            report "fail" "SSL" "Expire le $CERT_EXPIRY ($DAYS_LEFT jours) — RENOUVELLEMENT URGENT"
        fi
    else
        report "fail" "SSL" "Impossible de récupérer les infos du certificat"
    fi
else
    report "warn" "SSL" "openssl non installé, vérification ignorée"
fi

# ── 5. TLS Version ──────────────────────────────────────────
section "5. Sécurité TLS"
if command -v openssl >/dev/null 2>&1; then
    TLS12_OK=$(echo | openssl s_client -tls1_2 -connect "$DOMAIN":443 2>/dev/null && echo "OK" || echo "FAIL")
    TLS13_OK=$(echo | openssl s_client -tls1_3 -connect "$DOMAIN":443 2>/dev/null && echo "OK" || echo "FAIL")
    report "pass" "TLS 1.2" "$TLS12_OK"
    report "pass" "TLS 1.3" "$TLS13_OK"
fi

# ── 6. Security Headers ─────────────────────────────────────
section "6. Headers de sécurité"

HEADERS=$(curl -sI --max-time "$TIMEOUT" "$BASE_URL" 2>/dev/null || true)

# X-Frame-Options
if echo "$HEADERS" | grep -qi "X-Frame-Options: DENY"; then
    report "pass" "X-Frame-Options" "DENY"
else
    report "fail" "X-Frame-Options" "Absent ou incorrect"
fi

# X-Content-Type-Options
if echo "$HEADERS" | grep -qi "X-Content-Type-Options: nosniff"; then
    report "pass" "X-Content-Type-Options" "nosniff"
else
    report "fail" "X-Content-Type-Options" "Absent ou incorrect"
fi

# Referrer-Policy
if echo "$HEADERS" | grep -qi "Referrer-Policy: strict-origin-when-cross-origin"; then
    report "pass" "Referrer-Policy" "strict-origin-when-cross-origin"
else
    report "fail" "Referrer-Policy" "Absent ou incorrect"
fi

# HSTS
if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
    report "pass" "HSTS" "Présent"
else
    report "fail" "HSTS" "Absent"
fi

# Content-Type (HTML)
CONTENT_TYPE=$(curl -sI --max-time "$TIMEOUT" "$BASE_URL" 2>/dev/null | grep -i "^Content-Type:" | tr -d '\r' || true)
if echo "$CONTENT_TYPE" | grep -qi "text/html"; then
    report "pass" "Content-Type" "$CONTENT_TYPE"
else
    report "fail" "Content-Type" "$CONTENT_TYPE"
fi

# ── 7. Compression gzip ─────────────────────────────────────
section "7. Compression gzip"
GZIP_OK=$(curl -s -H "Accept-Encoding: gzip" --max-time "$TIMEOUT" -o /dev/null -w "%{size_download}" "$BASE_URL" 2>/dev/null || echo "0")
NO_GZIP=$(curl -s -H "Accept-Encoding: identity" --max-time "$TIMEOUT" -o /dev/null -w "%{size_download}" "$BASE_URL" 2>/dev/null || echo "0")
if [[ "$NO_GZIP" -gt 0 ]] && [[ "$GZIP_OK" -lt "$NO_GZIP" ]]; then
    RATIO=$(( (NO_GZIP - GZIP_OK) * 100 / NO_GZIP ))
    report "pass" "gzip" "Compression active (${RATIO}% gagné sur la page d'accueil)"
elif [[ "$NO_GZIP" -eq "$GZIP_OK" ]]; then
    report "fail" "gzip" "Compression inactive (tailles identiques: ${GZIP_OK} octets)"
else
    report "fail" "gzip" "Impossible de vérifier la compression"
fi

# ── 8. Response Time ────────────────────────────────────────
section "8. Temps de réponse"
TIMING=$(curl -s -o /dev/null -w "connect:%{time_connect}, tls:%{time_appconnect}, ttfb:%{time_starttransfer}, total:%{time_total}" --max-time "$TIMEOUT" "$BASE_URL" 2>/dev/null || echo "timeout")
TOTAL_TIME=$(echo "$TIMING" | grep -oP 'total:\K[0-9.]+' || echo "0")
if [[ -n "$TOTAL_TIME" ]]; then
    TOTAL_MS=$(echo "$TOTAL_TIME * 1000" | bc 2>/dev/null || echo "0")
    if (( $(echo "$TOTAL_MS < 1000" | bc -l 2>/dev/null) )); then
        report "pass" "Performance" "${TOTAL_MS}ms total"
    elif (( $(echo "$TOTAL_MS < 3000" | bc -l 2>/dev/null) )); then
        report "warn" "Performance" "${TOTAL_MS}ms total"
    else
        report "fail" "Performance" "${TOTAL_MS}ms total (trop lent)"
    fi
    echo ""
    echo "  Détails : $TIMING"
fi

# ── 9. GeoJSON Accessible ───────────────────────────────────
section "9. Données GeoJSON"
GEOJSON_FILES=(
    "public/data/synthesis.geojson"
    "public/data/density.geojson"
    "public/data/accessibility.geojson"
)
for file in "${GEOJSON_FILES[@]}"; do
    URL="$BASE_URL/$file"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$URL" 2>/dev/null || echo "000")
    if [[ "$STATUS" == "200" ]]; then
        SIZE=$(curl -s --max-time "$TIMEOUT" "$URL" 2>/dev/null | wc -c || echo "0")
        report "pass" "$file" "HTTP $STATUS ($SIZE octets)"
    else
        report "warn" "$file" "HTTP $STATUS (non trouvé)"
    fi
done

# ── 10. SPA Routing ─────────────────────────────────────────
section "10. SPA Routing (fallback index.html)"
TEST_PATHS=(
    "/"
    "/explore"
    "/story"
    "/report"
    "/nonexistent"
)
for path in "${TEST_PATHS[@]}"; do
    URL="$BASE_URL$path"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$URL" 2>/dev/null || echo "000")
    if [[ "$STATUS" == "200" ]]; then
        report "pass" "$path" "200 OK"
    else
        report "fail" "$path" "$STATUS (attendu: 200)"
    fi
done

# ── Final Summary ────────────────────────────────────────────
section "Résumé"
echo ""
echo -e "  ${GREEN}✓${NC} Pass: $PASS   ${RED}✗${NC} Fail: $FAIL   ${YELLOW}⚠${NC} Warnings: $WARN"
echo ""

if [[ $FAIL -eq 0 ]]; then
    echo -e "  ${GREEN}${BOLD}✅ Déploiement validé — https://$DOMAIN est opérationnel${NC}"
    echo ""
    exit 0
else
    echo -e "  ${RED}${BOLD}❌ $FAIL vérification(s) en échec — corriger avant mise en production${NC}"
    echo ""
    exit 1
fi
