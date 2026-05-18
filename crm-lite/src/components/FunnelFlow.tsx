import React from 'react';
export type Stage = { name: string; value: number };

interface Props {
  stages: Stage[];
  height?: number;
}

export default function FunnelFlow({ stages, height = 320 }: Props) {
  const n = stages.length;
  if (n < 2) return null;

  // Total de leads em todas as etapas
  const totalLeads = stages[0].value || 1;

  const fractions = stages.map(stage => {
    const value = stage.value || 0;
    return totalLeads > 0 ? value / totalLeads : 0;
  });

  // Dimensões do SVG
  const VB_W = 100;
  const VB_H = 50;
  const segmentWidth = VB_W / n;

  // Calcula os percentuais para exibição
  const displayPercentages = fractions.map(fraction => `${(fraction * 100).toFixed(0)}%`);

  // Função para criar o path que representa o funil
  const createFunnelPath = () => {
    // Pontos superiores e inferiores do funil
    const topPoints = [];
    const bottomPoints = [];
    
    for (let i = 0; i < n; i++) {
      const x = i * segmentWidth;
      const fraction = fractions[i];
      
      // Altura do centro do funil
      const height = (1 - fraction) * (VB_H / 2);
      
      // Ponto superior
      topPoints.push([x, height]);
      
      // Ponto inferior
      bottomPoints.push([x, VB_H - height]);
    }
    
    // Adiciona o último ponto à direita
    topPoints.push([VB_W, topPoints[n-1][1]]);
    bottomPoints.push([VB_W, bottomPoints[n-1][1]]);
    
    // Constrói o path
    let path = `M${topPoints[0][0]},${topPoints[0][1]}`;
    
    // Adiciona pontos superiores usando curvas
    for (let i = 1; i < topPoints.length; i++) {
      const prev = topPoints[i-1];
      const curr = topPoints[i];
      
      // Pontos de controle para curva Bézier
      const cpx1 = prev[0] + (curr[0] - prev[0]) * 0.5;
      const cpy1 = prev[1];
      const cpx2 = prev[0] + (curr[0] - prev[0]) * 0.5;
      const cpy2 = curr[1];
      
      path += ` C${cpx1},${cpy1} ${cpx2},${cpy2} ${curr[0]},${curr[1]}`;
    }
    
    // Adiciona pontos inferiores em ordem reversa usando curvas
    for (let i = bottomPoints.length - 1; i >= 0; i--) {
      const curr = bottomPoints[i];
      
      if (i === bottomPoints.length - 1) {
        // Move para o primeiro ponto inferior
        path += ` L${curr[0]},${curr[1]}`;
      } else {
        const next = bottomPoints[i+1];
        
        // Pontos de controle para curva Bézier
        const cpx1 = next[0] - (next[0] - curr[0]) * 0.5;
        const cpy1 = next[1];
        const cpx2 = next[0] - (next[0] - curr[0]) * 0.5;
        const cpy2 = curr[1];
        
        path += ` C${cpx1},${cpy1} ${cpx2},${cpy2} ${curr[0]},${curr[1]}`;
      }
    }
    
    // Fecha o path
    path += " Z";
    
    return path;
  };

  // Calcula coordenadas para os rótulos de %
  const labelPositions = fractions.map((f, i) => {
    return {
      x: i * segmentWidth + segmentWidth / 2,
      y: VB_H / 2,
      value: f
    };
  });

  // Calcula coordenadas para as linhas divisórias
  const dividerPositions = fractions.slice(1).map((_, i) => {
    return {
      x: (i + 1) * segmentWidth,
      y1: 0,
      y2: VB_H
    };
  });

  return (
    <div
      style={{
        width: '100%',
        background: '#0e1a2b',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3 style={{ color: '#fff', fontSize: 14, margin: 0, marginBottom: 8 }}>
        Funil de Conversão no WhatsApp
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: height
      }}>
        <div style={{ position: 'relative', width: '100%', height: '85%' }}>
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#006AFF" />
                <stop offset="40%" stopColor="#8A3FFC" />
                <stop offset="100%" stopColor="#EC368D" />
              </linearGradient>
            </defs>

            {/* Corpo do funil como um único path */}
            <path d={createFunnelPath()} fill="url(#grad)" />

            {/* Linhas divisórias verticais */}
            {dividerPositions.map((pos, i) => (
              <line
                key={i}
                x1={pos.x}
                x2={pos.x}
                y1={0}
                y2={VB_H}
                stroke="#fff"
                strokeOpacity={0.08}
                strokeWidth={0.5}
              />
            ))}

            {/* Rótulos de porcentagem com formatação específica */}
            {labelPositions.map((pos, i) => (
              <text
                key={i}
                x={pos.x}
                y={pos.y}
                fill="#fff"
                fontWeight="bold"
                fontSize={2.65}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ 
                  fontFamily: "'Arial', sans-serif",
                  letterSpacing: "0.2px"
                }}
              >
                {displayPercentages[i]}
              </text>
            ))}
          </svg>
        </div>

        {/* Nomes e valores na parte inferior */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            gap: '8px',
            marginTop: 'auto',
            color: '#fff',
            fontSize: 12,
            textAlign: 'center',
            paddingTop: '12px',
          }}
        >
          {stages.map((s, index) => (
            <div key={s.name}>
              <div style={{ fontWeight: 500 }}>{s.name}</div>
              <div style={{ opacity: 0.6, fontWeight: 600 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 