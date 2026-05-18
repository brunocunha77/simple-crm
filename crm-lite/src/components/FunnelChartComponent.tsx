import React from 'react';

// ----------------------------------------------------
// Tipos
// ----------------------------------------------------
export type Stage = {
  /** Nome da etapa */
  name: string;
  /** Quantidade absoluta da etapa */
  value: number;
};

interface Props {
  /** Array de etapas, do topo para o fundo */
  stages: Stage[];
  /** Altura opcional (px). Default: 260 */
  height?: number;
}

// ----------------------------------------------------
// Componente
// ----------------------------------------------------
export default function FunnelChartComponent({ stages, height = 260 }: Props) {
  const total = stages[0]?.value || 1;
  const pct  = stages.map(s => +(s.value / total * 100).toFixed(1));

  /* dimensões virtuais do SVG -------------------------------------------- */
  const W = 100;                    // largura da viewBox
  const H = 100;                    // altura  "
  const rowH = H / stages.length;   // altura de cada faixa

  /* larguras (em %) de cada estágio — 100% → 0%   (esquerda p/ direita) */
  const widths = pct.map(p => {
    // Ajusta a largura para garantir que o funil seja mais suave
    const baseWidth = (p / 100) * W;
    // Adiciona um pequeno offset para evitar que o funil fique muito estreito
    return Math.max(baseWidth, 5);
  });

  /* pontos topo e base ---------------------------------------------------- */
  const topPts = widths.map((w, i) => [0, i * rowH, w]);     // [x0,y,width]
  const botPts = widths.map((w, i) => [0, (i + 1) * rowH, w]).reverse();

  /* -------- helper para curvas Bezier suaves (catmull‑rom aprox.) ------- */
  const curve = (p1: any[], p2: any[]) => {
    const mx = (p1[2] + p2[2]) / 2;     // média das larguras
    const c1 = `${mx} ${p1[1]}`;
    const c2 = `${mx} ${p2[1]}`;
    return `C ${c1} ${c2} ${p2[2]} ${p2[1]}`;
  };

  /* path topo */
  const topPath = topPts
    .map((p, i) =>
      i === 0
        ? `M ${p[2]} ${p[1]}`
        : curve(topPts[i - 1], p)
    )
    .join(' ');

  /* path base */
  const botPath = botPts
    .map((p, i) =>
      i === 0
        ? ''
        : curve(botPts[i - 1], p)
    )
    .join(' ');

  const d = `${topPath} ${botPath} Z`;   // shape completo

  return (
    <div className="w-full bg-[#0e1a2b] rounded-xl p-4">
      <h3 className="text-white text-sm font-semibold mb-3">
        Funil de Conversão (Meta Ads)
      </h3>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMid slice"     /* textos não esticam */
      >
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#007bff" />
            <stop offset="100%" stopColor="#d32f7f" />
          </linearGradient>
        </defs>

        {/* shape principal */}
        <path d={d} fill="url(#grad)" />

        {/* linhas divisórias */}
        {stages.slice(1).map((_, i) => (
          <line
            key={i}
            x1={widths[i]}
            x2={widths[i]}
            y1={0}
            y2={H}
            stroke="#fff"
            strokeOpacity={0.07}
            strokeWidth={0.6}
          />
        ))}

        {/* labels ‑% */}
        {pct.map((p, i) => {
          const x = widths[i] / 2;  // posição x centralizada no segmento
          const y = (i + 0.5) * rowH;   // posição y centralizada na faixa
          return (
            <text
              key={i}
              x={x}
              y={y}
              fill="#fff"
              fontWeight={600}
              fontSize="12"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {p}%
            </text>
          );
        })}
      </svg>

      {/* legenda inferior */}
      <div className="grid grid-cols-4 mt-4 text-xs text-white/80">
        {stages.map(({ name, value }) => (
          <div key={name} className="flex flex-col items-center">
            <span className="font-medium whitespace-nowrap">{name}</span>
            <span className="text-white/60 font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 