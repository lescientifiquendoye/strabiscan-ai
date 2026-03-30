# StrabiScan AI 👁️

> Application web de **dépistage automatique du strabisme** par intelligence artificielle — 100% gratuit, open source, déployable sur Hugging Face Spaces.

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10.18-FF6F00?logo=google)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Description

StrabiScan AI est une application web médicale permettant de :

- 📷 **Capturer** une photo du visage d'un patient via webcam avec guidage automatique
- 🤖 **Analyser** le degré de strabisme grâce à MediaPipe FaceMesh (478 landmarks faciaux)
- 📊 **Afficher** les résultats détaillés avec classification médicale et graphiques
- 📄 **Exporter** un rapport PDF professionnel
- 🔐 **Valider** les prédictions IA via une interface administrateur réservée aux spécialistes

---

## ✨ Fonctionnalités

| Fonctionnalité | Détail |
|---|---|
| 🌐 Multilingue | Français / Anglais |
| 📹 Guidage temps réel | Détection qualité (distance, orientation, yeux ouverts) |
| 🎙️ Instructions vocales | Web Speech API (TTS natif) |
| ⚡ Capture automatique | Déclenchement après 2s de position stable |
| 🧠 Analyse IA | MediaPipe FaceMesh + calcul déviation angulaire |
| 📐 Résultats médicaux | Degrés + dioptries prismatiques (Δ) |
| 🏷️ Classification | Normal / Léger / Modéré / Sévère |
| 📄 Export PDF | Rapport complet avec image annotée |
| 🔐 Interface admin | Login JWT + validation/correction des prédictions |
| 📈 Statistiques | Taux de précision, distribution des classifications |

---

## 🏗️ Architecture

```
strabiscan-ai/
├── app.py                    # Point d'entrée FastAPI
├── database.py               # Modèles SQLAlchemy (SQLite)
├── requirements.txt
├── Dockerfile                # Pour Hugging Face Spaces (port 7860)
├── routers/
│   ├── analysis.py           # POST /api/analyze
│   └── admin.py              # Auth JWT + CRUD admin
├── services/
│   └── strabismus.py         # Algorithme MediaPipe FaceMesh
└── static/
    ├── index.html            # SPA principale (capture → résultats)
    ├── admin/
    │   ├── login.html
    │   ├── dashboard.html
    │   └── validate.html
    ├── css/styles.css
    └── js/
        ├── i18n.js           # Traductions FR/EN
        ├── camera.js         # Webcam + contrôle qualité temps réel
        ├── app.js            # Machine à états
        ├── results.js        # Affichage résultats + Chart.js
        ├── pdf.js            # Export jsPDF
        └── admin.js          # Interface admin
```

---

## 🧠 Algorithme de détection

1. **MediaPipe FaceMesh** extrait 478 landmarks faciaux (avec `refine_landmarks=True`)
2. Les **centres des iris** sont identifiés (landmarks 468 et 473)
3. Les **centres géométriques** des yeux sont calculés à partir des coins
4. La **déviation angulaire** est calculée :
   ```
   dev_mm = (iris_x - eye_center_x) × (63mm / IPD_pixels)
   angle° = atan2(dev_mm, 400mm)
   ```
5. **Correction de l'angle kappa** physiologique (−3°)
6. **Conversion en dioptries** : `PD = tan(angle_rad) × 100`

### Classification médicale

| Niveau | Déviation | Dioptries |
|--------|-----------|-----------|
| 🟢 Normal | 0 – 1° | 0 – 1.75 Δ |
| 🟡 Léger | 1 – 5° | 1.75 – 8.8 Δ |
| 🟠 Modéré | 5 – 15° | 8.8 – 26.3 Δ |
| 🔴 Sévère | > 15° | > 26.3 Δ |

---

## 🚀 Déploiement sur Hugging Face Spaces (gratuit)

### Prérequis
- Compte [Hugging Face](https://huggingface.co) (gratuit)
- Git installé

### Étapes

**1. Créer un Space Docker**
```
huggingface.co → New Space → SDK: Docker → Visibility: Public
```

**2. Configurer les variables d'environnement**

Dans les paramètres du Space → *Variables and secrets* :

| Variable | Valeur |
|----------|--------|
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | *(choisir un mot de passe)* |
| `SECRET_KEY` | *(chaîne aléatoire 32 caractères)* |
| `DB_PATH` | `/home/user/data/strabismus.db` |

Générer une `SECRET_KEY` :
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**3. Pousser le code**
```bash
git clone https://huggingface.co/spaces/<USERNAME>/<SPACE-NAME>
cd <SPACE-NAME>
# Copier les fichiers du projet ici
git add .
git commit -m "Initial deployment"
git push
```

Ou depuis le dépôt existant :
```bash
git remote add hf https://huggingface.co/spaces/<USERNAME>/<SPACE-NAME>
git push hf main
```

**4. Accéder à l'application**
```
https://<username>-<space-name>.hf.space          → Application
https://<username>-<space-name>.hf.space/admin    → Interface admin
```

Le build Docker prend environ **5 minutes** au premier déploiement.

---

## 💻 Lancement en local

### Prérequis
- Python 3.11
- pip

### Installation
```bash
git clone https://github.com/<USERNAME>/strabiscan-ai.git
cd strabiscan-ai
pip install -r requirements.txt
```

### Démarrage
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Ouvrir : [http://localhost:8000](http://localhost:8000)

Interface admin : [http://localhost:8000/admin](http://localhost:8000/admin)

### Variables d'environnement (optionnel)

Créer un fichier `.env` à partir de `.env.example` :
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

---

## 🔐 Interface Administrateur

| Fonctionnalité | Détail |
|---|---|
| Authentification | JWT (24h d'expiration) |
| Dashboard | Liste paginée de toutes les analyses |
| Validation | Note 1-5 étoiles + correction de classification |
| Statistiques | Taux de précision IA + distribution des cas |

Identifiants par défaut (modifiables via variables d'env) :
- **Username :** `admin`
- **Password :** `strabiscan2024`

---

## 🛠️ Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Python 3.11 + FastAPI |
| IA | MediaPipe FaceMesh 0.10.18 |
| Traitement image | OpenCV (headless) + NumPy |
| Base de données | SQLite via SQLAlchemy |
| Auth | JWT (python-jose) |
| Frontend | HTML/CSS/JS vanilla |
| Graphiques | Chart.js 4.4 |
| PDF | jsPDF 2.5 + AutoTable |
| Guidage webcam | MediaPipe Face Detection JS |
| Voix | Web Speech API (natif) |
| Hébergement | Hugging Face Spaces (Docker) |

---

## ⚠️ Disclaimer médical

> Cet outil est un **dispositif de dépistage uniquement**. Il ne remplace pas un diagnostic médical professionnel. Les résultats fournis sont des estimations basées sur l'analyse d'image et comportent une marge d'erreur inhérente aux limitations de la vision par ordinateur. Consultez un ophtalmologue qualifié pour tout diagnostic clinique.

---

## 📄 Licence

MIT License — libre d'utilisation, modification et distribution.

---

*Développé dans le cadre d'un stage de recherche en IA/Big Data — ESP (École Supérieure Polytechnique)*
