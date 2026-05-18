import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { format, subDays, startOfDay, endOfDay, compareAsc } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar as CalendarIcon,
  Loader2,
  RefreshCw,
  Award,
  Users,
  DollarSign,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { LeadsService } from "@/services/leadsService";
import { atendentesService, Atendente } from "@/services/atendentesService";
import { clientesService, ClienteInfo } from "@/services/clientesService";
import { Lead } from "@/types/global";
import { formatLeadValor, parseLeadValor } from "@/utils/currency";

type VendorProfile = {
  key: string;
  name: string;
  email?: string | null;
  tipo?: string | null;
  userId?: string | null;
  isAdmin?: boolean;
  isFallback?: boolean;
};

type VendorStats = VendorProfile & {
  totalSales: number;
  totalValue: number;
  ticketMedio: number;
  avgScore: number | null;
  lastSale: string | null;
};

const DEFAULT_RANGE: DateRange = {
  from: subDays(new Date(), 29),
  to: new Date(),
};

const UNASSIGNED_KEY = "__sem_responsavel__";

/** Mapa de qualquer identificador (id, user_id_auth, email) para nome exibido... */
const buildKeyToNameMap = (
  cliente: ClienteInfo | null,
  atendentesList: Atendente[]
): Map<string, string> => {
  const map = new Map<string, string>();
  if (cliente) {
    if (cliente.id != null) map.set(String(cliente.id), cliente.name || "Administrador");
    if (cliente.user_id_auth) map.set(cliente.user_id_auth, cliente.name || "Administrador");
    if (cliente.email) map.set(cliente.email, cliente.name || "Administrador");
  }
  atendentesList.forEach((a) => {
    if (a.id != null) map.set(String(a.id), a.nome);
    if (a.user_id_auth) map.set(a.user_id_auth, a.nome);
    if (a.email) map.set(a.email, a.nome);
  });
  return map;
};

const VendorsReport: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE);
  const [pendingRange, setPendingRange] = useState<DateRange>(DEFAULT_RANGE);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [sales, setSales] = useState<Lead[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [clientInfo, setClientInfo] = useState<ClienteInfo | null>(null);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const ensureBaseVendors = useCallback(
    (cliente: ClienteInfo | null, atendentes: Atendente[]) => {
      const base: VendorProfile[] = [];

      if (cliente) {
        base.push({
          key: String(cliente.id),
          name: cliente.name || "Administrador",
          email: cliente.email,
          tipo: "Administrador",
          userId: cliente.user_id_auth || null,
          isAdmin: true,
        });
      }

      atendentes.forEach((atendente) => {
        base.push({
          key: atendente.user_id_auth || atendente.email || String(atendente.id),
          name: atendente.nome,
          email: atendente.email,
          tipo: atendente.tipo_usuario || "Atendente",
          userId: atendente.user_id_auth || null,
        });
      });

      base.push({
        key: UNASSIGNED_KEY,
        name: "Admin",
        email: null,
        tipo: "Administrador",
        isFallback: true,
      });

      setVendors(base);
    },
    []
  );

  const fetchVendors = useCallback(async () => {
    if (!user?.id_cliente) return;
    setLoadingVendors(true);

    try {
      const [cliente, atendentesList] = await Promise.all([
        clientesService.getClienteById(user.id_cliente),
        atendentesService.listByCliente(user.id_cliente),
      ]);

      setClientInfo(cliente);
      setAtendentes(atendentesList || []);
      ensureBaseVendors(cliente, atendentesList || []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível listar os vendedores cadastrados.",
        variant: "destructive",
      });
    } finally {
      setLoadingVendors(false);
    }
  }, [ensureBaseVendors, toast, user?.id_cliente]);

  const fetchSales = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;

    setLoadingSales(true);
    setError(null);

    try {
      const data = await LeadsService.getVendasPorPeriodo(
        startOfDay(dateRange.from),
        endOfDay(dateRange.to)
      );

      setSales(data);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar as vendas do período.");
      toast({
        title: "Erro ao carregar dados",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoadingSales(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const keyToName = useMemo(
    () => buildKeyToNameMap(clientInfo, atendentes),
    [clientInfo, atendentes]
  );

  const vendorStatsMap = useMemo(() => {
    const map = new Map<string, { totalValue: number; totalSales: number; totalScore: number; scoreCount: number; lastSale: string | null }>();

    sales.forEach((lead) => {
      const key =
        lead.id_usuario_venda === null || lead.id_usuario_venda === undefined
          ? UNASSIGNED_KEY
          : String(lead.id_usuario_venda);

      const current = map.get(key) || {
        totalValue: 0,
        totalSales: 0,
        totalScore: 0,
        scoreCount: 0,
        lastSale: null,
      };

      current.totalValue += parseLeadValor(lead.valor);
      current.totalSales += 1;

      if (typeof lead.score_final_vendedor === "number") {
        current.totalScore += lead.score_final_vendedor;
        current.scoreCount += 1;
      }

      if (lead.data_venda) {
        if (!current.lastSale || compareAsc(new Date(current.lastSale), new Date(lead.data_venda)) === -1) {
          current.lastSale = lead.data_venda;
        }
      }

      map.set(key, current);
    });

    return map;
  }, [sales]);

  const vendorRows: VendorStats[] = useMemo(() => {
    const rows: VendorStats[] = vendors.map((vendor) => {
      const stats = vendorStatsMap.get(vendor.key);
      const totalValue = stats?.totalValue ?? 0;
      const totalSales = stats?.totalSales ?? 0;
      const ticketMedio = totalSales > 0 ? totalValue / totalSales : 0;
      const avgScore =
        stats && stats.scoreCount > 0 ? stats.totalScore / stats.scoreCount : null;

      return {
        ...vendor,
        totalValue,
        totalSales,
        ticketMedio,
        avgScore,
        lastSale: stats?.lastSale ?? null,
      };
    });

    vendorStatsMap.forEach((stats, key) => {
      if (!rows.some((row) => row.key === key)) {
        const totalValue = stats.totalValue;
        const totalSales = stats.totalSales;
        const ticketMedio = totalSales > 0 ? totalValue / totalSales : 0;
        const avgScore =
          stats.scoreCount > 0 ? stats.totalScore / stats.scoreCount : null;
        const name =
          key === UNASSIGNED_KEY
            ? "Admin"
            : keyToName.get(key) ?? "Indefinido/Excluído";

        rows.push({
          key,
          name,
          email: null,
          tipo: key === UNASSIGNED_KEY ? "Administrador" : (name === "Indefinido/Excluído" ? "Indefinido/Excluído" : null),
          totalValue,
          totalSales,
          ticketMedio,
          avgScore,
          lastSale: stats.lastSale,
          isFallback: true,
        });
      }
    });

    return rows.sort((a, b) => b.totalValue - a.totalValue);
  }, [vendorStatsMap, vendors, keyToName]);

  /** Apenas vendedores que têm vendas atribuídas (para tabela e métricas) */
  const vendorRowsComVendas = useMemo(
    () => vendorRows.filter((row) => row.totalSales > 0),
    [vendorRows]
  );

  const topVendors = useMemo(
    () => vendorRowsComVendas.filter((row) => row.key !== UNASSIGNED_KEY).slice(0, 5),
    [vendorRowsComVendas]
  );

  // Calcular o valor máximo do eixo Y (arredondado para cima em múltiplos de 1000)
  const maxYValue = useMemo(() => {
    if (topVendors.length === 0) return 1000;
    const maxValue = Math.max(...topVendors.map((vendor) => vendor.totalValue));
    // Se o valor máximo for 0, retornar 1000 como padrão
    if (maxValue === 0) return 1000;
    // Arredondar para cima para o próximo múltiplo de 1000
    const rounded = Math.ceil(maxValue / 1000) * 1000;
    return rounded;
  }, [topVendors]);

  const totalValorPeriodo = useMemo(
    () => vendorRows.reduce((sum, row) => sum + row.totalValue, 0),
    [vendorRows]
  );

  const totalVendedoresComVenda = vendorRowsComVendas.filter((row) => row.key !== UNASSIGNED_KEY).length;

  const melhorVendedor = vendorRowsComVendas.find((row) => row.key !== UNASSIGNED_KEY && row.totalValue > 0);

  const formatDateRangeLabel = () => {
    if (!dateRange.from || !dateRange.to) {
      return "Selecione o período";
    }

    if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
      return format(dateRange.from, "dd MMM yyyy", { locale: ptBR });
    }

    return `${format(dateRange.from, "dd MMM", { locale: ptBR })} - ${format(dateRange.to, "dd MMM yyyy", {
      locale: ptBR,
    })}`;
  };

  const handleShortcutSelection = (shortcut: string) => {
    const now = new Date();
    let nextRange: DateRange;

    switch (shortcut) {
      case "today":
        nextRange = { from: now, to: now };
        break;
      case "yesterday": {
        const yesterday = subDays(now, 1);
        nextRange = { from: yesterday, to: yesterday };
        break;
      }
      case "last7days":
        nextRange = { from: subDays(now, 6), to: now };
        break;
      case "last30days":
      default:
        nextRange = { from: subDays(now, 29), to: now };
        break;
    }

    setPendingRange(nextRange);
  };

  const handleApplyDateFilter = () => {
    if (!pendingRange.from || !pendingRange.to) return;
    setDateRange(pendingRange);
    setDatePopoverOpen(false);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold text-primary-900">Relatório de Vendedores</h1>
            <p className="text-muted-foreground">
              Compare desempenho, ticket médio e score dos membros da equipe no período selecionado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {formatDateRangeLabel()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Atalhos rápidos</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleShortcutSelection("today")}>
                      Hoje
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleShortcutSelection("yesterday")}>
                      Ontem
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleShortcutSelection("last7days")}>
                      Últimos 7 dias
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleShortcutSelection("last30days")}>
                      Últimos 30 dias
                    </Button>
                  </div>
                </div>

                <CalendarComponent
                  locale={ptBR}
                  mode="range"
                  selected={pendingRange}
                  onSelect={(range) => range && setPendingRange(range)}
                  numberOfMonths={2}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />

                <div className="p-3 border-t">
                  <Button
                    className="w-full"
                    onClick={handleApplyDateFilter}
                    disabled={!pendingRange.from || !pendingRange.to}
                  >
                    Aplicar período
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              onClick={() => {
                fetchSales();
                fetchVendors();
              }}
              disabled={loadingSales || loadingVendors || !dateRange.from || !dateRange.to}
            >
              {loadingSales || loadingVendors ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Atualizar</span>
            </Button>
          </div>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor vendido no período</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatLeadValor(totalValorPeriodo)}</div>
              <p className="text-xs text-muted-foreground">
                Considerando todos os vendedores ({formatDateRangeLabel()})
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendedores com vendas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalVendedoresComVenda}</div>
              <p className="text-xs text-muted-foreground">
                Com vendas no período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Melhor desempenho</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {melhorVendedor ? melhorVendedor.name : "Sem vendas"}
              </div>
              <p className="text-xs text-muted-foreground">
                {melhorVendedor ? formatLeadValor(melhorVendedor.totalValue) : "Aguardando vendas"}
              </p>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Ranking por valor vendido</CardTitle>
            <CardDescription>Top vendedores do período selecionado.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[320px]">
            {topVendors.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Nenhum vendedor com vendas no período.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topVendors}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      domain={[0, maxYValue]}
                      ticks={[0, maxYValue]}
                      tickFormatter={(value) => {
                        // Mostrar apenas o valor máximo (no topo)
                        if (value === maxYValue) {
                          return formatLeadValor(value);
                        }
                        // Não mostrar o zero
                        return '';
                      }}
                      width={80}
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip formatter={(value) => formatLeadValor(Number(value))} />
                    <Bar dataKey="totalValue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendedores cadastrados</CardTitle>
            <CardDescription>
              Valores, quantidades e score médio por atendente/gestor no período filtrado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSales || loadingVendors ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : vendorRowsComVendas.length === 0 ? (
              <div className="rounded-md border border-dashed border-muted-foreground/30 p-8 text-center text-sm text-muted-foreground">
                Nenhum vendedor com vendas no período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Valor vendido</TableHead>
                      <TableHead className="text-right">Ticket médio</TableHead>
                      <TableHead className="text-right">Score médio</TableHead>
                      <TableHead>Última venda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorRowsComVendas.map((vendor) => (
                      <TableRow key={vendor.key}>
                        <TableCell className="space-y-1">
                          <div className="font-semibold">{vendor.name}</div>
                          {vendor.tipo && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Badge variant="secondary">{vendor.tipo}</Badge>
                              {vendor.email && <span>{vendor.email}</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{vendor.totalSales}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatLeadValor(vendor.totalValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {vendor.totalSales > 0 ? formatLeadValor(vendor.ticketMedio) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {vendor.avgScore !== null ? `${vendor.avgScore.toFixed(1)}/10` : "—"}
                        </TableCell>
                        <TableCell>
                          {vendor.lastSale
                            ? format(new Date(vendor.lastSale), "dd/MM/yyyy", { locale: ptBR })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorsReport;

