/* ============ Museets salar och föremål ============
   ROOMS: salarna på planlösningen (meter, x åt höger, z mot entrén i söder).
   ARTIFACTS: varje föremål har en bestämd plats. parts = namnen på delarna; ett namn = hela föremålet direkt.
   model = byggfunktion i models.js, stand = hur föremålet ställs ut (platform, pedestal, case, hang).
   rot = vridning; utan rot vänds föremålet (skylten) mot salens mitt, avrundat till 45°.
   view = valfri kameravinkel när man tittar närmare (dist, pitch, y), annars räknas den ut från storleken.
   EXPEDITIONS: rollerna barnet kan välja, med sina föremål. Se docs/museum.md. */

export const WALL_H = 7.5;

// start: salen är öppen från början. goal: mål i matten som öppnar salen, backup: reservväg (antal hittade
// delar totalt) så att ingen fastnar. Se rooms.js.
// sections: salens avdelningar. rect = [x0, z0, x1, z1]. Den första avdelningen är öppen från början,
// de andra är byggplatser tills de öppnar (se finds.js). En avdelning utan föremål är en byggplats tills vidare.
export const ROOMS = [
  { id: 'hall', name: 'Stora hallen', x: [-14, 14], z: [-10, 10], floor: 'hall', light: 0xffc27a, start: true, sections: [
    { id: 'hall-main', name: 'Stora hallen', rect: [-14, -10, 14, 4] },
    { id: 'hall-new', name: 'Nya fynd', rect: [-14, 4, -5, 10] },
  ] },
  { id: 'egypt', name: 'Egyptiska salen', x: [-30, -14], z: [-10, 10], floor: 'sand', light: 0xffa94d, start: true, sections: [
    { id: 'egypt-tomb', name: 'Gravkammaren', rect: [-30, -10, -14, 0] },
    { id: 'egypt-mummy', name: 'Mumiernas hemligheter', rect: [-30, 0, -22, 10] },
    { id: 'egypt-pyramid', name: 'Pyramiderna', rect: [-22, 0, -14, 10] },
  ] },
  { id: 'fossil', name: 'Fossilsalen', x: [14, 30], z: [-10, 10], floor: 'stone', light: 0xffd08a, start: true, sections: [
    { id: 'fossil-dino', name: 'Urtiden', rect: [14, -10, 30, -1] },
    { id: 'fossil-sea', name: 'Urhavet', rect: [14, -1, 24, 10] },
    { id: 'fossil-ice', name: 'Istiden', rect: [24, -1, 30, 10] },
  ] },
  { id: 'viking', name: 'Vikingasalen', x: [-30, 0], z: [-26, -10], floor: 'wood', light: 0xffb36b,
    goal: { type: 'level', area: 'fractions', level: 3 }, backup: { type: 'finds', n: 15 }, sections: [
    { id: 'viking-ship', name: 'Skeppet', rect: [-21, -26, -9, -10] },
    { id: 'viking-runes', name: 'Runor och skatter', rect: [-30, -26, -21, -10] },
    { id: 'viking-warriors', name: 'Krigarna', rect: [-9, -26, 0, -10] },
  ] },
  { id: 'ocean', name: 'Havets sal', x: [0, 30], z: [-26, -10], floor: 'ocean', light: 0x5fd6c8,
    goal: { type: 'level', area: 'length', level: 3 }, backup: { type: 'finds', n: 22 }, sections: [
    { id: 'ocean-whale', name: 'Valarna', rect: [7, -26, 23, -10] },
    { id: 'ocean-arctic', name: 'Arktis', rect: [0, -26, 7, -10] },
    { id: 'ocean-deep', name: 'Djuphavet', rect: [23, -26, 30, -10] },
  ] },
];

// Öppningar mellan salarna: vägg (x eller z), läge och spann.
export const DOORS = [
  { axis: 'x', at: -14, from: -2.5, to: 2.5 },
  { axis: 'x', at: 14, from: -2.5, to: 2.5 },
  { axis: 'z', at: -10, from: -9.5, to: -4.5 },
  { axis: 'z', at: -10, from: 4.5, to: 9.5 },
  { axis: 'z', at: -10, from: -24.5, to: -19.5 },
  { axis: 'z', at: -10, from: 19.5, to: 24.5 },
  { axis: 'x', at: 0, from: -20.5, to: -15.5 },
];

export const ARTIFACTS = [
  // ---------- Stora hallen ----------
  {
    id: 'trex', room: 'hall', model: 'trex', stand: 'platform', pos: [0, -1], rot: -0.35, size: [14, 6],
    name: 'Tyrannosaurus rex', era: '68–66 miljoner år sedan', place: 'Nordamerika',
    parts: ['Skalle', 'Hals', 'Rygg', 'Revben', 'Bäcken', 'Vänster ben', 'Höger ben', 'Armar', 'Svans'],
    text: 'T. rex var ett av de största rovdjuren som någonsin gått på land. Den kunde bli runt 12 meter lång och väga lika mycket som en elefant. Skelett som det här sätts ihop av ben som paleontologer gräver fram ett i taget.',
    fact: 'Armarna var korta, men varje arm var så stark att den kunde lyfta ungefär 200 kilo.',
  },
  {
    id: 'moai', room: 'hall', model: 'moai', stand: 'platform', pos: [-10, -6], size: [3, 3],
    name: 'Moai', era: 'ca 1250–1500 e.Kr.', place: 'Rapa Nui (Påskön)',
    parts: ['Moai'],
    text: 'På ön Rapa Nui mitt i Stilla havet högg invånarna ut nästan tusen jättelika stenhuvuden, moai. De högg dem ur vulkansten och fraktade dem över hela ön, utan hjul eller dragdjur.',
    fact: 'Många moai har en kropp under marken. Det man tror är "bara huvuden" är ofta hela statyer som begravts av jord.',
  },
  {
    id: 'globe', room: 'hall', model: 'globe', stand: 'pedestal', pos: [10, -6], size: [2.4, 2.4],
    name: 'Jordglob', era: 'Den äldsta från 1492', place: 'Nürnberg, Tyskland',
    parts: ['Jordglob'],
    text: 'En jordglob är en karta över hela jorden i form av ett klot. Den äldsta som finns kvar gjordes år 1492, samma år som Columbus seglade över Atlanten. Därför saknas Amerika på den!',
    fact: 'På gamla jordglober ritade man ibland in sjöodjur i haven där ingen ännu hade seglat.',
  },
  // ---------- Egyptiska salen ----------
  {
    id: 'sarcophagus', room: 'egypt', model: 'sarcophagus', stand: 'platform', pos: [-22, -3], rot: 0, size: [3.4, 4.6],
    name: 'Sarkofag', era: 'ca 1300 f.Kr.', place: 'Egypten',
    parts: ['Kista', 'Lock'],
    text: 'I det gamla Egypten lades viktiga personer i en målad kista formad som en människa. Inuti låg mumien, som balsamerats för att kroppen skulle hålla i evigheter.',
    fact: 'Att göra en mumie tog ungefär 70 dagar.',
  },
  {
    id: 'canopic', room: 'egypt', model: 'canopic', stand: 'pedestal', pos: [-27.5, 3], size: [3.2, 1.4],
    name: 'Kanopiska krukor', era: 'ca 1500–1000 f.Kr.', place: 'Egypten',
    parts: ['Imsety (människa)', 'Hapy (babian)', 'Duamutef (schakal)', 'Qebehsenuef (falk)'],
    text: 'När en mumie gjordes lades levern, lungorna, magen och tarmarna i fyra krukor. Locken föreställer Horus fyra söner, som skulle skydda innehållet.',
    fact: 'Hjärtat fick ligga kvar i kroppen. Egyptierna trodde att det behövdes i livet efter döden.',
  },
  {
    id: 'pyramid', room: 'egypt', model: 'pyramid', stand: 'pedestal', pos: [-18, 5], size: [2.6, 2.6],
    name: 'Modell av Cheopspyramiden', era: 'byggd ca 2560 f.Kr.', place: 'Giza, Egypten',
    parts: ['Pyramid'],
    text: 'Cheopspyramiden var världens högsta byggnad i nästan 4 000 år. Den är byggd av över två miljoner stenblock.',
    fact: 'Från början var pyramiden täckt av vit, polerad kalksten som glänste i solen.',
  },
  {
    id: 'scarab', room: 'egypt', model: 'scarab', stand: 'case', pos: [-25, 7], size: [1.2, 1.2],
    name: 'Skarabé', era: 'ca 1500 f.Kr.', place: 'Egypten',
    parts: ['Skarabé'],
    text: 'Skarabén är en skalbagge som rullar kulor av dynga. Egyptierna såg den som en symbol för solguden Khepri, som rullade solen över himlen.',
    fact: 'Små skarabéer av sten användes som lyckoamuletter och sigill.',
  },
  {
    id: 'obelisk', room: 'egypt', model: 'obelisk', stand: 'platform', pos: [-17.5, -7], size: [1.8, 1.8],
    name: 'Obelisk', era: 'ca 1450 f.Kr.', place: 'Egypten',
    parts: ['Obelisk'],
    text: 'En obelisk är en hög, fyrkantig sten som smalnar av uppåt och har en liten pyramid i toppen. Den restes vid tempel och täcktes av hieroglyfer.',
    fact: 'En obelisk är huggen i ett enda stenblock. De största väger flera hundra ton.',
  },
  // ---------- Fossilsalen ----------
  {
    id: 'triceratops', room: 'fossil', model: 'triceratops', stand: 'platform', pos: [22, -4], size: [4, 4],
    name: 'Triceratopsskalle', era: '68–66 miljoner år sedan', place: 'Nordamerika',
    parts: ['Nackkrage', 'Horn', 'Näbb och käke'],
    text: 'Triceratops var en växtätare med tre horn och en stor krage av ben runt nacken. Skallen kunde bli över två meter lång, en av de största skallarna hos något landdjur.',
    fact: 'Triceratops levde samtidigt som T. rex, och man har hittat triceratopsben med bitmärken från T. rex.',
  },
  {
    id: 'ammonite', room: 'fossil', model: 'ammonite', stand: 'pedestal', pos: [18, 5], size: [1.6, 1.6],
    name: 'Ammonit', era: '400–66 miljoner år sedan', place: 'Hela världen',
    parts: ['Ammonit'],
    text: 'Ammoniter var bläckfiskar som bodde i ett spiralformat skal. De simmade i haven i hundratals miljoner år och dog ut samtidigt som dinosaurierna.',
    fact: 'De största ammoniterna hade skal som var nästan två meter breda.',
  },
  {
    id: 'trilobite', room: 'fossil', model: 'trilobite', stand: 'case', pos: [22, 7], size: [1.2, 1.2],
    name: 'Trilobit', era: '520–252 miljoner år sedan', place: 'Hela världen, även Sverige',
    parts: ['Trilobit'],
    text: 'Trilobiter var små havsdjur med skal och många ben, lite som gråsuggor. De är några av de vanligaste fossilen, och man hittar dem i berggrunden i bland annat Västergötland och på Öland.',
    fact: 'Trilobiter hade ögon av kristall, i samma mineral som kalksten.',
  },
  {
    id: 'tusk', room: 'fossil', model: 'tusk', stand: 'platform', pos: [26.5, 3.5], size: [4.2, 1.6],
    name: 'Mammutbete', era: 'för ca 400 000–4 000 år sedan', place: 'Norra halvklotet',
    parts: ['Mammutbete'],
    text: 'Ullhårig mammut var en släkting till elefanten med tjock päls, anpassad för istidens kyla. Betarna var långa och böjda och kunde bli fyra meter.',
    fact: 'De sista mammutarna levde på Wrangelön i Sibirien när pyramiderna i Egypten redan var byggda.',
  },
  {
    id: 'amber', room: 'fossil', model: 'amber', stand: 'case', pos: [27.5, -7], size: [1.2, 1.2],
    name: 'Bärnsten med insekt', era: 'ca 44 miljoner år sedan', place: 'Östersjön',
    parts: ['Bärnsten'],
    text: 'Bärnsten är kåda från urtida träd som har hårdnat till sten. Ibland fastnade små insekter i kådan och har bevarats i miljontals år.',
    fact: 'Bärnsten kan spolas upp på stränderna i Skåne efter en storm.',
  },
  {
    id: 'meteorite', room: 'fossil', model: 'meteorite', stand: 'pedestal', pos: [17.5, -7], size: [1.6, 1.6],
    name: 'Järnmeteorit', era: 'föll för ca 1 miljon år sedan', place: 'Muonionalusta, Norrbotten',
    parts: ['Meteorit'],
    text: 'En meteorit är en sten från rymden som har landat på jorden. Den här sortens meteorit består nästan helt av järn och nickel och bildades nästan samtidigt som solsystemet.',
    fact: 'Den första biten av Muonionalusta-meteoriten hittades år 1906 i Norrbotten.',
  },
  // ---------- Vikingasalen ----------
  {
    id: 'ship', room: 'viking', model: 'ship', stand: 'platform', pos: [-15, -18.5], rot: 0, size: [12, 4.2],
    name: 'Vikingaskepp', era: 'ca 800–1050 e.Kr.', place: 'Skandinavien',
    parts: ['Köl och stävar', 'Skrov', 'Sköldar', 'Mast och segel'],
    text: 'Vikingarnas skepp var snabba och grunda, så de kunde segla både på öppet hav och långt upp i floder. Skrovet byggdes av överlappande plankor av ek.',
    fact: 'Ett långskepp kunde ha över 60 roddare.',
  },
  {
    id: 'runestone', room: 'viking', model: 'runestone', stand: 'platform', pos: [-27, -22.5], size: [2, 2],
    name: 'Runsten', era: 'ca 800–1100 e.Kr.', place: 'Sverige',
    parts: ['Runsten'],
    text: 'Runstenar restes för att minnas någon som hade dött. Texten är skriven med runor, ofta inuti en slingrande orm. Stenarna var målade i starka färger.',
    fact: 'Sverige har flest runstenar i världen, ungefär 2 500 stycken.',
  },
  {
    id: 'helmet', room: 'viking', model: 'helmet', stand: 'case', pos: [-4.5, -22.5], size: [1.2, 1.2],
    name: 'Vikingahjälm', era: 'ca 970 e.Kr.', place: 'Gjermundbu, Norge',
    parts: ['Hjälm'],
    text: 'Vikingahjälmar var runda järnhjälmar, ibland med ett skydd runt ögonen. Den enda nästan hela hjälmen från vikingatiden hittades i Norge.',
    fact: 'Vikingarna hade aldrig horn på hjälmarna. Det hittade en kostymtecknare på till en opera på 1800-talet.',
  },
  {
    id: 'sword', room: 'viking', model: 'sword', stand: 'case', pos: [-5.5, -13.5], size: [1.6, 1],
    name: 'Vikingasvärd', era: 'ca 900 e.Kr.', place: 'Skandinavien',
    parts: ['Svärd'],
    text: 'Ett svärd var dyrt och ofta det finaste en viking ägde. Det gick i arv och fick ibland ett eget namn.',
    fact: 'Vissa svärd har namnet ULFBERHT inristat i bladet, som ett märke.',
  },
  {
    id: 'hoard', room: 'viking', model: 'hoard', stand: 'case', pos: [-25, -13.5], size: [1.2, 1.2],
    name: 'Silverskatt', era: 'ca 870 e.Kr.', place: 'Spillings, Gotland',
    parts: ['Silverskatt'],
    text: 'Vikingar grävde ibland ner sina rikedomar för att gömma dem. Skatterna innehåller mynt från långt bort, ända från Bagdad.',
    fact: 'Spillingsskatten på Gotland vägde 67 kilo silver, den största silverskatten från vikingatiden.',
  },
  // ---------- Havets sal ----------
  {
    id: 'whale', room: 'ocean', model: 'whale', stand: 'hang', pos: [15, -18.5], rot: 0.15, size: [24, 7], view: { dist: 14, pitch: 0.4, y: 3.2 },
    name: 'Blåvalsskelett', era: 'Lever i dag', place: 'Alla världshav',
    parts: ['Skalle', 'Käkar', 'Främre ryggrad', 'Bakre ryggrad', 'Revben', 'Bröstfenor'],
    text: 'Blåvalen är det största djuret som någonsin har levt, större än alla dinosaurier. Den kan bli 30 meter lång men äter mest pyttesmå kräftdjur, krill.',
    fact: 'Blåvalens hjärta väger ungefär 180 kilo, lika mycket som två–tre vuxna människor.',
  },
  {
    id: 'narwhal', room: 'ocean', model: 'narwhal', stand: 'case', pos: [4.5, -13.5], size: [3, 1],
    name: 'Narvaltand', era: 'Lever i dag', place: 'Arktis',
    parts: ['Narvaltand'],
    text: 'Narvalen är en val med en lång, spiralvriden tand som växer rakt ut genom överläppen. Tanden kan bli tre meter lång.',
    fact: 'På medeltiden såldes narvaltänder som horn från enhörningar.',
  },
  {
    id: 'megalodon', room: 'ocean', model: 'megalodon', stand: 'case', pos: [26, -13.5], size: [1.2, 1.2],
    name: 'Megalodontand', era: '23–3,6 miljoner år sedan', place: 'Alla världshav',
    parts: ['Megalodontand'],
    text: 'Megalodon var en gigantisk haj, kanske tre gånger så lång som en vithaj. Det enda som brukar finnas kvar är tänderna, för hajens skelett är av brosk.',
    fact: 'En megalodontand kan vara större än en vuxen människas hand.',
  },
  {
    id: 'nautilus', room: 'ocean', model: 'nautilus', stand: 'case', pos: [26.5, -22.5], size: [1.2, 1.2],
    name: 'Pärlbåt', era: 'Lever i dag', place: 'Stilla havet och Indiska oceanen',
    parts: ['Pärlbåt'],
    text: 'Pärlbåten är en bläckfisk med spiralskal och släkt med ammoniterna. Den simmar upp och ner genom att fylla skalets kamrar med gas eller vatten.',
    fact: 'Pärlbåtens släktingar har funnits i haven i flera hundra miljoner år.',
  },
];

// Expeditioner: barnet väljer en roll, och fynden slumpas då i första hand bland rollens föremål.
// Upptäckaren har alla föremål. Se finds.js för reglerna.
export const EXPEDITIONS = [
  { id: 'explorer', name: 'Upptäckare', text: 'Lite av allt, i alla salar.', items: ARTIFACTS.map(a => a.id) },
  { id: 'paleo', name: 'Paleontolog', text: 'Gräv fram dinosaurier och fossil.', items: ['trex', 'triceratops', 'ammonite', 'trilobite', 'tusk', 'amber', 'meteorite'] },
  { id: 'egypt', name: 'Egyptolog', text: 'Utforska faraonernas Egypten.', items: ['sarcophagus', 'canopic', 'pyramid', 'scarab', 'obelisk'] },
  { id: 'viking', name: 'Vikingaforskare', text: 'Hitta skatter från vikingatiden.', items: ['ship', 'runestone', 'helmet', 'sword', 'hoard'] },
  { id: 'ocean', name: 'Havsforskare', text: 'Upptäck havens jättar.', items: ['whale', 'narwhal', 'megalodon', 'nautilus'] },
];
export const expById = Object.fromEntries(EXPEDITIONS.map(e => [e.id, e]));

// Föremål utan egen vridning vänds med framsidan och skylten in mot salen.
for (const a of ARTIFACTS) {
  if (a.rot != null) continue;
  const R = ROOMS.find(r => r.id === a.room), dx = (R.x[0] + R.x[1]) / 2 - a.pos[0], dz = (R.z[0] + R.z[1]) / 2 - a.pos[1];
  a.rot = Math.round(Math.atan2(dx, dz) / (Math.PI / 4)) * Math.PI / 4;
}

export const byId = Object.fromEntries(ARTIFACTS.map(a => [a.id, a]));
export const roomById = Object.fromEntries(ROOMS.map(r => [r.id, r]));
export const SECTIONS = ROOMS.flatMap(R => R.sections.map((sec, i) => ({ ...sec, room: R.id, start: i === 0 })));
export const sectionById = Object.fromEntries(SECTIONS.map(x => [x.id, x]));
// Varje föremål hör till den avdelning där det står.
const inRect = ([x0, z0, x1, z1], x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
for (const a of ARTIFACTS) a.section = roomById[a.room].sections.find(sec => inRect(sec.rect, a.pos[0], a.pos[1]))?.id || roomById[a.room].sections[0].id;
export const sectionAt = (x, z) => SECTIONS.find(sec => inRect(sec.rect, x, z));
export const TOTAL_PARTS = ARTIFACTS.reduce((s, a) => s + a.parts.length, 0);
