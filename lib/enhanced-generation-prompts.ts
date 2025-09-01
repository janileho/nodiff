export function createEnhancedGenerationPrompt(
  module: string, 
  section: any, 
  difficulty: string, 
  task_type: string = "verbal"
): string {
  const difficultyMap = {
    "helppo": "helppo",
    "keskitaso": "keskitaso", 
    "haastava": "haastava"
  };

  const difficultyText = difficultyMap[difficulty as keyof typeof difficultyMap] || "keskitaso";

  // Create section-specific examples and guidance
  const sectionGuidance = getSectionSpecificGuidance(section.id, difficultyText);

  if (task_type === "nonverbal") {
    return `Luo nonverbal matematiikan tehtävä seuraaville tiedoille:

Moduuli: ${module}
Aihe: ${section.name}
Kuvaus: ${section.description}
Vaikeustaso: ${difficultyText}

${sectionGuidance}

TÄRKEÄÄ: Tämä on NONVERBAL tehtävä. Tehtävän kysymys saa sisältää AINOASTAAN matemaattisia lausekkeita, yhtälöitä tai kaavoja. EI SAA olla sanoja, selityksiä tai tekstiä.

LAATUKRITEERIT:
1. MATEMAATTINEN TARKKUUS: Kaikki laskut ja kaavat ovat oikeita
2. SELKEÄ RAKENNE: Ratkaisu sisältää kaikki välivaiheet selkeästi
3. SOPIVA VAIKEUSTASO: Tehtävä vastaa ${difficultyText} tasoa
4. AIHEEN RELEVANSSI: Tehtävä liittyy suoraan aiheeseen ${section.name}
5. YMMÄRRETTÄVYYS: Kysymys on selkeä ja yksiselitteinen

RATKAISUVASTAUKSEN RAKENNE:
- Vaihe 1: Ongelman tunnistaminen ja strategian valinta
- Vaihe 2: Tarvittavien kaavojen ja sääntöjen soveltaminen
- Vaihe 3: Laskujen suorittaminen selkeästi
- Vaihe 4: Tulosten tarkistaminen ja validointi
- Vaihe 5: Lopullisen vastauksen esittäminen

Vastaa JSON-muodossa seuraavalla rakenteella:
{
  "question": "Pelkkä matemaattinen lauseke tai yhtälö, EI sanoja",
  "solution_steps": ["Vaihe 1", "Vaihe 2", "Vaihe 3", "Vaihe 4", "Vaihe 5"],
  "final_answer": "Lopullinen vastaus",
  "hints": ["Vihje 1", "Vihje 2"],
  "common_mistakes": ["Yleinen virhe 1", "Yleinen virhe 2"]
}

Vastaa vain JSON-muodossa, ilman ylimääräisiä selityksiä.`;
  } else {
    return `Luo matematiikan tehtävä seuraaville tiedoille:

Moduuli: ${module}
Aihe: ${section.name}
Kuvaus: ${section.description}
Vaikeustaso: ${difficultyText}

${sectionGuidance}

LAATUKRITEERIT:
1. MATEMAATTINEN TARKKUUS: Kaikki laskut ja kaavat ovat oikeita
2. SELKEÄ RAKENNE: Ratkaisu sisältää kaikki välivaiheet selkeästi
3. SOPIVA VAIKEUSTASO: Tehtävä vastaa ${difficultyText} tasoa
4. AIHEEN RELEVANSSI: Tehtävä liittyy suoraan aiheeseen ${section.name}
5. YMMÄRRETTÄVYYS: Kysymys on selkeä ja yksiselitteinen

RATKAISUVASTAUKSEN RAKENNE:
- Vaihe 1: Ongelman tunnistaminen ja strategian valinta
- Vaihe 2: Tarvittavien kaavojen ja sääntöjen soveltaminen
- Vaihe 3: Laskujen suorittaminen selkeästi
- Vaihe 4: Tulosten tarkistaminen ja validointi
- Vaihe 5: Lopullisen vastauksen esittäminen

ESIMERKKI HYVÄSTÄ RATKAISUSTA:
Vaihe 1: "Tunnistetaan, että kyseessä on trigonometrinen yhtälö sin(x) = a"
Vaihe 2: "Käytetään kaavaa: x = arcsin(a) + 2kπ tai x = π - arcsin(a) + 2kπ"
Vaihe 3: "arcsin(1/2) = π/6, joten x = π/6 + 2kπ tai x = 5π/6 + 2kπ"
Vaihe 4: "Tarkistetaan: sin(π/6) = 1/2 ✓, sin(5π/6) = 1/2 ✓"
Vaihe 5: "Ratkaisu: x = π/6 + 2kπ tai x = 5π/6 + 2kπ, k ∈ ℤ"

Vastaa JSON-muodossa seuraavalla rakenteella:
{
  "question": "Selkeä ja yksiselitteinen kysymys",
  "solution_steps": ["Vaihe 1", "Vaihe 2", "Vaihe 3", "Vaihe 4", "Vaihe 5"],
  "final_answer": "Tarkka lopullinen vastaus",
  "hints": ["Hyödyllinen vihje 1", "Hyödyllinen vihje 2"],
  "common_mistakes": ["Yleinen virhe 1", "Yleinen virhe 2"]
}

Tehtävän tulee olla:
- Sopivaa vaikeustasoa (${difficultyText})
- Selkeä ja ymmärrettävä
- Sisältää riittävästi haastetta
- Ratkaistavissa annetuilla tiedoilla
- Liittyy suoraan aiheeseen: ${section.name}

Vastaa vain JSON-muodossa, ilman ylimääräisiä selityksiä.`;
  }
}

function getSectionSpecificGuidance(sectionId: string, difficulty: string): string {
  switch (sectionId) {
    case "maa5_mathematical_modeling":
      return `TÄRKEÄÄ: Tämä aihe käsittelee ilmiöiden mallintamista trigonometrisilla ja eksponenttifunktioilla.

ESIMERKKEJÄ tehtävistä:
- Värähtelyliikkeen mallintaminen: y = 2·sin(3t) + 1
- Sähkövirran mallintaminen: I = 5·cos(2πft)
- Populaatiokasvu: P(t) = P₀·e^(kt)
- Radioaktiivinen hajoaminen: N(t) = N₀·e^(-λt)

Tehtävät voivat sisältää:
- Funktioiden piirtämistä ja tulkintaa
- Parametrien määrittämistä mallista
- Mallintamistehtäviä reaalimaailman ilmiöistä
- Yhtälöiden ratkaisemista mallintamisessa

Vaikeustaso ${difficulty}: ${difficulty === "helppo" ? "Yksinkertaisia mallintamistehtäviä" : difficulty === "keskitaso" ? "Monimutkaisempia mallintamistehtäviä" : "Haastavia mallintamistehtäviä useilla parametreilla"}`;

    case "maa5_unit_circle":
      return `TÄRKEÄÄ: Tämä aihe käsittelee trigonometrisia funktioita yksikköympyrän avulla.

ESIMERKKEJÄ tehtävistä:
- Sinin ja kosinin arvojen määrittäminen yksikköympyrästä
- Trigonometristen funktioiden jaksollisuuden käyttö
- Symmetrioiden hyödyntäminen: sin(-θ) = -sin(θ), cos(-θ) = cos(θ)
- Erikoisarvojen käyttö: sin(π/6) = 1/2, cos(π/4) = √2/2

Tehtävät voivat sisältää:
- Kulmien trigonometristen arvojen laskemista
- Jaksollisuuden hyödyntämistä laskuissa
- Symmetrioiden käyttöä
- Yksikköympyrän geometrista tulkintaa

Vaikeustaso ${difficulty}: ${difficulty === "helppo" ? "Peruskulmien trigonometriset arvot" : difficulty === "keskitaso" ? "Symmetrioiden ja jaksollisuuden käyttö" : "Monimutkaisia trigonometrisia laskuja"}`;

    case "maa5_trigonometric_equations":
      return `TÄRKEÄÄ: Tämä aihe käsittelee trigonometristen yhtälöiden ratkaisemista.

ESIMERKKEJÄ tehtävistä:
- sin(x) = 1/2 ratkaisu: x = π/6 + 2kπ tai x = 5π/6 + 2kπ
- cos(2x) = 0 ratkaisu: 2x = π/2 + kπ, x = π/4 + kπ/2
- sin(x) = sin(π/3) ratkaisu: x = π/3 + 2kπ tai x = 2π/3 + 2kπ
- Kaksoiskulmaformulat: sin(2x) = 2sin(x)cos(x)

Tehtävät voivat sisältää:
- Perustrigonometristen yhtälöiden ratkaisemista
- Kaksoiskulmaformuloiden käyttöä
- Jaksollisuuden huomioimista ratkaisuissa
- Monimutkaisia trigonometrisia yhtälöitä

Vaikeustaso ${difficulty}: ${difficulty === "helppo" ? "Yksinkertaisia trigonometrisia yhtälöitä" : difficulty === "keskitaso" ? "Kaksoiskulmaformuloiden käyttö" : "Monimutkaisia trigonometrisia yhtälöitä"}`;

    case "maa5_trigonometric_identities":
      return `TÄRKEÄÄ: Tämä aihe käsittelee trigonometristen identiteettien käyttöä.

ESIMERKKEJÄ tehtävistä:
- Pythagoraan identiteetti: sin²x + cos²x = 1
- Johdetut identiteetit: sin²x = 1 - cos²x, cos²x = 1 - sin²x
- Tangentin määritelmä: tan(x) = sin(x)/cos(x)
- Identiteettien käyttö lausekkeiden sieventämisessä

Tehtävät voivat sisältää:
- Identiteettien todistamista
- Lausekkeiden sieventämistä identiteettien avulla
- Trigonometristen funktioiden välisiä muunnoksia
- Monimutkaisia trigonometrisia lausekkeita

Vaikeustaso ${difficulty}: ${difficulty === "helppo" ? "Perusidentiteettien käyttö" : difficulty === "keskitaso" ? "Identiteettien johdannaiset" : "Monimutkaisia identiteettitehtäviä"}`;

    case "maa5_exponential_logarithmic":
      return `TÄRKEÄÄ: Tämä aihe käsittelee eksponentti- ja logaritmifunktioita.

ESIMERKKEJÄ tehtävistä:
- Eksponenttien laskusäännöt: a^m·a^n = a^(m+n)
- Logaritmien laskusäännöt: log_a(xy) = log_a(x) + log_a(y)
- Luonnollinen eksponenttifunktio: f(x) = e^x
- Logaritmifunktiot: y = log_a(x)

Tehtävät voivat sisältää:
- Eksponenttien ja logaritmien laskusääntöjen käyttöä
- Eksponentti- ja logaritmiyhtälöiden ratkaisemista
- Funktioiden kuvaajien piirtämistä
- Reaalimaailman sovelluksia

Vaikeustaso ${difficulty}: ${difficulty === "helppo" ? "Peruslaskusääntöjen käyttö" : difficulty === "keskitaso" ? "Yhtälöiden ratkaiseminen" : "Monimutkaisia eksponentti- ja logaritmitehtäviä"}`;

    case "maa5_software_applications":
      return `TÄRKEÄÄ: Tämä aihe käsittelee eksponentti- ja logaritmiyhtälöiden ratkaisemista.

ESIMERKKEJÄ tehtävistä:
- Eksponenttiyhtälöt: a^f(x) = a^g(x) ⇒ f(x) = g(x)
- Logaritmiyhtälöt: log_a(f(x)) = log_a(g(x)) ⇒ f(x) = g(x)
- Käänteisrelaatiot: a^log_a(x) = x, log_a(a^x) = x
- Luonnolliset logaritmit: ln(e^x) = x, e^ln(x) = x

Tehtävät voivat sisältää:
- Eksponenttiyhtälöiden ratkaisemista
- Logaritmiyhtälöiden ratkaisemista
- Käänteisrelaatioiden käyttöä
- Monimutkaisia yhtälöitä

Vaikeustaso ${difficulty}: ${difficulty === "helppo" ? "Yksinkertaisia eksponentti- ja logaritmiyhtälöitä" : difficulty === "keskitaso" ? "Käänteisrelaatioiden käyttö" : "Monimutkaisia yhtälöitä"}`;

    default:
      return `TÄRKEÄÄ: Luo tehtävä, joka liittyy suoraan aiheeseen ${sectionId}. Tehtävän tulee olla sopivaa vaikeustasoa (${difficulty}) ja sisältää riittävästi haastetta.`;
  }
} 