# Mattetemplet

En svensk matteapp med dinosaurietema där barn tränar multiplikation och geometri genom interaktiva uppgifter och 3D-visualiseringar. Appen utvecklas för att användas i webbläsaren på surfplatta och dator.

## Funktioner

- Dagens pass med de områden och den fördelning som föräldern har valt.
- Museet: ett naturhistoriskt museum i 3D som fylls med föremål (under utveckling, se `docs/museum.md`).
- Utforska: fri träning utan klocka inom olika områden.
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
    engine.js         Spelmotorn: dagens pass, Utforska, svar och återkoppling
    home.js           Startsidan och Utforska (fri träning)
    sandbox.js        Bygga, snurra kroppar och vika utan uppgifter
    parent.js         Föräldraläget
    museum/           Museet i 3D: salar, föremål, infotexter och kamera (se docs/museum.md)
    store.js          Lagring och tvätt av sparad data
    three/            3D-scen och 2D-figurer som uppgifterna ritar med
  assets/             Bilder, typsnitt (OFL-licens) och Three.js 0.160.0 (MIT-licens)
docs/                 Planer för större funktioner
tools/                Lokal server och skript för bildbearbetning
koncept/              Konceptbilder och grafiskt arbetsmaterial
```

## Ändra områden och svårighetsgrad

- **Ordning, årskurs och standardval för dagens pass:** ändra listan `CURRICULUM` i `webb/js/curriculum.js`. Ordningen i listan är ordningen i föräldraläget och under Utforska.
- **Svårighetsnivåer inom ett område:** ändra listan `levels` i områdets fil i `webb/js/areas/`. Nivå 1 är den första i listan. Nivåer kan flyttas, tas bort eller läggas till.
- **Nytt område:** skapa en fil i `webb/js/areas/` med samma form som de befintliga (`id`, `name`, `short`, `levels` och `gen`) och lägg till den i `CURRICULUM`.

Föräldern väljer i föräldraläget vilka områden som ska vara med i dagens pass och hur mycket av passet varje område ska få (lite, normalt eller mycket). Valen sparas på enheten.

## Teman

Appen kan byta utseende under en säsong, till exempel Halloween eller jul. Ett tema är en mapp med bilder under `webb/assets/themes/` och en post i `THEMES` i `webb/js/themes.js`.

- Bilderna ska ha samma filnamn och pixelmått som originalen i `webb/assets/` (till exempel `panel.webp`, `bg.jpg` och `levels/door.jpg`). Bilder som saknas i temamappen tas från originalen.
- `season` anger när temat gäller med inställningen **Automatiskt**, till exempel `['10-10', '11-02']`. Perioden får gå över nyår.
- `frames` behövs bara om dekorationer i ramarnas hörn är större än originalets hörn, så att de inte sträcks ut.
- `colors` kan byta knapparnas, pratbubblans och bakgrundens färger (variablerna står i `:root` i `css/app.css`).

Föräldern väljer tema under **Inställningar** i föräldraläget: Automatiskt (efter säsong) eller ett bestämt tema. Bara det aktuella temats bilder laddas. Mappar som heter `_review` och `README.md`-filer i temamapparna publiceras inte.

## Mindre bilder (WebP)

Appens bilder med genomskinlighet är WebP, som är ungefär 90 % mindre än PNG. Bara appikonerna (`icon-32.png`, `icon-180.png`, `icon-192.png` och `icon-512.png`) är kvar som PNG, eftersom webbläsare och hemskärmar vill ha dem så.

En ny eller ändrad PNG-bild (till exempel från `tools\cut.ps1` eller ett nytt tema) görs om till WebP med `tools\webp.ps1`. Skriptet använder Blender i bakgrundsläge (Blender måste vara installerat), behåller genomskinligheten och hoppar över appikonerna och mappar som heter `_source`. Filer vars WebP redan är nyare än PNG-filen görs inte om.

```powershell
.\tools\webp.ps1 -Remove         # kvalitet 90, tar bort PNG-filerna efteråt
.\tools\webp.ps1 -Lossless       # förlustfri, pixel för pixel lika PNG, ungefär hälften så stor
.\tools\webp.ps1 -Path webb\assets\themes\manga -Quality 80 -Force
```

## Integritet och säkerhet

Appen är helt statisk och har ingen server, databas eller inloggning. All data sparas i webbläsarens `localStorage` på den egna enheten och skickas aldrig någonstans.

- Typsnitt och Three.js ligger i `webb/assets/`, så sidan gör inga anrop till andra domäner.
- `index.html` har en Content-Security-Policy som bara tillåter appens egna filer. Inga skript ligger direkt i HTML-koden.
- Sparad och importerad data tvättas i `migrate()` i `store.js` så att en manipulerad säkerhetskopia inte kan föra in HTML eller skript.

## Publicering med GitHub Pages

Arbetsflödet i `.github/workflows/pages.yml` publicerar appen automatiskt vid ändringar på `main`. Endast `index.html`, `css/`, `js/` och `assets/` i `webb/` publiceras.

I repots **Settings → Pages** ska **Source** vara **GitHub Actions**. När den första publiceringen är klar finns appen på:

**[Öppna Mattetemplet](https://aldatroid.github.io/MatteApp/)**

På iPad kan du öppna adressen i Safari och välja **Dela → Lägg till på hemskärmen** för att få en genväg till appen.

Se [GitHubs guide för publiceringskällor](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Sparade framsteg

Inställningar och framsteg lagras i webbläsarens `localStorage`. De hör till den webbläsare och webbadress där appen används och synkroniseras inte automatiskt mellan enheter. Rensad webbplatsdata kan ta bort framstegen. Använd exportfunktionen i föräldraläget för att ta en säkerhetskopia.

## Teknik

- HTML, CSS och JavaScript-moduler.
- Three.js för 3D-visualiseringar.
- Typsnitten Fredoka och Lexend.

Alla resurser ligger i projektet. Appen har ännu inget särskilt stöd för offlineanvändning.
