export const bankDisplayNameMap: Record<string, string> = {
  "Servicios Financieros y Administración de Créditos Comerciales S.A. (SAG)": "Líder BCI",
  "SMU Corp S.A.": "Unicard",
  Scotiabank: "Scotiabank",
  "Banco Consorcio": "Consorcio",
  "Banco del Estado de Chile": "Banco Estado",
  "Banco de Chile": "Banco de Chile",
  "Banco Bice": "Banco BICE",
  "Banco París": "Banco París",
  "CAT Administradora de Tarjetas": "Cencosud Scotiabank",
  "CAR S.A.": "Banco Ripley",
  BBVA: "BBVA",
  HSBC: "HSBC",
  "CMR Falabella S.A (SAG)": "CMR Falabella",
  BCI: "BCI",
  "Banco Itaú Chile": "Banco Itaú",
  "Banco Falabella": "Banco Falabella",
  "Banco Internacional": "Banco Internacional",
  "Banco Santander": "Banco Santander",
  "Banco Santander-Chile": "Banco Santander",
  "Banco Ripley": "Banco Ripley",
  "Banco de Credito e Inversiones": "BCI",
  "Consorcio Tarjetas de Crédito": "Tarjeta Consorcio",
  Coopeuch: "Coopeuch",
  "Banco Security": "Banco Security",
  Corpbanca: "Corpbanca",
  "Scotiabank Chile": "Scotiabank",
  "Tenpo Payments S.A. - Tarjeta Mastercard": "Tenpo",
};

const CORPORATE_BANK_COLORS: Record<string, string> = {
  "Líder BCI": "#0053E1",
  Unicard: "#683DF2",
  Scotiabank: "#EC111A",
  BBVA: "#EC111A",
  Consorcio: "#2F6D9B",
  "Tarjeta Consorcio": "#2F6D9B",
  "Banco Estado": "#FF7900",
  "Banco de Chile": "#3A7BFF",
  "Banco París": "#006DFF",
  "Cencosud Scotiabank": "#4B7A98",
  "Banco Ripley": "#523178",
  CMF_RIPLEY: "#523178",
  HSBC: "#DB0011",
  "CMR Falabella": "#3B9326",
  "Banco Falabella": "#3B9326",
  CMF_FALABELLA: "#3B9326",
  BCI: "#FFD200",
  "Banco Itaú": "#EC7000",
  Corpbanca: "#EC7000",
  "Banco Internacional": "#D90D39",
  "Banco Santander": "#EC0000",
  Coopeuch: "#F42534",
  "Banco Security": "#6A2E92",
  "Banco BICE": "#1976D2",
};

const FALABELLA_RAW_NAMES = new Set([
  "CMR Falabella S.A (SAG)",
  "Promotora CMR Falabella S.A. - Tarjeta CMR Falabella",
  "Promotora CMR Falabella S.A. - Tarjeta Mastercard",
  "Promotora CMR Falabella S.A. - Tarjeta Visa",
]);

const FALABELLA_CANONICAL_CODE = "CMF_FALABELLA";
const FALABELLA_DISPLAY_NAME = "CMR Falabella";
const RIPLEY_RAW_NAMES = new Set(["CAR S.A.", "Banco Ripley"]);
const RIPLEY_CANONICAL_CODE = "CMF_RIPLEY";
const RIPLEY_DISPLAY_NAME = "Banco Ripley";

export function getBankDisplayName(name: string): string {
  return bankDisplayNameMap[name] ?? name;
}

const TENPO_RAW_NAME = "Tenpo Payments S.A. - Tarjeta Mastercard";

export function isTenpoInstitution(name: string): boolean {
  return name === TENPO_RAW_NAME;
}

export function isFalabellaInstitution(name: string): boolean {
  return FALABELLA_RAW_NAMES.has(name);
}

export function getCanonicalInstitution(
  institutionName: string,
  institutionCode: string
): { institutionCode: string; institutionName: string } {
  if (isFalabellaInstitution(institutionName)) {
    return {
      institutionCode: FALABELLA_CANONICAL_CODE,
      institutionName: FALABELLA_DISPLAY_NAME,
    };
  }
  if (RIPLEY_RAW_NAMES.has(institutionName)) {
    return {
      institutionCode: RIPLEY_CANONICAL_CODE,
      institutionName: RIPLEY_DISPLAY_NAME,
    };
  }

  return {
    institutionCode,
    institutionName: getBankDisplayName(institutionName),
  };
}

export function isLikelyNonBankingInstitution(
  institutionName: string,
  institutionCode: string,
  sourceDatasetCode?: string
): boolean {
  if (sourceDatasetCode?.startsWith("bank_credit_card_ops_non_banking_")) {
    return true;
  }

  if (institutionCode === "MRC") {
    return true;
  }

  return institutionName.includes(" - Tarjeta ");
}

export function shouldIncludeInstitution(
  institutionName: string,
  institutionCode: string,
  sourceDatasetCode?: string
): boolean {
  if (isFalabellaInstitution(institutionName)) {
    return true;
  }

  const isNonBanking = isLikelyNonBankingInstitution(
    institutionName,
    institutionCode,
    sourceDatasetCode
  );
  return !isNonBanking || isTenpoInstitution(institutionName);
}

function getHashedBankColor(bankKey: string): string {
  let hash = 0;

  for (let index = 0; index < bankKey.length; index += 1) {
    hash = (hash * 31 + bankKey.charCodeAt(index)) >>> 0;
  }

  const hue = hash % 360;
  return `hsl(${hue} 72% 64%)`;
}

export function getBankColor(
  institutionCode: string,
  institutionName: string
): string {
  const canonicalInstitution = getCanonicalInstitution(
    institutionName,
    institutionCode
  );

  return (
    CORPORATE_BANK_COLORS[canonicalInstitution.institutionCode] ??
    CORPORATE_BANK_COLORS[canonicalInstitution.institutionName] ??
    CORPORATE_BANK_COLORS[institutionCode] ??
    CORPORATE_BANK_COLORS[getBankDisplayName(institutionName)] ??
    getHashedBankColor(institutionCode)
  );
}
