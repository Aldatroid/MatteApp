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

## Fas 5: fler salar som öppnas efter hand

Museet växer från 5 till 10 salar. Barnet börjar med bara Stora hallen öppen och öppnar resten en i taget. De stängda salarna syns på kartan, så att barnet vet att det finns mer, men man kan inte gå in i dem och inte se vad de innehåller.

### Nya salar

Förslag på fem nya salar med 4–6 föremål var. Varje sal har ett eget golv, ljus och en egen expedition.

| Sal | Exempel på föremål | Stort föremål i delar | Expedition |
|---|---|---|---|
| **Djursalen** | dioramor med bison, älg, brunbjörn och varg, kungsörn som hänger i taket | Älgdiorama (4) | Naturforskare |
| **Antiken** | grekisk amfora, romersk hjälm, mynt, marmorbyst, modell av Colosseum | Colosseum (4) | Arkeolog |
| **Asiens sal** | terrakottasoldat, samurajrustning, kinesisk kompass, porslinsvas | Terrakottasoldat (4) | Asienforskare |
| **Rymdsalen** | solsystemsmodell som hänger i taket, månsten, rymddräkt, teleskop (meteoriten kan flyttas hit) | Solsystemet (8, en planet i taget) | Astronom |
| **Kristallgrottan** | ametistgeod, guldklimp, bergkristall, stenar som lyser i mörker, diamant | Ametistgeod (3) | Geolog |

Salarna kan bytas mot andra teman, till exempel *Sveriges forntid* (hällristningar, bronsåldersföremål) eller *Människokroppen*. De första fem salarna och föremålen ligger kvar där de är.

### Ny planlösning

Museet byggs ut åt sidorna och bakåt. Kameran, väggarna och golven fungerar som nu, så det räcker att lägga till salarna i `ROOMS`, väggarna i `WALLS` och öppningarna i `DOORS`.

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

Stora hallen är navet. Varje ny sal nås via en sal som öppnas före den: Antiken via Egyptiska salen, Djursalen via Fossilsalen och bakre raden via Vikinga- eller Havets sal. Då känns museet som en byggnad man tar sig djupare in i.

### Öppna salar med nycklar

- **Start:** bara Stora hallen är öppen. Första gången barnet går in i museet får det en nyckel och väljer sin första sal. Det valet ersätter dagens expeditionsval, eftersom varje sal hör till en expedition.
- **Nycklar:** barnet får en nyckel när den öppna delen av museet börjar bli full, till exempel när **60 % av delarna i de öppna salarna är hittade**. Då kommer en ny sal i lagom takt, både för den som spelar varje dag och för den som spelar ibland. En fast nivå (efter 5, 12, 20 … fynd) är ett enklare alternativ.
- **Välja sal:** med en nyckel trycker barnet på en stängd sal som gränsar till en öppen sal. Där kan barnet välja själv, så att det känns som ett eget museum.
- **Fynd:** fynd kommer bara från öppna salar, och regeln om högst ett fynd per sal och dag gäller fortfarande. I början, med två öppna salar, blir det alltså högst två fynd per dag. Om alla öppna salar har fått något idag och barnet har en oanvänd nyckel, säger sammanfattningen *"Öppna en ny sal för att hitta mer!"*.
- **Expeditioner:** valet av expedition visar bara de öppna salarnas expeditioner. Stängda salar visas med ett lås och *"Öppnas med en nyckel"*.

### Så ser en stängd sal ut

- **Utifrån:** salen är täckt av ett mörkt tak, som en presenning med texten *"Under uppbyggnad"*, så att man inte ser in. Etiketten visar ett lås och **???** i stället för namnet.
- **Dörrarna:** dörröppningarna mot stängda salar har stängda trädörrar med hänglås, och sammetsrep framför.
- **Innehåll:** inga spöken och inga skyltar. Salens föremål byggs först när salen öppnas, vilket också håller nere antalet 3D-objekt på iPad.
- **Kameran** kan panorera över stängda salar men går inte in i dem. Trycker man på en stängd sal står det *"Den här salen är stängd. Du behöver en nyckel."*, eller *"Tryck för att öppna!"* om barnet har en nyckel.

### När en sal öppnas

1. Pop-upen efter passet säger *"Du har fått en nyckel!"* (samma pop-up som för fynd, med samma ljud).
2. I museet lyser de stängda salar som går att öppna. Barnet trycker på en av dem.
3. Dörrarna svänger upp, taket lyfter och tonar bort, kameran flyger in och föremålens spöken tonar fram.
4. Salens namn visas, och salens expedition blir vald.

### Lagring och befintliga spelare

- `S.museum.rooms`: listan över öppna salar. `S.museum.keys`: antal nycklar som inte är använda. Båda tvättas i `migrate()`.
- Spelare som redan har spelat behåller alla salar där de har fynd, och får dessutom Stora hallen. Med dagens fem salar är det rimligt att låta befintliga spelare ha alla fem öppna från början.

### Delsteg

1. **5a – Lås på dagens salar:** nycklar, stängda salar (tak, dörrar, lås-etiketter), öppningsanimation och fynd bara från öppna salar. Allt går att testa med dagens fem salar.
2. **5b – Utbyggd planlösning:** nya väggar och golv för fem salar, som stängda salar utan innehåll.
3. **5c – Nya salar med föremål:** en sal i taget, med modeller, infotexter och expedition. Djursalen först, eftersom dioramorna är mest *Natt på museet*.
4. **Prestanda:** när 10 salar finns byggs bara öppna salar fullt ut, och statiska väggbitar slås ihop till färre 3D-objekt.

## Faser

1. **Museet i 3D** *(klar)*: salar, ljus, kamera, platshållare för alla föremål, infopanel och ingång från startsidan. Med `?alla` i adressen visas allt som hittat, för granskning.
2. **Fynd från Dagens pass** *(klar)*: `grantFind()` i `js/museum/finds.js` anropas från `finishRun()` och slumpar fyndet. Sammanfattningen visar fyndet, och **Se i museet** flyger dit och sänker ner delen på sin plats.
3. **Riktiga föremål**: GLB-modeller och infotexter om verkliga föremål, med källor.
4. **Expeditioner** *(klar)*: knappen **Expedition** i museet öppnar valet. `EXPEDITIONS` i `catalog.js` listar föremålen per roll, och `finds.js` slumpar i första hand bland den valda rollens föremål. Sammanfattningen visar hur långt expeditionen har kommit och när den är klar.
5. **Fler salar som öppnas efter hand**: se *Fas 5* ovan. Delstegen är 5a lås på dagens salar, 5b utbyggd planlösning och 5c nya salar med föremål.

## Öppna frågor

- Fas 5: ska nyckeln komma efter en andel hittade delar (förslaget) eller efter ett fast antal fynd?
- Fas 5: ska befintliga spelare ha alla fem dagens salar öppna, eller börja om med låsta salar?
- Fas 5: vilka fem nya salar, och i vilken ordning de byggs?

- Ska ett halvt pass (under 80 %) ge något, till exempel damm som räknas mot nästa fynd?
- Ska föräldern kunna se eller styra expeditionen?
- Ljud: en mjuk "klang" när en del sätts på plats, och kanske museiambiens.
