# Museet – plan

Barnet bygger upp ett naturhistoriskt museum i 3D genom att göra Dagens pass. Varje fullt pass ger ett **fynd**: en hel artefakt eller en del av en stor artefakt, till exempel en bit av ett T. rex-skelett. Museet är inspirerat av *Natt på museet*, med höga salar, varmt ljus, marmorgolv, montrar och sammetsrep.

## Spelloopen

1. Barnet gör Dagens pass. Ett fullt pass ger 1 fynd (högst ett per sal och dag). Det är samma regel som för "Dagens pass är gjort" (minst 80 % av passets tid).
2. Sammanfattningen visar fyndet: *"Du hittade T. rex-skallen (3 av 9 delar)"* och en knapp **Se i museet**.
3. Museet öppnas, kameran flyger till platsen och den nya delen tonar in där den saknades.
4. Barnet kan sedan fritt utforska museet och läsa om allt som är hittat.

Föremål som inte är hittade än syns som ett svagt "spöke" på sin plats. Barnet ser vad som väntar och var det ska stå. Barnet väljer aldrig placering, eftersom varje föremål har en bestämd plats.

### Hela föremål och föremål i delar

Varje artefakt har 1 eller flera delar. Små föremål (skarabé, svärd, ammonit) är hela med en gång. Stora föremål delas upp så att de byggs under flera dagar:

| Föremål | Delar |
|---|---|
| T. rex-skelett | 9 (skalle, hals, rygg, revben, bäcken, vänster ben, höger ben, armar, svans) |
| Blåvalsskelett | 6 |
| Vikingaskepp | 4 (köl och stävar, skrov, sköldar, mast och segel) |
| Kanopiska krukor | 4 (en kruka i taget) |
| Triceratopsskalle | 3 |
| Sarkofag | 2 |

### Vilka fynd kommer?

- **Slumpat:** föremålet slumpas bland det som är kvar, så olika barn hittar saker i olika ordning. Stora föremål byggs del för del, i delarnas ordning.
- **En sak per sal och dag:** varje sal kan få högst ett fynd per dag. Gör barnet fler pass samma dag kommer fynden från andra salar. När alla salar med saker kvar har fått något den dagen ger passen inga fler fynd förrän nästa dag, och sammanfattningen säger det.
- **Expedition:** barnet väljer en roll: *Upptäckare* (lite av allt), *Paleontolog* (dinosaurier och fossil), *Egyptolog*, *Vikingaforskare* eller *Havsforskare*. Fynden slumpas i första hand bland rollens föremål. Om rollens salar redan har fått något idag, eller om rollen är klar, slumpas fynden bland allt annat.

Reglerna finns i `js/museum/finds.js`, och expeditionernas föremål i `EXPEDITIONS` i `catalog.js`.

## Museets salar

```text
        z = -26  (bakre väggen, höga fönster)
 ┌───────────────────────────┬───────────────────────────┐
 │       Vikingasalen        │        Havets sal         │
 │  skepp, runsten, hjälm    │  blåval hänger i taket    │
 ├──────────┬────────────────┴───────────┬───────────────┤ z = -10
 │          │                            │               │
 │ Egyptiska│        Stora hallen        │  Fossilsalen  │
 │  salen   │   T. rex, moai, jordglob   │ triceratops,  │
 │          │                            │ ammonit, mammut│
 └──────────┴────────────╥───────────────┴───────────────┘ z = 10
   x = -30          entré (söder)                    x = 30
```

Salarna är 7,5 m höga och hänger ihop med valvbågar. Fler salar planeras i fas 5, se nedan.

## Kamera och utforskande

- **Överblick:** kameran tittar snett ovanifrån, som på ett dockskåp. Väggar som vetter mot kameran sänks automatiskt till en list vid golvet, så att man ser in i alla salar. Inne i en sal sänks bara de väggar som skymmer den salen; alla andra står kvar.
- **Panorera:** dra med ett finger eller musen.
- **Zooma:** nyp med två fingrar eller använd scrollhjulet. Kameran sänks mot golvet när man zoomar in.
- **Vrid:** vrid med två fingrar, högerdra med musen, eller använd vridknapparna.
- **Välja föremål:** tryck på det. Kameran flyger fram och en infopanel öppnas. **Stäng** flyger tillbaka.
- **Snabbval av sal:** knappar längst ner flyger till en sal.

## Infotext

Varje föremål har:

- **namn** och **sal**
- **tid** (till exempel "68–66 miljoner år sedan") och **plats** (till exempel "Nordamerika")
- **text**, 2–4 meningar på barnets nivå
- **Visste du?**: ett roligt faktum
- **delar**: namnen på delarna, så att infopanelen kan visa vilka som är hittade
- senare: **källa/bildkredit** för riktiga föremål och modeller

Texterna i första versionen gäller föremålstypen (T. rex, runsten). När ett riktigt föremål läggs in skrivs texten om för just det föremålet, och källan anges.

## Modeller

- **Nu:** förenklade platshållare som byggs i kod (`js/museum/models.js`). De har rätt storlek, plats och uppdelning i delar, så att allt kan testas innan riktiga modeller finns.
- **Senare:** riktiga 3D-modeller i `.glb`-format, i `assets/museum/models/`, laddade med `GLTFLoader` från Three.js 0.160.0 (MIT, läggs i `assets/lib/`). Ett föremål i delar har en nod per del i modellen, med samma namn som i `parts`. Fria modeller av riktiga föremål finns bland annat hos Smithsonian 3D (CC0) och på Sketchfab (kolla licensen per modell).
- **Prestanda på iPad:** högst ett skuggande ljus, ett punktljus per sal, återanvända material, och modeller under cirka 50 000 trianglar per stort föremål.

## Lagring

`S.museum = { found: { [artefakt-id]: antal delar }, log: [{ t, id, part }], expedition }`, tvättat i `migrate()` som all annan sparad data. Exporten i föräldraläget tar med museet automatiskt.

## Fas 5: ett museum som växer

Museet ska kännas levande: nya salar öppnar, och inne i salarna byggs nya avdelningar upp. Barnet ser att något är på gång men inte exakt vad. Det som öppnar nästa sal är att barnet blir bättre på matte, inte bara att det spelar många pass.

### Tre nivåer av öppet och stängt

| | Vad det är | Vad barnet ser när den är stängd | Vad som öppnar den |
|---|---|---|---|
| **Sal** | ett helt rum, till exempel Kristallgrottan | ett tak över salen, stängda dörrar med hänglås, **???** i stället för namnet | ett **mål i matten** (se nedan) |
| **Avdelning** | en del av en sal med 4–6 föremål, till exempel *Istiden* i Fossilsalen | byggplank, ställningar och skynken; en skylt *"Här bygger vi något nytt!"* | att barnet har hittat det mesta i salens öppna avdelningar |
| **Föremål** | en monter i en öppen avdelning | ett svagt spöke på sin plats (som nu) | ett fynd från Dagens pass (som nu) |

### Start

Stora hallen och två salar är öppna från början: **Fossilsalen** och **Egyptiska salen**. Det är dinosaurier och mumier, två ämnen de flesta barn tycker om. I varje öppen sal är en eller två avdelningar färdiga, och resten är under uppbyggnad. Med det finns cirka 12–15 föremål att hitta de första veckorna.

### Plats för 10–20 föremål per sal: avdelningar

Varje sal delas i **3–4 avdelningar** med 4–6 föremål var, alltså 12–20 föremål per sal. En avdelning är ett eget område i salen (en vägg med montrar, en hörna med en diorama, en ö mitt i rummet) med en egen liten rubrik på en skylt. Exempel för Fossilsalen (16 × 20 m):

```text
  ┌──────────────────────┬────────────────────┐
  │ B. Urhavet           │ C. Istiden         │
  │ ammonit, trilobit,   │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │   ▒ = byggplank och skynken
  │ megalodon …          │ ▒ Under uppbyggnad │       (stängd avdelning)
  │                      │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │
  ├──────────────────────┴────────────────────┤
  │ A. Dinosaurierna                          │
  │ triceratops, T. rex-tänder, ägg …         │
  │                                           │
  │ D. Bärnsten och mineraler (stängd) ▒▒▒▒▒▒ │
  └─────────────────── dörr ──────────────────┘
```

- **Avdelningar öppnar inifrån salen:** när barnet har hittat cirka **75 % av delarna i salens öppna avdelningar** blir nästa avdelning "klar". För att bygga förväntan öppnar den **nästa dag**: pop-upen efter passet säger *"Bygget i Fossilsalen är nästan klart. Kom tillbaka i morgon!"*. Nästa dag visar museet ett band att klippa: barnet trycker, skynkena faller och spökena tonar fram.
- **Byggplatsen** är byggd i kod precis som resten: lågt byggplank med affischer, en ställning, ett par skynken över former under tyget (en antydan om storleken, men inte vad det är), en stege och en trafikkon. Den byggs om när avdelningen öppnar.
- Varje sal har sina **platser** (positioner för montrar) grupperade per avdelning i katalogen. Då kan nya föremål läggas till utan att någon flyttar något.

### Salar öppnar med mål i matten

Varje ny sal hör ihop med ett område i appen, med ett tema som passar:

| Sal | Område | Mål (förslag) | Varför det passar |
|---|---|---|---|
| Vikingasalen | Bråk | nivå 3 | dela upp silverskatten |
| Havets sal | Längd och enheter | nivå 3 | blåvalen är 30 meter |
| Kristallgrottan | Symmetri | nivå 4 | kristaller är symmetriska |
| Antiken | Area och omkrets | nivå 3 | mosaikgolv och Colosseum |
| Rymdsalen | Känna igen kroppar | nivå 2 | planeter är klot |
| Asiens sal | Utfällningar | nivå 2 | origami och papperslyktor |
| Djursalen | Gångertabellerna | 40 gångertal sitter | räkna djuren i flocken |

- **Synligt mål:** när barnet trycker på en stängd sal står det till exempel *"Kristallgrottan öppnar när du når nivå 4 i Symmetri"*, med en mätare som visar hur långt barnet har kommit. Salens namn visas, men inte innehållet, så att barnet vet vad det jobbar mot. Ska namnet också vara hemligt (**???**), visas bara målet.
- **Ingen fastnar:** om föräldern har tagit bort området från Dagens pass, eller om barnet kör fast, öppnas salen också av en **reservväg**: ett antal hittade fynd (till exempel 15 fynd efter att förra salen öppnade). Mätaren visar den väg som är närmast målet.
- **En nivå som går ner** (nivålogiken flyttar ner barnet efter två fel i rad) stänger aldrig en sal igen. Öppnade salar sparas.
- **När en sal öppnar:** pop-upen efter passet säger *"Kristallgrottan har öppnat!"* med samma ljud som för fynd, och **Se i museet** flyger dit, där dörrarna svänger upp och taket lyfter.
- **Expeditionen** för en sal blir valbar när salen öppnar.

### Fynd

Fynd kommer bara från **öppna avdelningar i öppna salar**, och regeln om högst ett fynd per sal och dag gäller fortfarande. I början, med tre öppna salar, blir det högst tre fynd per dag.

### Ny planlösning

Museet byggs ut åt sidorna och bakåt till tio salar. Kameran, väggarna och golven fungerar som nu.

```text
 z = -42 ┌──────────────┬───────────────┬──────────────┐
         │  Rymdsalen   │ Kristallgrottan│  Asiens sal │
 z = -26 ├──────────────┴───────┬───────┴──────────────┤
         │     Vikingasalen     │      Havets sal      │
 ┌───────┼────────┬─────────────┴─────────┬────────────┼────────┐ z = -10
 │Antiken│Egyptiska│     Stora hallen    │ Fossilsalen│Djursalen│
 └───────┴────────┴──────────╥────────────┴────────────┴────────┘ z = 10
 x = -46  -30      -14      entré       14          30     46
```

### Data

- **Katalogen delas upp per sal:** `js/museum/rooms/fossil.js` och så vidare, med salens avdelningar, platser, föremål och mål. Med 10 salar × 15 föremål blir en enda fil för stor.
- **Mål** beskrivs som data, till exempel `{ type: 'level', area: 'symmetry', level: 4 }`, `{ type: 'facts', n: 40 }` eller `{ type: 'finds', n: 15 }`, så att de är lätta att ändra.
- **Lagring:** `S.museum.open = { rooms: [...], sections: [...] }` för det som är öppet, plus `S.museum.pending` för en avdelning som öppnar i morgon. Tvättas i `migrate()`.
- **Befintliga spelare:** salar och avdelningar där barnet redan har fynd räknas som öppna. Ingen förlorar något.

### Delsteg

1. **5a – Avdelningar och byggplatser** i dagens fem salar: dela salarna i avdelningar, flytta dagens föremål till sina avdelningar, bygg byggplatsen och öppningen nästa dag.
2. **5b – Salar som öppnar med mål i matten:** stängda salar (tak, dörrar, lås), målen och reservvägen, mätaren i museet och pop-upen när en sal öppnar. Testas med dagens salar: Vikingasalen och Havets sal börjar stängda.
3. **5c – Utbyggd planlösning:** väggar och golv för fem nya salar, som stängda salar.
4. **5d – Fler föremål:** fyll salarna till 10–20 föremål, en sal i taget, med modeller och infotexter. Djursalen först bland de nya, eftersom dioramorna är mest *Natt på museet*.
5. **Prestanda:** bara öppna salar och avdelningar byggs fullt ut, och statiska väggbitar slås ihop till färre 3D-objekt.

## Faser

1. **Museet i 3D** *(klar)*: salar, ljus, kamera, platshållare för alla föremål, infopanel och ingång från startsidan. Med `?alla` i adressen visas allt som hittat, för granskning.
2. **Fynd från Dagens pass** *(klar)*: `grantFind()` i `js/museum/finds.js` anropas från `finishRun()` och slumpar fyndet. Sammanfattningen visar fyndet, och **Se i museet** flyger dit och sänker ner delen på sin plats.
3. **Riktiga föremål**: GLB-modeller och infotexter om verkliga föremål, med källor.
4. **Expeditioner** *(klar)*: knappen **Expedition** i museet öppnar valet. `EXPEDITIONS` i `catalog.js` listar föremålen per roll, och `finds.js` slumpar i första hand bland den valda rollens föremål. Sammanfattningen visar hur långt expeditionen har kommit och när den är klar.
5. **Ett museum som växer**: se *Fas 5* ovan. Delsteg 5a avdelningar och byggplatser, 5b salar som öppnar med mål i matten, 5c utbyggd planlösning, 5d fler föremål.

## Öppna frågor

- Fas 5: ska en stängd sal visa sitt namn (och målet), eller bara **???** och målet?
- Fas 5: passar kopplingen mellan salar och områden, och är målnivåerna lagom?
- Fas 5: ska en avdelning öppna nästa dag (förväntan) eller direkt när målet är nått?
- Fas 5: ska skynkena på byggplatserna antyda formen på det som kommer, eller vara helt anonyma?
- Ska ett halvt pass (under 80 %) ge något, till exempel damm som räknas mot nästa fynd?
- Ska föräldern kunna se eller styra expeditionen?
- Ljud: en mjuk "klang" när en del sätts på plats, och kanske museiambiens.
