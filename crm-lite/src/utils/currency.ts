const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

/**
 * Converte o valor vindo do banco (string/number/null) para número.
 * Aceita formatos como "1.234,56", "1234.56" ou "R$ 1.234,56".
 */
export function parseLeadValor(valor?: string | number | null): number {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  if (!valor) {
    return 0;
  }

  const normalized = valor
    .toString()
    .trim()
    // Remove tudo que não for dígitos, vírgulas, pontos ou sinal
    .replace(/[^\d.,-]/g, "")
    // Remove separadores de milhar
    .replace(/\./g, "")
    // Troca vírgula decimal por ponto
    .replace(/,/g, ".");

  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatLeadValor(valor?: string | number | null): string {
  return BRL_FORMATTER.format(parseLeadValor(valor));
}

