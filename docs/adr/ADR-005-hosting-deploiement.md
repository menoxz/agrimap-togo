# ADR-005 : Hosting & déploiement VPS

**Status** : Accepted  
**Date** : 2026-06-16  
**Décisionnaire** : Architecte

---

## Contexte

Le tableau de bord doit être accessible publiquement via `agrimap.favoured.cloud` (ou sous-domaine dédié). Le VPS existe déjà et est exploité par le porteur.

Contraintes :
- [IMMUTABLE] Hébergement sur VPS perso `*.favoured.cloud`
- [IMMUTABLE] Budget nul → pas de dépense supplémentaire
- [IMMUTABLE] Bas débit → minimiser le poids des pages et optimiser le cache
- SSL/TLS obligatoire (HTTPS)
- Déploiement simple et rapide (6 jours)

## Décision

**Nginx + Let's Encrypt + déploiement rsync**

### Configuration cible

```
Domaine : agrimap.favoured.cloud
IP VPS : (existante)
OS VPS : (existant, typiquement Debian/Ubuntu)
```

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name agrimap.favoured.cloud;

    ssl_certificate /etc/letsencrypt/live/agrimap.favoured.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agrimap.favoured.cloud/privkey.pem;

    root /var/www/agrimap;
    index index.html;

    # Cache agressif pour les fichiers statiques (versionnés par build)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache contrôlé pour les données GeoJSON (versionnées)
    location /data/ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # Pas de cache pour les locales (peuvent changer)
    location /locales/ {
        expires 0;
        add_header Cache-Control "no-cache";
    }

    # SPA fallback : toutes les routes → index.html
    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
    }

    # Gzip tout
    gzip on;
    gzip_types application/json text/plain text/css application/javascript image/svg+xml;
    gzip_min_length 256;
}

# Redirection HTTP → HTTPS
server {
    listen 80;
    server_name agrimap.favoured.cloud;
    return 301 https://$server_name$request_uri;
}
```

### Déploiement

Via `Makefile` en local :

```makefile
deploy: build
	rsync -avz --delete dist/ user@vps:/var/www/agrimap/
	ssh user@vps "sudo systemctl reload nginx"

build:
	npm run build
```

### Pipeline de build

```bash
# Ordre
1. cd etl && python run_all.py        # → data/public/
2. cd frontend && npm run build        # → dist/
3. rsync dist/ + data/public/ → VPS
```

## Conséquences

**Positives :**
- Zéro coût additionnel (VPS existant + Let's Encrypt gratuit)
- Déploiement en une commande (`make deploy`)
- Cache optimisé pour bas débit (fichiers statiques, gzip, cache-control)
- SSL/TLS automatique et renouvelable (certbot)
- Configuration Nginx minimaliste et robuste

**Négatives :**
- Dépend du VPS existant (disponible, configuré)
- Pas d'auto-scaling (inutile pour le volume attendu)
- Let's Encrypt nécessite une tâche cron pour le renouvellement
- rsync écrase les fichiers sans versionning (rollback manuel possible via backup)

## Alternatives considérées

| Alternative | Raison du rejet |
|------------|----------------|
| **GitHub Pages** | Gratuit mais pas de sous-domaine personnalisé SSL simple, pas de caching custom, limite de taille |
| **Netlify / Vercel (plan gratuit)** | Fonctionnel mais le projet doit rester sur le VPS du porteur (contrainte immuable) |
| **Docker Compose** | Surcharge pour un site statique. Pourrait être envisagé en V2 |
| **Cloudflare Pages** | Nécessite transfert DNS, pas de contrôle serveur |

## Relations

- Parent : ADR-001 (architecture static-first)
- Consomme le build de ADR-003 (frontend) et les données de ADR-002
- Le script de déploiement est décrit dans le Makefile
