# Mangatema

Ljust tema i tecknad mangastil: kritpapper, krickgröna metallramar, bärnstensgula knappar och rostfärgade detaljer. Guiden är en rödhårig labbassistent, appikonen en triceratops. Temat har ingen säsong och väljs bara manuellt under Tema i föräldraläget.

Alla bilder är utklipp ur _source/ (inga nygenererade bilder):

- ui-style-sheet-v3.png: panel, header, topbar, gear, porträtten (dino_ring = guiden, dino = triceratopsen), ikonerna (DNA-spiralen ersätter berget) och appikonerna. btn_pass är ritad med stilarkets bärnstensstruktur och fotspår. I toppraden är den randiga mätaren ersatt av en slät mittbit och ägget borttaget ur facket, där tipsknappen ligger.
- greenhouse-habitat: startsidans bakgrund (bg, bg_blur) och levels/door.jpg.
- incubation-nursery: levels/progress1–3.jpg, tre utsnitt av samma rum.
- genetics-laboratory: levels/final.jpg.

Bilder som appen inte använder (bubble, glowframe, hintbar, key*, icon_chev) saknas och tas från assets/. Ramarnas skärningar och färgerna står i js/themes.js. Mörka detaljer som inte är variabler skrivs över i css/app.css under [data-theme="manga"].

Bygg om bilderna: `powershell -ExecutionPolicy Bypass -File webb\assets\themes\manga\_review\pack.ps1`
