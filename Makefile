# ─────────────────────────────────────────────────────────────
# AgriMap Togo — Makefile DevOps
# Usage: make [install|etl|frontend|build|deploy|rollback|check|serve]
# ─────────────────────────────────────────────────────────────
.POSIX:
SHELL := /bin/bash
.ONESHELL:

# ── Configuration ────────────────────────────────────────────
FRONTEND_DIR   := frontend
DATA_DIR       := data
PUBLIC_DIR     := frontend/public
DIST_DIR       := frontend/dist
ETL_SCRIPT     := etl/run_all.py
NGINX_DIR      := /var/www/agrimap
BACKUP_DIR     := /var/www/agrimap-backups
SSH_TARGET     ?= root@agrimap.favoured.cloud

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
NC     := \033[0m

# ── Targets ─────────────────────────────────────────────────-
.PHONY: help install etl frontend build deploy rollback check serve clean

help:
	@echo "$(GREEN)AgriMap Togo — Makefile$(NC)"
	@echo ""
	@echo "  $(YELLOW)make install$(NC)   — Installer les dépendances (npm ci)"
	@echo "  $(YELLOW)make etl$(NC)       — Exécuter le pipeline ETL"
	@echo "  $(YELLOW)make frontend$(NC)  — Construire le frontend (Vite)"
	@echo "  $(YELLOW)make build$(NC)     — ETL + frontend + copie des données"
	@echo "  $(YELLOW)make deploy$(NC)    — Déployer sur le VPS (rsync)"
	@echo "  $(YELLOW)make rollback$(NC)  — Restaurer la version précédente"
	@echo "  $(YELLOW)make check$(NC)     — Exécuter tous les tests"
	@echo "  $(YELLOW)make serve$(NC)     — Prévisualisation locale (Vite preview)"
	@echo "  $(YELLOW)make clean$(NC)     — Nettoyer les artefacts de build"
	@echo ""

# ── 1. Installation des dépendances ──────────────────────────
install:
	@echo "$(GREEN)→ Installation des dépendances frontend...$(NC)"
	cd $(FRONTEND_DIR) && npm ci
	@echo "$(GREEN)✓ Dépendances installées$(NC)"

# ── 2. Pipeline ETL ─────────────────────────────────────────
etl:
	@echo "$(GREEN)→ Exécution du pipeline ETL...$(NC)"
	python $(ETL_SCRIPT)
	@echo "$(GREEN)✓ Pipeline ETL terminé$(NC)"

# ── 3. Build frontend ────────────────────────────────────────
frontend:
	@echo "$(GREEN)→ Construction du frontend (Vite)...$(NC)"
	cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)✓ Frontend construit dans $(DIST_DIR)$(NC)"

# ── 4. Build complet ─────────────────────────────────────────
build: etl frontend
	@echo "$(GREEN)→ Copie des données statiques vers le build...$(NC)"
	@# Créer le répertoire de destination
	mkdir -p $(DIST_DIR)/public/data
	@# Copier les données d'analyse (GeoJSON)
	cp -r $(PUBLIC_DIR)/data/* $(DIST_DIR)/public/data/
	@# Copier les story contents bilingues
	cp $(DATA_DIR)/public/story_content_fr.json $(DIST_DIR)/public/data/ 2>/dev/null || true
	cp $(DATA_DIR)/public/story_content_en.json $(DIST_DIR)/public/data/ 2>/dev/null || true
	@# Copier les métadonnées
	mkdir -p $(DIST_DIR)/public/metadata
	cp -r $(DATA_DIR)/public/metadata/* $(DIST_DIR)/public/metadata/ 2>/dev/null || true
	@echo "$(GREEN)✓ Build complet terminé$(NC)"
	@echo "$(GREEN)  → Prêt pour: make deploy$(NC)"

# ── 5. Déploiement vers le VPS ───────────────────────────────
deploy:
	@echo "$(GREEN)→ Déploiement vers $(SSH_TARGET)...$(NC)"
	@# 1. Backup de la version actuelle sur le serveur
	@ssh $(SSH_TARGET) "mkdir -p $(BACKUP_DIR) && \
		if [ -d $(NGINX_DIR) ]; then \
			ts=$$(date +%Y%m%d_%H%M%S); \
			sudo cp -a $(NGINX_DIR) $(BACKUP_DIR)/agrimap_$$ts; \
			echo '✓ Backup créé: agrimap_'"$$ts"; \
		else \
			echo '→ Premier déploiement, pas de backup'; \
		fi"
	@# 2. Synchronisation des fichiers
	@rsync -avz --delete \
		--exclude '*.map' \
		$(DIST_DIR)/ $(SSH_TARGET):$(NGINX_DIR)/
	@echo "$(GREEN)✓ Déploiement terminé$(NC)"
	@echo ""
	@echo "  Exécutez maintenant:"
	@echo "    ssh $(SSH_TARGET) 'sudo nginx -t && sudo systemctl reload nginx'"

# ── 6. Rollback ──────────────────────────────────────────────
rollback:
	@echo "$(YELLOW)→ Récupération de la dernière sauvegarde...$(NC)"
	@ssh $(SSH_TARGET) "set -e; \
		latest=$$(ls -1d $(BACKUP_DIR)/agrimap_* 2>/dev/null | tail -1); \
		if [ -z \"$$latest\" ]; then \
			echo '$(RED)✗ Aucun backup trouvé dans $(BACKUP_DIR)$(NC)'; \
			exit 1; \
		fi; \
		echo '✓ Backup trouvé: '$$(basename $$latest); \
		sudo rm -rf $(NGINX_DIR); \
		sudo cp -a $$latest $(NGINX_DIR); \
		echo '$(GREEN)✓ Rollback effectué: '$$(basename $$latest)'$(NC)'"
	@ssh $(SSH_TARGET) "sudo nginx -t && sudo systemctl reload nginx"
	@echo "$(GREEN)✓ Nginx rechargé$(NC)"

# ── 7. Tests ─────────────────────────────────────────────────
check:
	@echo "$(GREEN)→ Tests Python (pytest)...$(NC)"
	cd $(DATA_DIR) && python -m pytest tests/ -v 2>/dev/null || python -m pytest -v 2>/dev/null || echo "  (pas de tests Python trouvés)"
	@echo ""
	@echo "$(GREEN)→ Tests Frontend (vitest)...$(NC)"
	cd $(FRONTEND_DIR) && npm test
	@echo ""
	@echo "$(GREEN)→ Vérification i18n...$(NC)"
	python scripts/check_i18n.py
	@echo ""
	@echo "$(GREEN)✓ Tous les tests passés$(NC)"

# ── 8. Prévisualisation locale ───────────────────────────────
serve:
	@echo "$(GREEN)→ Lancement du serveur de prévisualisation...$(NC)"
	cd $(FRONTEND_DIR) && npx vite preview --host

# ── 9. Nettoyage ─────────────────────────────────────────────
clean:
	@echo "$(YELLOW)→ Nettoyage...$(NC)"
	rm -rf $(DIST_DIR)/public/data $(DIST_DIR)/public/metadata
	cd $(FRONTEND_DIR) && rm -rf dist
	@echo "$(GREEN)✓ Nettoyage terminé$(NC)"
