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

Salarna är 7,5 m höga och hänger ihop med valvbågar. Nya salar (till exempel en djursal med dioramor, en rymdsal med meteoriter eller en antiksal med Rom och Grekland) läggs till i `ROOMS` och får en plats på planlösningen.

## Kamera och utforskande

- **Överblick:** kameran tittar snett ovanifrån, som på ett dockskåp. Väggarna som står mellan kameran och en sal sänks automatiskt till låga murar, så att man ser in i alla salar. När man zoomar in i en sal reser sig dess bortre väggar med dekorationer, valv och fönster.
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

`S.museum = { found: { [artefakt-id]: antal delar }, log: [{ t, id, part }] }`, tvättat i `migrate()` som all annan sparad data. Exporten i föräldraläget tar med museet automatiskt.

## Faser

1. **Museet i 3D** *(klar)*: salar, ljus, kamera, platshållare för alla föremål, infopanel och ingång från startsidan. Med `?alla` i adressen visas allt som hittat, för granskning.
2. **Fynd från Dagens pass** *(klar)*: `grantFind()` i `js/museum/finds.js` anropas från `finishRun()` och slumpar fyndet. Sammanfattningen visar fyndet, och **Se i museet** flyger dit och sänker ner delen på sin plats.
3. **Riktiga föremål**: GLB-modeller och infotexter om verkliga föremål, med källor.
4. **Expeditioner** *(klar)*: knappen **Expedition** i museet öppnar valet. `EXPEDITIONS` i `catalog.js` listar föremålen per roll, och `finds.js` slumpar i första hand bland den valda rollens föremål. Sammanfattningen visar hur långt expeditionen har kommit och när den är klar.
5. **Fler salar**: djursal med dioramor, rymd och meteoriter, antiken, med mera.

## Öppna frågor

- Ska ett halvt pass (under 80 %) ge något, till exempel damm som räknas mot nästa fynd?
- Ska föräldern kunna se eller styra expeditionen?
- Ljud: en mjuk "klang" när en del sätts på plats, och kanske museiambiens.
