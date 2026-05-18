import { useEffect } from 'react';
import { useTema } from '@/hooks/useTema';

/**
 * Componente para aplicar estilos CSS dinâmicos baseados no tema
 * Este componente deve ser usado no AppLayout após o login
 */
export const TemaProvider = () => {
  const { temaAplicado, hasTemaPersonalizado } = useTema();

  useEffect(() => {
    if (hasTemaPersonalizado && temaAplicado) {
      // Criar ou atualizar estilos CSS dinâmicos
      const styleId = 'tema-personalizado-styles';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;

      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }

      // CSS personalizado baseado no tema
      const css = `
        /* Tema Personalizado - White Label */
        .tema-personalizado {
          --primary-color: ${temaAplicado.corPrimaria};
          --secondary-color: ${temaAplicado.corSecundaria};
          --text-color: ${temaAplicado.corTexto};
          --font-family: ${temaAplicado.fonte};
          ${temaAplicado.corBotao ? `--button-color: ${temaAplicado.corBotao};` : ''}
          ${temaAplicado.corBotaoSelecionado ? `--button-selected-color: ${temaAplicado.corBotaoSelecionado};` : ''}
          ${temaAplicado.corBotaoAoPassar ? `--button-hover-color: ${temaAplicado.corBotaoAoPassar};` : ''}
        }

        /* Aplicar cor primária como background de toda a página */
        .tema-personalizado {
          background-color: var(--primary-color) !important;
        }

        /* Background principal da aplicação */
        .tema-personalizado .bg-white,
        .tema-personalizado .bg-gray-50,
        .tema-personalizado .bg-gray-100,
        .tema-personalizado main,
        .tema-personalizado .main-content {
          background-color: var(--primary-color) !important;
        }

        .tema-personalizado .bg-primary,
        .tema-personalizado .bg-blue-600,
        .tema-personalizado .bg-blue-500 {
          background-color: var(--primary-color) !important;
        }

        /* Aplicar cor secundária em elementos secundários */
        .tema-personalizado .bg-secondary,
        .tema-personalizado .bg-gray-100,
        .tema-personalizado .bg-gray-50 {
          background-color: var(--secondary-color) !important;
        }

        /* Aplicar cor de texto */
        .tema-personalizado .text-primary,
        .tema-personalizado .text-gray-900,
        .tema-personalizado .text-gray-800 {
          color: var(--text-color) !important;
        }

        /* Botões primários */
        .tema-personalizado .bg-primary,
        .tema-personalizado button[class*="bg-blue"],
        .tema-personalizado .btn-primary {
          background-color: var(--primary-color) !important;
          border-color: var(--primary-color) !important;
        }

        /* Botões secundários */
        .tema-personalizado .bg-secondary,
        .tema-personalizado button[class*="bg-gray"],
        .tema-personalizado .btn-secondary {
          background-color: var(--secondary-color) !important;
          border-color: var(--secondary-color) !important;
        }

        /* Hover states - aplicar cor personalizada de hover */
        ${temaAplicado.corBotaoAoPassar ? `
        .tema-personalizado button:hover,
        .tema-personalizado a:hover,
        .tema-personalizado .bg-primary:hover,
        .tema-personalizado button[class*="bg-blue"]:hover,
        .tema-personalizado [role="button"]:hover {
          background-color: ${temaAplicado.corBotaoAoPassar} !important;
        }
        ` : `
        .tema-personalizado .bg-primary:hover,
        .tema-personalizado button[class*="bg-blue"]:hover {
          background-color: var(--secondary-color) !important;
          opacity: 0.9;
        }
        `}

        /* Botões selecionados/ativos - aplicar cor personalizada de seleção */
        ${temaAplicado.corBotaoSelecionado ? `
        .tema-personalizado button.active,
        .tema-personalizado button[aria-selected="true"],
        .tema-personalizado .active,
        .tema-personalizado [data-state="active"],
        .tema-personalizado nav a.active,
        .tema-personalizado [aria-current="page"] {
          background-color: ${temaAplicado.corBotaoSelecionado} !important;
        }
        ` : ''}

        /* ========================================
           ESTILOS APENAS PARA BOTÕES (sem afetar layout)
           ======================================== */
        

        /* Cor padrão dos botões (estado normal) - não afeta botões brancos, botão Sair, selects, lista de contatos, nem mensagens do chat */
        ${temaAplicado.corBotao ? `
        .tema-botoes-personalizados button:not(.bg-white):not([class*="white"]):not([class*="red"]):not([role="combobox"]):not(.max-w-\\[400px\\]):not(.space-x-4),
        .tema-botoes-personalizados .btn:not(.bg-white):not([class*="white"]):not([class*="red"]):not([role="combobox"]):not(.max-w-\\[400px\\]):not(.space-x-4),
        .tema-botoes-personalizados [role="button"]:not(.bg-white):not([class*="white"]):not([class*="red"]):not([role="combobox"]):not(.max-w-\\[400px\\]):not(.space-x-4),
        .tema-botoes-personalizados button[class*="bg-blue"]:not([role="combobox"]):not(.max-w-\\[400px\\]):not(.space-x-4),
        .tema-botoes-personalizados button[class*="bg-primary"]:not([role="combobox"]):not(.max-w-\\[400px\\]):not(.space-x-4),
        .tema-botoes-personalizados .bg-primary:not(.contacts-list):not([class*="contact"]):not([role="combobox"]):not(.max-w-\\[400px\\]):not(.space-x-4),
        .tema-botoes-personalizados .bg-blue-500:not(.text-white):not([role="combobox"]):not(.max-w-\\[400px\\]):not(.space-x-4),
        .tema-botoes-personalizados .bg-blue-600:not([role="combobox"]):not(.max-w-\\[400px\\]):not(.space-x-4) {
          background-color: ${temaAplicado.corBotao} !important;
          border-color: ${temaAplicado.corBotao} !important;
        }

        /* Lista de contatos deve ser branca/transparente */
        .tema-botoes-personalizados .contacts-list,
        .tema-botoes-personalizados [class*="contact-list"],
        .tema-botoes-personalizados [class*="contacts"],
        .tema-botoes-personalizados .bg-white,
        .tema-botoes-personalizados .bg-gray-50 {
          background-color: white !important;
        }

        /* Botões individuais da lista de contatos - manter fundo branco */
        .tema-botoes-personalizados .max-w-full.overflow-x-hidden,
        .tema-botoes-personalizados .max-w-full.overflow-x-hidden button,
        .tema-botoes-personalizados button.w-full.max-w-\\[400px\\],
        .tema-botoes-personalizados button.flex.items-center.space-x-4 {
          background-color: white !important;
        }

        /* Hover dos botões da lista de contatos - cinza claro (não cor do botão) */
        .tema-botoes-personalizados button.w-full.max-w-\\[400px\\]:hover,
        .tema-botoes-personalizados button.flex.items-center.space-x-4:hover {
          background-color: #f3f4f6 !important;
        }

        /* Botões de departamentos e etiquetas - cor do botão no estado normal */
        .tema-botoes-personalizados button.bg-yellow-500,
        .tema-botoes-personalizados button[class*="bg-yellow"] {
          background-color: ${temaAplicado.corBotao} !important;
          color: white !important;
          border-color: ${temaAplicado.corBotao} !important;
        }

        /* Botões de departamentos e etiquetas - escurecer no hover */
        .tema-botoes-personalizados button.bg-yellow-500:hover,
        .tema-botoes-personalizados button[class*="bg-yellow"]:hover {
          opacity: 0.9;
        }

        /* Selects (combobox) - manter fundo branco original */
        .tema-botoes-personalizados select,
        .tema-botoes-personalizados button[role="combobox"] {
          background-color: white !important;
        }

        /* Checkboxes e inputs de seleção - usar cor do botão */
        .tema-botoes-personalizados input[type="checkbox"]:checked,
        .tema-botoes-personalizados input[type="radio"]:checked,
        .tema-botoes-personalizados [role="checkbox"][aria-checked="true"],
        .tema-botoes-personalizados .checkbox-checked {
          background-color: ${temaAplicado.corBotao} !important;
          border-color: ${temaAplicado.corBotao} !important;
        }

        /* Barra de progresso do tutorial - usar cor do botão (substituir roxo) */
        .tema-botoes-personalizados .bg-gradient-to-r.from-purple-500,
        .tema-botoes-personalizados .bg-gradient-to-r.to-purple-600,
        .tema-botoes-personalizados [class*="from-purple"],
        .tema-botoes-personalizados [class*="to-purple"] {
          background: ${temaAplicado.corBotao} !important;
          background-image: none !important;
        }

        /* Bolinhas dos checks do Tutorial - usar cor do botão */
        .tema-botoes-personalizados .bg-purple-500.text-white,
        .tema-botoes-personalizados div.bg-purple-500.rounded-full,
        .tema-botoes-personalizados [class*="rounded-full"].bg-purple-500 {
          background-color: ${temaAplicado.corBotao} !important;
        }

        /* Ícone CheckCircle dentro da bolinha - forçar branco */
        .tema-botoes-personalizados .bg-purple-500 svg.lucide-check-circle,
        .tema-botoes-personalizados div.bg-purple-500.rounded-full svg {
          color: white !important;
          fill: currentColor !important;
          stroke: white !important;
        }

        /* Cards das fases do tutorial - fundo branco */
        .tema-botoes-personalizados .bg-purple-50,
        .tema-botoes-personalizados [class*="bg-purple-50"] {
          background-color: white !important;
        }

        /* Bordas dos cards completados */
        .tema-botoes-personalizados .border-purple-200 {
          border-color: ${temaAplicado.corBotao} !important;
        }

        /* Botão "Começar a Usar" e "Continuar Configuração" */
        .tema-botoes-personalizados button.bg-purple-500,
        .tema-botoes-personalizados button[class*="bg-purple"] {
          background-color: ${temaAplicado.corBotao} !important;
          border-color: ${temaAplicado.corBotao} !important;
        }

        .tema-botoes-personalizados button.bg-purple-500:hover,
        .tema-botoes-personalizados button[class*="bg-purple"]:hover {
          opacity: 0.9;
        }

        /* Bolinha de notificação de mensagens novas - apenas cor */
        .tema-botoes-personalizados .bg-primary-600,
        .tema-botoes-personalizados .notification-badge,
        .tema-botoes-personalizados .badge-notification,
        .tema-botoes-personalizados [class*="notification"],
        .tema-botoes-personalizados .unread-count,
        .tema-botoes-personalizados .message-badge,
        .tema-botoes-personalizados span.bg-primary-600.text-white.rounded-full {
          background-color: ${temaAplicado.corBotao} !important;
        }

        /* Manter ícone e texto branco dentro da bolinha de notificação */
        .tema-botoes-personalizados .bg-primary-600 svg,
        .tema-botoes-personalizados span.bg-primary-600 svg {
          color: white !important;
          fill: white !important;
        }

        /* Badges/Tags roxos - usar cor do botão */
        .tema-botoes-personalizados .bg-purple-100,
        .tema-botoes-personalizados span.bg-purple-100 {
          background-color: ${temaAplicado.corBotao} !important;
        }

        /* Texto dos badges roxos - manter branco para legibilidade */
        .tema-botoes-personalizados .bg-purple-100,
        .tema-botoes-personalizados span.bg-purple-100 {
          color: white !important;
        }
        ` : ''}
        
        /* Hover em botões - apenas cores de botão personalizadas */
        ${temaAplicado.corBotaoAoPassar ? `
        .tema-botoes-personalizados button:hover,
        .tema-botoes-personalizados a[role="button"]:hover,
        .tema-botoes-personalizados [role="button"]:hover,
        .tema-botoes-personalizados .btn:hover,
        .tema-botoes-personalizados button[type="button"]:hover,
        .tema-botoes-personalizados button[type="submit"]:hover,
        .tema-botoes-personalizados nav a:hover,
        .tema-botoes-personalizados .nav-link:hover,
        .tema-botoes-personalizados [class*="sidebar"] a:hover,
        .tema-botoes-personalizados aside a:hover {
          background-color: ${temaAplicado.corBotaoAoPassar} !important;
        }
        ` : ''}

        /* Botões selecionados/ativos - apenas cores de botão personalizadas */
        ${temaAplicado.corBotaoSelecionado ? `
        .tema-botoes-personalizados button.active,
        .tema-botoes-personalizados button[aria-selected="true"],
        .tema-botoes-personalizados button[data-state="active"],
        .tema-botoes-personalizados nav a.active,
        .tema-botoes-personalizados [aria-current="page"],
        .tema-botoes-personalizados .nav-link.active,
        .tema-botoes-personalizados a.active,
        .tema-botoes-personalizados [class*="sidebar"] a.active,
        .tema-botoes-personalizados aside a.active {
          background-color: ${temaAplicado.corBotaoSelecionado} !important;
        }
        ` : ''}

        /* Sidebar */
        .tema-personalizado .sidebar,
        .tema-personalizado [class*="sidebar"] {
          background-color: var(--primary-color) !important;
        }

        /* Cards */
        .tema-personalizado .card,
        .tema-personalizado [class*="card"] {
          border-color: var(--secondary-color) !important;
        }

        /* Headers */
        .tema-personalizado .header,
        .tema-personalizado [class*="header"] {
          background-color: var(--primary-color) !important;
        }

        /* Links */
        .tema-personalizado a {
          color: var(--text-color) !important;
        }

        .tema-personalizado a:hover {
          color: var(--secondary-color) !important;
        }

        /* Inputs */
        .tema-personalizado input:focus,
        .tema-personalizado textarea:focus,
        .tema-personalizado select:focus {
          border-color: var(--primary-color) !important;
          box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2) !important;
        }

        /* Badges */
        .tema-personalizado .badge,
        .tema-personalizado [class*="badge"] {
          background-color: var(--secondary-color) !important;
          color: var(--text-color) !important;
        }

        /* Progress bars */
        .tema-personalizado .progress,
        .tema-personalizado [class*="progress"] {
          background-color: var(--primary-color) !important;
        }

        /* Tabs */
        .tema-personalizado .tab-active,
        .tema-personalizado [class*="tab-active"] {
          background-color: var(--primary-color) !important;
          color: var(--text-color) !important;
        }

        /* Dropdowns */
        .tema-personalizado .dropdown-menu {
          border-color: var(--secondary-color) !important;
        }

        /* Modals */
        .tema-personalizado .modal-header {
          background-color: var(--primary-color) !important;
        }

        /* Tables */
        .tema-personalizado .table-header,
        .tema-personalizado thead {
          background-color: var(--secondary-color) !important;
        }

        /* Background específico para páginas e componentes */
        .tema-personalizado .page,
        .tema-personalizado .dashboard,
        .tema-personalizado .conversations,
        .tema-personalizado .reports,
        .tema-personalizado .settings {
          background-color: var(--primary-color) !important;
        }

        /* Cards e containers mantêm cor secundária para contraste */
        .tema-personalizado .card,
        .tema-personalizado [class*="card"],
        .tema-personalizado .container,
        .tema-personalizado .content {
          background-color: var(--secondary-color) !important;
          color: var(--text-color) !important;
        }

        /* Ensure text is always readable */
        .tema-personalizado * {
          font-family: var(--font-family) !important;
        }

        /* Override any conflicting styles */
        .tema-personalizado .text-white {
          color: var(--text-color) !important;
        }

        .tema-personalizado .text-black {
          color: var(--text-color) !important;
        }

        /* Garantir que o background seja aplicado em toda a viewport */
        .tema-personalizado html,
        .tema-personalizado body {
          background-color: var(--primary-color) !important;
        }
      `;

      styleElement.textContent = css;
      void 0;
    } else {
      // Remover estilos personalizados se não há tema
      const styleElement = document.getElementById('tema-personalizado-styles');
      if (styleElement) {
        styleElement.remove();
        void 0;
      }
    }
  }, [temaAplicado, hasTemaPersonalizado]);

  // Este componente não renderiza nada, apenas aplica estilos
  return null;
};
