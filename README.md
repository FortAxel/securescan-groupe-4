# Ipssi securescan-groupe-4

## Application React (front)

Une seule appli React : **securescan-Front**.

```bash
cd securescan-Front
npm install
npm run dev
```

## Backend Python (outils de sécurité)

python3 -m venv venv
source venv/bin/activate  # bash
# .\venv\Scripts\Activate.ps1  # powershell

pip install -r requirements.txt

## TruffleHog (binaire Go, indépendant du venv)

# Linux/Mac
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b ~/.local/bin

# Vérifie l'install
trufflehog --version

# Ajoute ~/.local/bin au PATH si nécessaire (bash)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc