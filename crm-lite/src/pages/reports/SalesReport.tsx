import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { format, subDays, startOfDay, endOfDay, compareAsc, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
  Legend,
} from "recharts";
import {
  Calendar as CalendarIcon,
  Loader2,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Users,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LeadsService } from "@/services/leadsService";
import { Lead } from "@/types/global";
import { formatLeadValor, parseLeadValor } from "@/utils/currency";
import { useAuth } from "@/contexts/auth";

type VendorOption = {
  value: string;
  label: string;
  raw: string | number;
};

type ChartPoint = {
  dateKey: string;
  label: string;
  totalValue: number;
  totalCount: number;
  [key: string]: string | number; // Para permitir valores dinâmicos por vendedor
};

const DEFAULT_RANGE: DateRange = {
  from: subDays(new Date(), 29),
  to: new Date(),
};

const isNumericString = (value: string) => /^\d+$/.test(value);

const SalesReport: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE);
  const [pendingRange, setPendingRange] = useState<DateRange>(DEFAULT_RANGE);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [selectedVendorsForComparison, setSelectedVendorsForComparison] = useState<string[]>([]);

  const [sales, setSales] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Função simplificada para formatar o label do vendedor usando nome_vendedor
  const formatVendorLabel = useCallback(
    (lead: Lead): string => {
      if (lead.nome_vendedor) {
        return lead.nome_vendedor;
      }
      return "Sem responsável";
    },
    []
  );

  const mergeVendorOptions = useCallback(
    (leads: Lead[]) => {
      setVendorOptions((prev) => {
        const map = new Map(prev.map((option) => [option.value, option]));

        leads.forEach((lead) => {
          if (!lead.nome_vendedor) return;
          const value = lead.nome_vendedor;

          if (!map.has(value)) {
            map.set(value, {
              value,
              raw: lead.nome_vendedor,
              label: lead.nome_vendedor,
            });
          }
        });

        return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
      });
    },
    []
  );

  const parseVendorFilter = (value: string): string | null => {
    if (!value || value === "all") return null;
    return value; // Agora sempre retorna string (nome do vendedor)
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

  const fetchSales = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;

    setLoading(true);
    setError(null);

    try {
      const data = await LeadsService.getVendasPorPeriodo(
        startOfDay(dateRange.from),
        endOfDay(dateRange.to),
        parseVendorFilter(selectedVendor)
      );

      setSales(data);
      mergeVendorOptions(data);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar as vendas do período.");
      toast({
        title: "Erro ao carregar dados",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, mergeVendorOptions, selectedVendor, toast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const totalVendas = sales.length;
  const valorTotal = useMemo(
    () => sales.reduce((sum, lead) => sum + parseLeadValor(lead.valor), 0),
    [sales]
  );
  const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;

  const chartData: ChartPoint[] = useMemo(() => {
    // Se não há período selecionado, retornar array vazio
    if (!dateRange?.from || !dateRange?.to) {
      return [];
    }

    // Criar um mapa com todos os dias do período, inicializados com zero
    const allDaysMap = new Map<string, ChartPoint>();
    const startDate = startOfDay(dateRange.from);
    const endDate = endOfDay(dateRange.to);
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Inicializar os dados base
    allDays.forEach((day) => {
      const key = day.toISOString().slice(0, 10);
      const basePoint: ChartPoint = {
        dateKey: key,
        label: format(day, "dd/MM", { locale: ptBR }),
        totalValue: 0,
        totalCount: 0,
      };
      
      // Inicializar valores por vendedor selecionado
      selectedVendorsForComparison.forEach((vendorId) => {
        basePoint[`vendor_${vendorId}`] = 0;
      });
      
      allDaysMap.set(key, basePoint);
    });

    // Preencher com os dados reais de vendas
    sales.forEach((lead) => {
      if (!lead.data_venda) return;
      const dateObj = new Date(lead.data_venda);
      const key = dateObj.toISOString().slice(0, 10);
      const entry = allDaysMap.get(key);

      if (entry) {
        const valor = parseLeadValor(lead.valor);
        entry.totalValue += valor;
        entry.totalCount += 1;
        
        // Adicionar valor por vendedor se estiver selecionado para comparação
        if (lead.nome_vendedor) {
          const vendorName = lead.nome_vendedor;
          
          if (selectedVendorsForComparison.includes(vendorName)) {
            const vendorKey = `vendor_${vendorName}`;
            entry[vendorKey] = (entry[vendorKey] as number || 0) + valor;
          }
        }
      }
    });

    // Retornar ordenado por data
    return Array.from(allDaysMap.values()).sort((a, b) =>
      compareAsc(new Date(a.dateKey), new Date(b.dateKey))
    );
  }, [sales, dateRange, selectedVendorsForComparison]);

  // Calcular o valor máximo do eixo Y (arredondado para cima em múltiplos de 1000)
  const maxYValue = useMemo(() => {
    if (chartData.length === 0) return 1000;
    
    // Encontrar o valor máximo considerando totalValue e valores dos vendedores
    let maxValue = Math.max(...chartData.map((point) => point.totalValue));
    
    // Verificar também os valores dos vendedores selecionados
    selectedVendorsForComparison.forEach((vendorId) => {
      const vendorKey = `vendor_${vendorId}`;
      const vendorMax = Math.max(...chartData.map((point) => (point[vendorKey] as number) || 0));
      maxValue = Math.max(maxValue, vendorMax);
    });
    
    // Se o valor máximo for 0, retornar 1000 como padrão
    if (maxValue === 0) return 1000;
    // Arredondar para cima para o próximo múltiplo de 1000
    const rounded = Math.ceil(maxValue / 1000) * 1000;
    return rounded;
  }, [chartData, selectedVendorsForComparison]);

  const salesWithVendorLabel = useMemo(
    () =>
      sales.map((lead) => ({
        ...lead,
        vendedorLabel: formatVendorLabel(lead),
      })),
    [sales, formatVendorLabel]
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold text-primary-900">Relatório de Vendas</h1>
            <p className="text-muted-foreground">
              Analise todas as vendas confirmadas no período e acompanhe o desempenho da sua equipe.
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

            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Todos os vendedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vendedores</SelectItem>
                {vendorOptions.map((vendor) => (
                  <SelectItem key={vendor.value} value={vendor.value}>
                    {vendor.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={fetchSales} disabled={loading || !dateRange.from || !dateRange.to}>
              {loading ? (
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
              <CardTitle className="text-sm font-medium">Vendas no período</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalVendas}</div>
              <p className="text-xs text-muted-foreground">
                Registradas em {formatDateRangeLabel()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatLeadValor(valorTotal)}</div>
              <p className="text-xs text-muted-foreground">Somatório das vendas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket médio</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {totalVendas > 0 ? formatLeadValor(ticketMedio) : "R$ 0,00"}
              </div>
              <p className="text-xs text-muted-foreground">Valor médio por venda concluída</p>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Desempenho do período</CardTitle>
            <CardDescription>
              Evolução diária das vendas entre {formatDateRangeLabel()}.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[320px] space-y-4">
            {/* Seleção de vendedores para comparação */}
            {vendorOptions.length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <Label className="text-sm font-medium mb-3 block">Comparar vendedores no gráfico:</Label>
                <div className="flex flex-wrap gap-3">
                  {vendorOptions.map((vendor) => {
                    const isSelected = selectedVendorsForComparison.includes(vendor.value);
                    return (
                      <div key={vendor.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`vendor-${vendor.value}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedVendorsForComparison([...selectedVendorsForComparison, vendor.value]);
                            } else {
                              setSelectedVendorsForComparison(
                                selectedVendorsForComparison.filter((id) => id !== vendor.value)
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={`vendor-${vendor.value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {vendor.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {chartData.length === 0 ? (
              <div className="flex h-60 flex-col items-center justify-center text-center text-muted-foreground">
                <p className="text-sm">Não há vendas registradas no período selecionado.</p>
                <p className="text-xs">Ajuste os filtros para visualizar o desempenho.</p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
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
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "totalValue") return [formatLeadValor(Number(value)), "Valor vendido"];
                        if (name?.toString().startsWith("vendor_")) {
                          const vendorId = name.toString().replace("vendor_", "");
                          const vendor = vendorOptions.find((v) => v.value === vendorId);
                          return [formatLeadValor(Number(value)), vendor?.label || "Vendedor"];
                        }
                        return [value, "Vendas"];
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="totalCount"
                      fill="hsl(var(--primary))"
                      opacity={0.3}
                      name="Quantidade"
                    />
                    <Line
                      type="monotone"
                      dataKey="totalValue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Valor vendido"
                    />
                    {/* Linhas para cada vendedor selecionado */}
                    {selectedVendorsForComparison.map((vendorId, index) => {
                      const vendor = vendorOptions.find((v) => v.value === vendorId);
                      const colors = [
                        "#ef4444", // red-500
                        "#3b82f6", // blue-500
                        "#10b981", // green-500
                        "#f59e0b", // amber-500
                        "#8b5cf6", // violet-500
                        "#ec4899", // pink-500
                        "#06b6d4", // cyan-500
                        "#f97316", // orange-500
                      ];
                      const color = colors[index % colors.length];
                      return (
                        <Line
                          key={`vendor_${vendorId}`}
                          type="monotone"
                          dataKey={`vendor_${vendorId}`}
                          stroke={color}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 3 }}
                          name={vendor?.label || `Vendedor ${vendorId}`}
                        />
                      );
                    })}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de vendas</CardTitle>
            <CardDescription>
              Lista completa das vendas finalizadas no período filtrado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : salesWithVendorLabel.length === 0 ? (
              <div className="rounded-md border border-dashed border-muted-foreground/30 p-8 text-center text-sm text-muted-foreground">
                Nenhuma venda encontrada com os filtros atuais.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data da venda</TableHead>
                      <TableHead>Vendedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesWithVendorLabel.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div className="font-medium">{lead.nome || "Lead sem nome"}</div>
                          {lead.telefone && (
                            <p className="text-xs text-muted-foreground">{lead.telefone}</p>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatLeadValor(lead.valor)}
                        </TableCell>
                        <TableCell>
                          {lead.data_venda
                            ? format(new Date(lead.data_venda), "dd/MM/yyyy", { locale: ptBR })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.vendedorLabel}</Badge>
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

export default SalesReport;

