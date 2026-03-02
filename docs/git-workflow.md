# 🔀 Git Workflow — Travailler en groupe simplement

> Les branches restent **locales uniquement**, on ne les push jamais.  
> Seul `main` est partagé.

---

## Convention de nommage des commits

```
type: description courte
```

| Type | Usage |
|------|-------|
| `feat:` | nouvelle fonctionnalité |
| `fix:` | correction de bug |
| `refactor:` | refacto sans ajout de feature |
| `chore:` | maintenance, config, dépendances |
| `docs:` | documentation |

**Exemples :**
```
feat: ajout formulaire de connexion
fix: correction calcul TVA panier
chore: mise à jour dépendances npm
```

---

## Le flow complet

### 1. Créer sa branche locale et bosser

```bash
git checkout -b ma-feature
# ... dev, dev, dev ...
git add .
git commit -m "feat: ma super feature"
```

### 2. Se mettre à jour avec main

```bash
# Aller récupérer les nouveautés de l'équipe
git switch main
git pull

# Revenir sur sa branche et rebaser
git switch ma-feature
git rebase main
```

### 3. Gérer les conflits de rebase

Le plus simple est de mettre l'extension git graph sur vs code.

Si Git s'arrête sur un conflit :

```bash
# 1. Ouvrir les fichiers en conflit et les résoudre manuellement
# (chercher les <<<<<<, ======, >>>>>> et choisir ce qu'on garde)

# 2. Marquer comme résolu
git add fichier-en-conflit.js

# 3. Continuer le rebase
git rebase --continue

# Si tu veux tout annuler et revenir en arrière
git rebase --abort
```

### 4. Merger sur main et pusher

```bash
git switch main
git pull  # re-pull au cas où quelqu'un aurait pushé entre temps

# Si du nouveau code est arrivé → retour étape 2 pour re-rebaser
# Sinon, on merge et on push :

git merge ma-feature
git push
```

---

## ⚠️ Règles d'or

- **On ne push jamais sa branche**, seulement `main`
- **On rebase avant de merger** pour garder un historique propre
- **On re-pull main juste avant le merge final** pour éviter les surprises
- En cas de doute : `git status` est ton ami