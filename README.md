# Mattelabbet

En svensk matteapp med dinosaurietema där barn tränar multiplikation och geometri genom interaktiva uppgifter och 3D-visualiseringar. Appen utvecklas för att användas i webbläsaren på surfplatta och dator.

## Funktioner

- Dagens pass med en blandning av tabellträning och geometri.
- Fri träning inom olika områden.
- Visuellt stöd med byggstenar och geometriska former i 3D.
- Föräldraläge med statistik och inställningar för passens längd och innehåll.
- Export och import av sparade framsteg för säkerhetskopiering eller flytt mellan enheter.

## Köra lokalt

Projektet använder HTML, CSS och JavaScript utan något npm-installationssteg. Kör följande från projektmappen i PowerShell:

```powershell
# Uppdatera webbversionen från källfilen.
.\tools\build.ps1

# Starta den lokala webbservern.
.\tools\serve.ps1
```

Öppna sedan <http://localhost:8765> i webbläsaren. Stoppa servern med `Ctrl+C`.

Servern är avsedd för testning på samma dator. För användning på surfplatta är målet att publicera appen med GitHub Pages.

## Projektstruktur

```text
mattelabbet.html   Källfil med appens HTML, CSS och JavaScript
webb/             Webbversionen som kan publiceras
  index.html      Genereras av tools/build.ps1
  assets/         Bilder och texturer som appen använder
    fonts/        Typsnitten Fredoka och Lexend (OFL-licens)
    lib/          Three.js 0.160.0 (MIT-licens)
tools/            Skript för bygge, lokal server och bildbearbetning
koncept/          Konceptbilder och grafiskt arbetsmaterial
```

Gör ändringar i `mattelabbet.html` och kör byggskriptet för att uppdatera `webb/index.html`.

## Integritet och säkerhet

Appen är helt statisk och har ingen server, databas eller inloggning. All data sparas i webbläsarens `localStorage` på den egna enheten och skickas aldrig någonstans.

- Typsnitt och Three.js ligger i `webb/assets/`, så sidan gör inga anrop till andra domäner.
- `tools/build.ps1` lägger till en Content-Security-Policy som bara tillåter egna filer och det inbyggda skriptet (via dess SHA-256-hash). Hashen räknas om vid varje bygge.
- Sparad och importerad data tvättas i `migrate()` så att en manipulerad säkerhetskopia inte kan föra in HTML eller skript.

## Publicering med GitHub Pages

Arbetsflödet i `.github/workflows/pages.yml` bygger och publicerar appen automatiskt vid ändringar på `main`. Endast appens startsida och `webb/assets/` publiceras.

I repots **Settings → Pages** ska **Source** vara **GitHub Actions**. När den första publiceringen är klar finns appen på:

**[Öppna Mattelabbet](https://aldatroid.github.io/MatteApp/)**

På iPad kan du öppna adressen i Safari och välja **Dela → Lägg till på hemskärmen** för att få en genväg till appen.

Se [GitHubs guide för publiceringskällor](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Sparade framsteg

Inställningar och framsteg lagras i webbläsarens `localStorage`. De hör till den webbläsare och webbadress där appen används och synkroniseras inte automatiskt mellan enheter. Rensad webbplatsdata kan ta bort framstegen. Använd exportfunktionen i föräldraläget för att ta en säkerhetskopia.

## Teknik och externa resurser

- HTML, CSS och JavaScript.
- Three.js för 3D-visualiseringar, hämtat från jsDelivr.
- Typsnitten Fredoka och Lexend, hämtade från Google Fonts.

Internetanslutning behövs för att hämta de externa resurserna. Appen har ännu inget särskilt stöd för offlineanvändning.
