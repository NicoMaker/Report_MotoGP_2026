# MotoGP 2026 – Dashboard dati

Dati: API ufficiale MotoGP (calendario, risultati, qualifica, sprint, classifiche dopo ogni gara) + foto piloti da Wikipedia. Stesso funzionamento e stessa interfaccia della repo [Report_F1_2026](https://github.com/NicoMaker/Report_F1_2026).

## Avvio (consigliato: salvataggio automatico)

    npm start               # (= node server.js) sito su http://localhost:3000, JSON salvati in data/ e aggiornati ogni 15 min
    REFRESH_MIN=5 node server.js   # cambia la frequenza

Richiede Node 18+, nessuna dipendenza da installare. Aggiornamento manuale: http://localhost:3000/api/refresh

## Senza Node

Apri index.html: i dati arrivano direttamente dall'API e restano in cache nel browser.

## Struttura

    index.html · css/style.css · css/intro.css · server.js · package.json
    js/            api.js (API+cache) · utils.js (bandiere) · data.js · router.js · intro.js
    js/components/ ui · calendar · standings · driver · race · search
    img/flags/     bandiere SVG locali (nazioni e nazionalità)
    img/motogp-logo.svg (opzionale) logo MotoGP per header, intro e favicon
    img/teams/     (opzionale) loghi squadra <teamId>.svg
    data/          i JSON, ordinati per tipo (il server li aggiorna da solo):
      races/       races.json                      calendario
      drivers/     drivers.json · photos.json      piloti e foto
      results/     results.json · qualifying.json · sprint.json
      standings/   driverStandings.json · constructorStandings.json (ultime)
        drivers/       dstand_<giro>.json          classifica piloti dopo ogni gara
        constructors/  cstand_<giro>.json          classifica squadre dopo ogni gara

## Differenze rispetto alla F1

- Niente giri e pit stop (l'API MotoGP non li fornisce); la qualifica ha solo Q1 e Q2.
- Punti: gara 25-20-16-13-11-10-9-8-7-6-5-4-3-2-1, sprint 12-9-7-6-5-4-3-2-1.
- Pagina **Costruttori** (`#/makes`): classifica per marca della moto (Ducati, Aprilia, KTM, Honda, Yamaha); "Squadre" sono i team.
- Logo e colori delle squadre arrivano dall'API ufficiale; con `img/teams/<id>.svg` usi il tuo.

Marchi e loghi dei rispettivi proprietari.
