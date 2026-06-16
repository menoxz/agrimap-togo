# TASK-M6 : Deployment & DevOps — Mise en production

## Mission
Configurer le déploiement du site sur le VPS `agrimap.favoured.cloud`. Mettre en place Nginx, SSL Let's Encrypt, le pipeline de build automatisé (Makefile), et la CI GitHub Actions. Le site doit être accessible publiquement, sécurisé (HTTPS), et optimisé pour les connexions lentes.

## Input
- Build frontend : `frontend/dist/`
- Données publiques : `data/public/`
- Accès SSH au VPS `favoured.cloud`

## Output
- Site accessible sur `https://agrimap.favoured.cloud`
- Configuration Nginx : `deploy/nginx.conf`
- Script d'initialisation : `deploy/setup.sh`
- Makefile avec commandes build/deploy/test
- GitHub Actions CI : `.github/workflows/ci.yml`
- Script vérification i18n : `scripts/check_i18n.py`

## Contraintes spécifiques
- [IMMUTABLE] Hébergé sur VPS perso `*.favoured.cloud`
- [IMMUTABLE] Budget quasi nul → Let's Encrypt gratuit, rsync, pas de service payant
- [IMMUTABLE] Bas débit → compression gzip, cache headers, GeoJSON optimisé
- SSL/TLS obligatoire (certificat Let's Encrypt, renouvellement via certbot)
- Déploiement en une commande (`make deploy`)
- Rollback possible (version précédente conservée)

## Étapes de configuration serveur

```bash
# 1. Créer le dossier et les permissions
sudo mkdir -p /var/www/agrimap
sudo chown -R $USER:$USER /var/www/agrimap

# 2. Installer et configurer Nginx
sudo apt install nginx certbot python3-certbot-nginx
sudo ln -s /etc/nginx/sites-available/agrimap /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 3. Obtenir le certificat SSL
sudo certbot --nginx -d agrimap.favoured.cloud

# 4. Vérifier le renouvellement auto
sudo certbot renew --dry-run
```

## Définition of Done (vérifiable)
- [ ] `https://agrimap.favoured.cloud` répond en HTTPS
- [ ] `make build` produit le site complet (ETL + frontend)
- [ ] `make deploy` met à jour le site sur le VPS
- [ ] Tests CI passent (GitHub Actions)
- [ ] Gzip activé vérifié (curl -I -H 'Accept-Encoding: gzip')
- [ ] Cache configuré (assets: 1 an, data: 1h)
- [ ] Certificat SSL valide (curl https://agrimap.favoured.cloud)
- [ ] Script check_i18n.py passe (traductions complètes)
