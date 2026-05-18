import { supabase } from "@/lib/supabase";
import type { Lead } from "@/types/global";
import { parseLeadValor } from "@/utils/currency";

export type MinhaVendaRow = Pick<Lead, "id" | "nome" | "telefone" | "data_venda" | "valor"> & {
  valorNumero: number;
};

export type MinhaOportunidadeRow = Pick<
  Lead,
  "id"
  | "nome"
  | "telefone"
  | "data_criacao"
  | "valor"
  | "id_departamento"
  | "insight"
  | "id_etiquetas"
> & {
  valorNumero: number;
  etiquetaOportunidade: boolean;
};

function parseIdsFromCsv(csv?: string | null): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function getAtendenteIdByEmail(idCliente: number, email: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("atendentes")
    .select("id")
    .eq("id_cliente", idCliente)
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

async function getOportunidadeEtiquetaIds(idCliente: number): Promise<string[]> {
  // Aceita etiqueta do cliente e etiquetas padrão (id_cliente null)
  const { data, error } = await supabase
    .from("etiquetas")
    .select("id, nome")
    .or(`id_cliente.eq.${idCliente},id_cliente.is.null`)
    .ilike("nome", "%oportunidade%");

  if (error) throw error;
  return (data || []).map((e) => String(e.id));
}

export const dashboardPersonalService = {
  async getMinhasVendas(params: {
    idCliente: number;
    email: string;
    from?: Date;
    to?: Date;
  }): Promise<{ rows: MinhaVendaRow[]; total: number }> {
    const atendenteId = await getAtendenteIdByEmail(params.idCliente, params.email);
    if (!atendenteId) return { rows: [], total: 0 };

    let query = supabase
      .from("leads")
      .select("id, nome, telefone, data_venda, valor, id_usuario_venda")
      .eq("id_cliente", params.idCliente)
      .eq("venda_realizada", true)
      .not("data_venda", "is", null)
      .eq("id_usuario_venda", atendenteId)
      .order("data_venda", { ascending: false });

    if (params.from) query = query.gte("data_venda", params.from.toISOString());
    if (params.to) query = query.lte("data_venda", params.to.toISOString());

    const { data, error } = await query;
    if (error) throw error;

    const rows: MinhaVendaRow[] = (data || []).map((l: any) => {
      const valorNumero = parseLeadValor(l.valor);
      return {
        id: l.id,
        nome: l.nome,
        telefone: l.telefone,
        data_venda: l.data_venda,
        valor: l.valor,
        valorNumero,
      };
    });

    const total = rows.reduce((sum, r) => sum + (Number.isFinite(r.valorNumero) ? r.valorNumero : 0), 0);
    return { rows, total };
  },

  async getMinhasOportunidades(params: {
    idCliente: number;
    allowedDepartments: number[]; // vazio = todos
  }): Promise<{
    rows: MinhaOportunidadeRow[];
    totalOportunidades: number;
    totalValor: number;
    insights: MinhaOportunidadeRow[];
  }> {
    const oportunidadeEtiquetaIds = await getOportunidadeEtiquetaIds(params.idCliente);
    if (oportunidadeEtiquetaIds.length === 0) {
      return { rows: [], totalOportunidades: 0, totalValor: 0, insights: [] };
    }

    let query = supabase
      .from("leads")
      .select("id, nome, telefone, data_criacao, valor, id_departamento, insight, id_etiquetas")
      .eq("id_cliente", params.idCliente)
      .not("id_etiquetas", "is", null)
      .neq("id_etiquetas", "")
      .order("data_criacao", { ascending: false });

    // Atendente: só vê departamentos permitidos; leads sem departamento continuam acessíveis (mesma regra do hook)
    if (params.allowedDepartments.length > 0) {
      query = query.or(
        `id_departamento.in.(${params.allowedDepartments.join(",")}),id_departamento.is.null`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    const rowsAll: MinhaOportunidadeRow[] = (data || []).map((l: any) => {
      const ids = parseIdsFromCsv(l.id_etiquetas);
      const etiquetaOportunidade = ids.some((id: string) => oportunidadeEtiquetaIds.includes(id));
      const valorNumero = parseLeadValor(l.valor);
      return {
        id: l.id,
        nome: l.nome,
        telefone: l.telefone,
        data_criacao: l.data_criacao,
        valor: l.valor,
        id_departamento: l.id_departamento,
        insight: l.insight,
        id_etiquetas: l.id_etiquetas,
        etiquetaOportunidade,
        valorNumero,
      };
    });

    const rows = rowsAll.filter((r) => r.etiquetaOportunidade);
    const totalValor = rows.reduce((sum, r) => sum + (Number.isFinite(r.valorNumero) ? r.valorNumero : 0), 0);
    const insights = rows.filter((r) => !!(r.insight && String(r.insight).trim().length > 0));

    return {
      rows,
      totalOportunidades: rows.length,
      totalValor,
      insights,
    };
  },
};

