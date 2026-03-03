
  # Hackaton IPSSI

  This is a code bundle for Hackaton IPSSI. The original project is available at https://www.figma.com/design/6XvI0VW6DcUOA1xCW0biC6/Hackaton-IPSSI.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## API backend (optionnel)

  Les appels API (connexion, profil, projets, findings) ciblent par défaut `http://localhost:3000`.  
  Si vous voyez **ERR_CONNECTION_REFUSED** ou « Données de démonstration » :

  - Démarrez l’API dans le dossier **backend** : `cd securescan-backend && npm run dev`
  - Ou définissez `VITE_API_BASE_URL` dans un `.env` pour pointer vers une autre URL.

  Sans backend, l’app fonctionne avec des données de démonstration (tableau de bord, profil en session).
  