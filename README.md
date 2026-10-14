# Mattelabbet

En svensk matteapp med dinosaurietema där barn tränar multiplikation och geometri genom interaktiva uppgifter och 3D-visualiseringar. Appen utvecklas för att användas i webbläsaren på surfplatta och dator.

## Funktioner

- Dagens pass med de områden och den fördelning som föräldern har valt.
- Fri träning inom olika områden.
- Visuellt stöd med byggstenar och geometriska former i 3D.
- Föräldraläge med statistik, val av områden och vikter för dagens pass samt passets längd.
- Export och import av sparade framsteg för säkerhetskopiering eller flytt mellan enheter.

## Köra lokalt

Projektet använder HTML, CSS och JavaScript-moduler utan något byggsteg eller npm. Starta den lokala webbservern från projektmappen i PowerShell:

```powershell
.\tools\serve.ps1
```

Öppna sedan <http://localhost:8765> i webbläsaren. Stoppa servern med `Ctrl+C`. Ändringar i `webb/` syns direkt när sidan laddas om.

Servern är avsedd för testning på samma dator. Appen behöver en webbserver eftersom JavaScript-moduler inte kan laddas direkt från filsystemet.

## Projektstruktur

```text
webb/                 Appen, som den publiceras
  index.html          Sidans struktur (skärmar och knappar)
  css/app.css         Utseende
  js/
    main.js           Startar appen
    curriculum.js     Alla övningsområden: ordning, Lgr22-rubrik, årskurs och standardvikt
    areas/            Ett övningsområde per fil, med uppgifter och svårighetsnivåer
    levels.js         Hur barnet flyttas mellan nivåer
    engine.js         Spelmotorn: dagens pass, fri lek, svar och återkoppling
    home.js           Startsidan och fri lek
    sandbox.js        Bygga, utforska och vika utan uppgifter
    parent.js         Föräldraläget
    store.js          Lagring och tvätt av sparad data
    three/            3D-scen och 2D-figurer som uppgifterna ritar med
  assets/             Bilder, typsnitt (OFL-licens) och Three.js 0.160.0 (MIT-licens)
tools/                Lokal server och skript för bildbearbetning
koncept/              Konceptbilder och grafiskt arbetsmaterial
```

## Ändra områden och svårighetsgrad

- **Ordning, årskurs och standardval för dagens pass:** ändra listan `CURRICULUM` i `webb/js/curriculum.js`. Ordningen i listan är ordningen i föräldraläget och i fri lek.
- **Svårighetsnivåer inom ett område:** ändra listan `levels` i områdets fil i `webb/js/areas/`. Nivå 1 är den första i listan. Nivåer kan flyttas, tas bort eller läggas till.
- **Nytt område:** skapa en fil i `webb/js/areas/` med samma form som de befintliga (`id`, `name`, `short`, `levels` och `gen`) och lägg till den i `CURRICULUM`.

Föräldern väljer i föräldraläget vilka områden som ska vara med i dagens pass och hur mycket av passet varje område ska få (lite, normalt eller mycket). Valen sparas på enheten.

## Integritet och säkerhet

Appen är helt statisk och har ingen server, databas eller inloggning. All data sparas i webbläsarens `localStorage` på den egna enheten och skickas aldrig någonstans.

- Typsnitt och Three.js ligger i `webb/assets/`, så sidan gör inga anrop till andra domäner.
- `index.html` har en Content-Security-Policy som bara tillåter appens egna filer. Inga skript ligger direkt i HTML-koden.
- Sparad och importerad data tvättas i `migrate()` i `store.js` så att en manipulerad säkerhetskopia inte kan föra in HTML eller skript.

## Publicering med GitHub Pages

Arbetsflödet i `.github/workflows/pages.yml` publicerar appen automatiskt vid ändringar på `main`. Endast `index.html`, `css/`, `js/` och `assets/` i `webb/` publiceras.

I repots **Settings → Pages** ska **Source** vara **GitHub Actions**. När den första publiceringen är klar finns appen på:

**[Öppna Mattelabbet](https://aldatroid.github.io/MatteApp/)**

På iPad kan du öppna adressen i Safari och välja **Dela → Lägg till på hemskärmen** för att få en genväg till appen.

Se [GitHubs guide för publiceringskällor](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Sparade framsteg

Inställningar och framsteg lagras i webbläsarens `localStorage`. De hör till den webbläsare och webbadress där appen används och synkroniseras inte automatiskt mellan enheter. Rensad webbplatsdata kan ta bort framstegen. Använd exportfunktionen i föräldraläget för att ta en säkerhetskopia.

## Teknik

- HTML, CSS och JavaScript-moduler.
- Three.js för 3D-visualiseringar.
- Typsnitten Fredoka och Lexend.

Alla resurser ligger i projektet. Appen har ännu inget särskilt stöd för offlineanvändning.
