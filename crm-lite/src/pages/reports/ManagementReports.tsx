import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, FileSpreadsheet, PieChart } from "lucide-react";

type ReportButtonProps = {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick?: () => void;
};

const ReportButton = ({ icon: Icon, label, description, onClick }: ReportButtonProps) => {
  return (
    <Card className="flex h-full flex-col shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <CardTitle className="text-lg font-semibold text-primary-900">{label}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="mt-auto pt-6">
        <Button className="w-full min-w-0" onClick={onClick} disabled={!onClick}>
          {onClick ? `Acessar ${label}` : "Em breve"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default function ManagementReports() {
  const navigate = useNavigate();

  const reports: ReportButtonProps[] = [
    {
      icon: TrendingUp,
      label: "Relatório de Vendas",
      description: "Acompanhe o desempenho de vendas por período, produto e equipe.",
      onClick: () => navigate("/relatorios-gerenciais/vendas"),
    },
    {
      icon: Users,
      label: "Relatório de Vendedores",
      description: "Analise metas, conversões e produtividade da equipe comercial.",
      onClick: () => navigate("/relatorios-gerenciais/vendedores"),
    },
    // {
    //   icon: FileSpreadsheet,
    //   label: "Relatório de Leads",
    //   description: "Monitore a entrada de leads, status do funil e taxa de conversão."
    // },
    // {
    //   icon: PieChart,
    //   label: "Relatório Geral",
    //   description: "Visão consolidada das principais métricas gerenciais do CRM."
    // }
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-primary-900">Relatórios Gerenciais</h1>
          <p className="text-muted-foreground">
            Escolha um relatório para visualizar indicadores detalhados e tomar decisões informadas.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 md:items-stretch">
          {reports.map((report) => (
            <ReportButton key={report.label} {...report} />
          ))}
        </section>
      </div>
    </div>
  );
}





