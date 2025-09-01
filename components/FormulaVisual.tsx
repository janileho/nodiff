"use client";

import 'katex/dist/katex.min.css';
import InlineMath from '@matejmazur/react-katex';

interface FormulaVisualProps {
  moduleId: string;
  sectionId?: string;
  compact?: boolean;
}

interface FormulaWithExplanation {
  formula: string;
  explanation: string;
}

export default function FormulaVisual({ moduleId, sectionId, compact = false }: FormulaVisualProps) {
  // Enhanced formula mappings with explanations for different modules and sections
  const getFormulasWithExplanations = (): FormulaWithExplanation[] => {
   	if (moduleId === "MAA5") {
      if (sectionId === "maa5_mathematical_modeling") {
        return [
          { formula: "y = A\\sin(B(x-C)) + D", explanation: "Yleinen sinifunktion muoto - A=amplitudi, B=2π/jakso, C=vaihesiirto, D=pystysuuntainen siirto" },
          { formula: "y = A\\cos(B(x-C)) + D", explanation: "Yleinen kosinifunktion muoto - A=amplitudi, B=2π/jakso, C=vaihesiirto, D=pystysuuntainen siirto" },
          { formula: "f(x) = a^x, a > 0, a \\neq 1", explanation: "Eksponenttifunktion määritelmä" },
          { formula: "f(x) = e^x", explanation: "Luonnollinen eksponenttifunktio" },
          { formula: "y = \\log_a(x) \\Leftrightarrow a^y = x", explanation: "Logaritmifunktion määritelmä" },
          { formula: "\\ln(x) = \\log_e(x)", explanation: "Luonnollinen logaritmi" },
          { formula: "\\log(x) = \\log_{10}(x)", explanation: "Kymmenkantainen logaritmi" }
        ];
      } else if (sectionId === "maa5_unit_circle") {
        return [
          { formula: "\\sin(\\theta) = y", explanation: "Sini yksikköympyrässä - y-koordinaatti pisteestä (x,y)" },
          { formula: "\\cos(\\theta) = x", explanation: "Kosini yksikköympyrässä - x-koordinaatti pisteestä (x,y)" },
          { formula: "\\sin(\\theta + 2\\pi) = \\sin(\\theta)", explanation: "Sinifunktion jaksollisuus" },
          { formula: "\\cos(\\theta + 2\\pi) = \\cos(\\theta)", explanation: "Kosinifunktion jaksollisuus" },
          { formula: "\\sin(-\\theta) = -\\sin(\\theta)", explanation: "Sinifunktion parittomuus" },
          { formula: "\\cos(-\\theta) = \\cos(\\theta)", explanation: "Kosinifunktion parillisuus" },
          { formula: "\\sin(\\pi - \\theta) = \\sin(\\theta)", explanation: "Sinifunktion symmetria" },
          { formula: "\\cos(\\pi - \\theta) = -\\cos(\\theta)", explanation: "Kosinifunktion symmetria" },
          { formula: "\\sin(0) = 0, \\sin(\\frac{\\pi}{6}) = \\frac{1}{2}, \\sin(\\frac{\\pi}{4}) = \\frac{\\sqrt{2}}{2}", explanation: "Sinifunktion erikoisarvoja" },
          { formula: "\\sin(\\frac{\\pi}{3}) = \\frac{\\sqrt{3}}{2}, \\sin(\\frac{\\pi}{2}) = 1", explanation: "Sinifunktion erikoisarvoja (jatko)" },
          { formula: "\\cos(0) = 1, \\cos(\\frac{\\pi}{6}) = \\frac{\\sqrt{3}}{2}, \\cos(\\frac{\\pi}{4}) = \\frac{\\sqrt{2}}{2}", explanation: "Kosinifunktion erikoisarvoja" },
          { formula: "\\cos(\\frac{\\pi}{3}) = \\frac{1}{2}, \\cos(\\frac{\\pi}{2}) = 0", explanation: "Kosinifunktion erikoisarvoja (jatko)" }
        ];
      } else if (sectionId === "maa5_trigonometric_equations") {
        return [
          { formula: "\\sin(x) = a \\Rightarrow x = \\arcsin(a) + 2k\\pi", explanation: "Sinifunktion yhtälön ratkaisu - ensimmäinen ratkaisu" },
          { formula: "\\sin(x) = a \\Rightarrow x = \\pi - \\arcsin(a) + 2k\\pi", explanation: "Sinifunktion yhtälön ratkaisu - toinen ratkaisu" },
          { formula: "\\cos(x) = a \\Rightarrow x = \\arccos(a) + 2k\\pi", explanation: "Kosinifunktion yhtälön ratkaisu - ensimmäinen ratkaisu" },
          { formula: "\\cos(x) = a \\Rightarrow x = -\\arccos(a) + 2k\\pi", explanation: "Kosinifunktion yhtälön ratkaisu - toinen ratkaisu" },
          { formula: "\\sin(f(x)) = \\sin(g(x)) \\Rightarrow f(x) = g(x) + 2k\\pi", explanation: "Sinifunktioiden yhtälö - ensimmäinen tapaus" },
          { formula: "\\sin(f(x)) = \\sin(g(x)) \\Rightarrow f(x) = \\pi - g(x) + 2k\\pi", explanation: "Sinifunktioiden yhtälö - toinen tapaus" },
          { formula: "\\sin(2x) = 2\\sin(x)\\cos(x)", explanation: "Kaksoiskulma sinille" },
          { formula: "\\cos(2x) = \\cos^2(x) - \\sin^2(x)", explanation: "Kaksoiskulma kosinille - ensimmäinen muoto" },
          { formula: "\\cos(2x) = 2\\cos^2(x) - 1", explanation: "Kaksoiskulma kosinille - toinen muoto" },
          { formula: "\\cos(2x) = 1 - 2\\sin^2(x)", explanation: "Kaksoiskulma kosinille - kolmas muoto" }
        ];
      } else if (sectionId === "maa5_trigonometric_identities") {
        return [
          { formula: "\\sin^2(x) + \\cos^2(x) = 1", explanation: "Pythagoraan identiteetti - perusta kaikille trigonometrisille identiteeteille" },
          { formula: "\\sin^2(x) = 1 - \\cos^2(x)", explanation: "Pythagoraan identiteetistä johdettu - sini neliö" },
          { formula: "\\cos^2(x) = 1 - \\sin^2(x)", explanation: "Pythagoraan identiteetistä johdettu - kosini neliö" },
          { formula: "\\tan(x) = \\frac{\\sin(x)}{\\cos(x)}", explanation: "Tangentin määritelmä sinin ja kosinin avulla" },
          { formula: "\\cot(x) = \\frac{\\cos(x)}{\\sin(x)}", explanation: "Kotangentin määritelmä kosinin ja sinin avulla" },
          { formula: "\\sec(x) = \\frac{1}{\\cos(x)}", explanation: "Sekantin määritelmä" },
          { formula: "\\csc(x) = \\frac{1}{\\sin(x)}", explanation: "Kosekantin määritelmä" }
        ];
      } else if (sectionId === "maa5_exponential_logarithmic") {
        return [
          { formula: "a^m \\cdot a^n = a^{m+n}", explanation: "Eksponenttien kertolasku - samankantaisten potenssien tulo" },
          { formula: "\\frac{a^m}{a^n} = a^{m-n}", explanation: "Eksponenttien jakolasku - samankantaisten potenssien osamäärä" },
          { formula: "(a^m)^n = a^{mn}", explanation: "Potenssin potenssi - eksponentit kerrotaan" },
          { formula: "a^{-n} = \\frac{1}{a^n}", explanation: "Negatiivinen eksponentti - käänteisluku" },
          { formula: "f'(x) = e^x", explanation: "Luonnollisen eksponenttifunktion derivaatta" },
          { formula: "\\log_a(xy) = \\log_a(x) + \\log_a(y)", explanation: "Logaritmien summa - tulon logaritmi" },
          { formula: "\\log_a(\\frac{x}{y}) = \\log_a(x) - \\log_a(y)", explanation: "Logaritmien erotus - osamäärän logaritmi" },
          { formula: "\\log_a(x^r) = r \\cdot \\log_a(x)", explanation: "Logaritmin potenssi - eksponentti voidaan ottaa eteen" },
          { formula: "\\log_a(1) = 0", explanation: "Ykkösen logaritmi on aina nolla" },
          { formula: "\\log_a(a) = 1", explanation: "Kantaluvun logaritmi on aina yksi" },
          { formula: "\\log_a(x) = \\frac{\\log_b(x)}{\\log_b(a)}", explanation: "Kantaluvun vaihto - uusi kantaluku b" },
          { formula: "a^{\\log_a(x)} = x", explanation: "Eksponentti ja logaritmi kumoavat toisensa" },
          { formula: "\\log_a(a^x) = x", explanation: "Logaritmi ja eksponentti kumoavat toisensa" }
        ];
      } else if (sectionId === "maa5_software_applications") {
        return [
          { formula: "a^{f(x)} = a^{g(x)} \\Rightarrow f(x) = g(x)", explanation: "Eksponenttiyhtälön ratkaisu - kun kantaluvut ovat samat" },
          { formula: "\\log_a(f(x)) = \\log_a(g(x)) \\Rightarrow f(x) = g(x)", explanation: "Logaritmiyhtälön ratkaisu - kun kantaluvut ovat samat" },
          { formula: "f(x) > 0, g(x) > 0", explanation: "Logaritmiyhtälöiden ratkaisussa funktioiden on oltava positiivisia" },
          { formula: "\\ln(e^x) = x", explanation: "Luonnollisen logaritmin ja eksponenttifunktion käänteisrelaatio" },
          { formula: "e^{\\ln(x)} = x", explanation: "Eksponenttifunktion ja luonnollisen logaritmin käänteisrelaatio" },
          { formula: "\\log(10^x) = x", explanation: "Kymmenkantaisen logaritmin ja eksponenttifunktion käänteisrelaatio" },
          { formula: "10^{\\log(x)} = x", explanation: "Eksponenttifunktion ja kymmenkantaisen logaritmin käänteisrelaatio" }
        ];
      } else {
       	// Default MAA5 formulas
        return [
          { formula: "\\sin^2(x) + \\cos^2(x) = 1", explanation: "Pythagoraan identiteetti" },
          { formula: "y = A\\sin(B(x-C)) + D", explanation: "Yleinen sinifunktion muoto" },
          { formula: "f(x) = a^x, a > 0", explanation: "Eksponenttifunktio" },
          { formula: "y = \\log_a(x)", explanation: "Logaritmifunktio" }
        ];
      }
    }
    
    // Default formulas for other modules
    return [{ formula: "f(x) = x", explanation: "Perusfunktio" }];
  };

  const formulasWithExplanations = getFormulasWithExplanations();

  if (compact) {
    return (
      <div className="mt-2">
        <InlineMath math={formulasWithExplanations[0].formula} />
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="text-sm font-medium text-gray-700 mb-1">Teoria:</div>
      <div className="space-y-1 max-w-md">
        {formulasWithExplanations.map((item, index) => (
          <div key={index} className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
            <div className="flex items-center gap-2">
              <InlineMath math={item.formula} />
              <span className="text-xs text-gray-500 flex-shrink-0">• {item.explanation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 