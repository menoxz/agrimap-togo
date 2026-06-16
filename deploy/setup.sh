#!/bin/bash
# ─────────────────────────────────────────────────────────────
# AgriMap Togo — Setup Script d'initialisation du serveur
# Usage: bash deploy/setup.sh
# Idempotent : peut être exécuté plusieurs fois sans risque
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ────────────────────────────────────────────
DOMAIN="agrimap.favoured.cloud"
NGINX_ROOT="/var/www/agrimap"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
CONFIG_NAME="agrimap"
NGINX_CONF="$NGINX_AVAILABLE/$CONFIG_NAME"
NGINX_LINK="$NGINX_ENABLED/$CONFIG_NAME"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }

# ── Vérification root ────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    err "Ce script doit être exécuté en tant que root (sudo)."
    exit 1
fi

echo ""
echo "=============================================="
echo "  AgriMap Togo — Server Setup"
echo "  Domain: $DOMAIN"
echo "=============================================="
echo ""

# ── 1. Mise à jour du système ────────────────────────────────
log "Mise à jour des paquets..."
apt-get update -qq
apt-get upgrade -y -qq

# ── 2. Installation des paquets requis ───────────────────────
log "Installation de nginx, certbot, python3-certbot-nginx..."
apt-get install -y -qq nginx certbot python3-certbot-nginx rsync ufw

log "Vérification de nginx..."
nginx -v

# ── 3. Création du répertoire web ────────────────────────────
if [[ ! -d "$NGINX_ROOT" ]]; then
    log "Création de $NGINX_ROOT..."
    mkdir -p "$NGINX_ROOT"
else
    log "$NGINX_ROOT existe déjà"
fi

# ── 4. Création du répertoire de backups ────────────────────
BACKUP_DIR="/var/www/agrimap-backups"
if [[ ! -d "$BACKUP_DIR" ]]; then
    log "Création de $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
else
    log "$BACKUP_DIR existe déjà"
fi

# ── 5. Déploiement de la configuration Nginx ────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NGINX_SOURCE="$PROJECT_DIR/deploy/nginx.conf"

if [[ -f "$NGINX_SOURCE" ]]; then
    log "Copie de la configuration Nginx..."
    cp "$NGINX_SOURCE" "$NGINX_CONF"
else
    warn "Fichier nginx.conf introuvable dans $NGINX_SOURCE"
    warn "Créez d'abord le fichier deploy/nginx.conf, puis réexécutez ce script."
fi

# ── 6. Activation du site Nginx ──────────────────────────────
if [[ ! -L "$NGINX_LINK" ]]; then
    log "Activation du site (sites-enabled)..."
    ln -sf "$NGINX_CONF" "$NGINX_LINK"
else
    log "Site déjà activé"
fi

# ── 7. Test de la configuration Nginx ────────────────────────
log "Test de la configuration Nginx..."
if nginx -t; then
    log "Configuration Nginx valide"
    systemctl reload nginx
    log "Nginx rechargé"
else
    err "Configuration Nginx invalide. Corrigez les erreurs ci-dessus."
    exit 1
fi

# ── 8. Obtention du certificat Let's Encrypt ─────────────────
if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    log "Obtention du certificat SSL Let's Encrypt..."
    certbot --nginx \
        -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email admin@favoured.cloud \
        --redirect
    log "Certificat SSL obtenu"
else
    log "Certificat SSL déjà présent — vérification..."
    certbot renew --dry-run
fi

# ── 9. Vérification du renouvellement automatique ──────────
log "Vérification du renouvellement automatique..."
if systemctl is-active --quiet certbot.timer 2>/dev/null; then
    log "certbot.timer actif : renouvellement automatique configuré"
elif grep -q "certbot renew" /etc/crontab 2>/dev/null; then
    log "Cron job certbot trouvé dans /etc/crontab"
else
    warn "Aucun timer systemd ni cron certbot trouvé. Mise en place..."
    # Ajouter une tâche cron pour le renouvellement
    (crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx") | crontab -
    log "Tâche cron ajoutée (3h00 chaque jour)"
fi

# ── 10. Configuration du firewall ────────────────────────────
log "Configuration du firewall (ufw)..."
ufw --force enable
ufw allow 80/tcp  comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw allow 22/tcp  comment "SSH"
ufw reload 2>/dev/null || true
log "Firewall configuré : ports 80, 443, 22 ouverts"

# ── 11. Création d'une page d'accueil temporaire ────────────
if [[ ! -f "$NGINX_ROOT/index.html" ]]; then
    log "Création d'une page d'accueil temporaire..."
    cat > "$NGINX_ROOT/index.html" <<EOF
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>AgriMap Togo</title>
    <style>
        body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f4f0; }
        .container { text-align: center; }
        h1 { color: #1a5e1a; }
        .status { color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌍 AgriMap Togo</h1>
        <p class="status">Serveur configuré — En attente du déploiement</p>
        <p class="status">Lancez <code>make deploy</code> depuis votre poste de développement</p>
    </div>
</body>
</html>
EOF
    log "Page temporaire créée"
fi

# ── 12. Journalisation rotation ──────────────────────────────
log "Configuration de la rotation des logs..."
cat > /etc/logrotate.d/agrimap <<EOF
/var/log/nginx/agrimap_*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
EOF
log "Logrotate configuré (rotation quotidienne, 14 jours de rétention)"

# ── Résumé final ─────────────────────────────────────────────
echo ""
echo "=============================================="
echo -e "  ${GREEN}✓ Setup terminé avec succès${NC}"
echo "=============================================="
echo ""
echo "  Site :     https://$DOMAIN"
echo "  Root :     $NGINX_ROOT"
echo "  Backups :  $BACKUP_DIR"
echo "  Config :   $NGINX_CONF"
echo "  Logs :     /var/log/nginx/agrimap_*.log"
echo ""
echo "  Prochaine étape depuis votre poste :"
echo "    make build"
echo "    make deploy"
echo ""
