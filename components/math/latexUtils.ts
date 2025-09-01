export function generateId(): string {
	return Math.random().toString(36).slice(2, 9);
}

export function sanitizeLatex(input: string): string {
	const s = (input ?? "").trim();
	if ((s.startsWith("$$") && s.endsWith("$$")) || (s.startsWith("$ ") && s.endsWith(" $"))) {
		return s.replace(/^\${2}/, "").replace(/\${2}$/, "").trim();
	}
	if (s.startsWith("$") && s.endsWith("$")) {
		return s.slice(1, -1).trim();
	}
	return s;
}

export function convertAsteriskToCdot(input: string): string {
	// Convert * to \cdot for multiplication, but avoid converting in LaTeX commands
	return input.replace(/(?<!\\)\*/g, "\\cdot");
}

export function expandFractionShorthand(input: string): string {
	let out = (input ?? "");
	let prev = "";
	let guard = 0;
	
	// Handle nested fractions: (expr)/(expr), (expr)/token, token/(expr), token/token
	const rePP = /\(\s*([^()]+?)\s*\)\s*\/\s*\(\s*([^()]+?)\s*\)/g;
	const rePT = /\(\s*([^()]+?)\s*\)\s*\/\s*([A-Za-z0-9]+)/g;
	const reTP = /([A-Za-z0-9]+)\s*\/\s*\(\s*([^()]+?)\s*\)/g;
	const reTT = /([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)/g;
	
	while (out !== prev && guard++ < 10) {
		prev = out;
		out = out
			.replace(rePP, "\\frac{$1}{$2}")
			.replace(rePT, "\\frac{$1}{$2}")
			.replace(reTP, "\\frac{$1}{$2}")
			.replace(reTT, "\\frac{$1}{$2}");
	}
	
	return out;
}

export function expandExponentShorthand(input: string): string {
	let out = (input ?? "");
	
	// Handle parentheses exponents: a^(b) -> a^{b}
	out = out.replace(/([A-Za-z0-9\}\]])\s*\^\s*\(\s*([^()]+?)\s*\)/g, "$1^{ $2 }");
	
	// Handle parentheses base with exponent: (a)^b -> {a}^{b}
	out = out.replace(/\(\s*([^()]+?)\s*\)\s*\^\s*([A-Za-z0-9\{\(]+)/g, "{ $1 }^{ $2 }");
	
	// Handle simple exponents: a^b -> a^{b}
	out = out.replace(/([A-Za-z0-9])\s*\^\s*([A-Za-z0-9])/g, "$1^{ $2 }");
	
	// Handle chained exponents right-associatively: a^b^c -> a^{b^{c}}
	let prev = "";
	let guard = 0;
	while (out !== prev && guard++ < 10) {
		prev = out;
		// Find patterns like ^{a}^{b} and convert to ^{a^{b}}
		out = out.replace(/\^\s*\{([^{}]+)\}\s*\^\s*\{([^{}]+)\}/g, "^{ $1^{ $2 } }");
	}
	
	return out;
}

export function processLatexContent(content: string): string {
	return expandExponentShorthand(expandFractionShorthand(convertAsteriskToCdot(sanitizeLatex(content))));
}
