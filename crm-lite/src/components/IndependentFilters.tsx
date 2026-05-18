import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { Departamento } from '@/services/departamentosService';
import { Etiqueta } from '@/services/etiquetasService';

interface IndependentFiltersProps {
  // Estados dos filtros
  selectedDepartamento: string;
  selectedEtiqueta: string;
  statusFilter: 'em_andamento' | 'encerrada';
  search: string;
  
  // Setters dos filtros
  setSelectedDepartamento: (value: string) => void;
  setSelectedEtiqueta: (value: string) => void;
  setStatusFilter: React.Dispatch<React.SetStateAction<'em_andamento' | 'encerrada'>>;
  setSearch: (value: string) => void;
  
  // Dados para os filtros
  departamentos: Departamento[];
  etiquetas: Etiqueta[];
  
  // Permissões
  isAtendente: boolean;
  userTypeInfo?: { id_departamento?: number };
  
  // Estados de loading
  loadingEtiquetas: boolean;
}

export default function IndependentFilters({
  selectedDepartamento,
  selectedEtiqueta,
  statusFilter,
  search,
  setSelectedDepartamento,
  setSelectedEtiqueta,
  setStatusFilter,
  setSearch,
  departamentos,
  etiquetas,
  isAtendente,
  userTypeInfo,
  loadingEtiquetas
}: IndependentFiltersProps) {
  
  // Verificar se há filtros ativos (exceto busca)
  const hasActiveFilters = () => {
    return selectedDepartamento !== 'all' || 
           selectedEtiqueta !== 'all' || 
           statusFilter !== 'em_andamento' ||
           search.trim() !== '';
  };

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setSelectedDepartamento('all');
    setSelectedEtiqueta('all');
    setStatusFilter('em_andamento');
    setSearch('');
  };

  // Função para limpar apenas filtros de departamento e etiqueta
  const clearDepartmentAndTagFilters = () => {
    setSelectedDepartamento('all');
    setSelectedEtiqueta('all');
  };

  return (
    <div className="space-y-3">
      {/* Campo de busca */}
      <div className="relative">
        <input
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar contatos por nome ou número..."
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <svg 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filtro de Departamento */}
      <div>
        <Select
          value={selectedDepartamento || ''}
          onValueChange={setSelectedDepartamento}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filtrar por departamento" />
          </SelectTrigger>
          <SelectContent>
            {!isAtendente && (
              <SelectItem key="all" value="all">Todos os departamentos</SelectItem>
            )}
            {!isAtendente && (
              <SelectItem key="no-dept" value="0">Sem Departamento</SelectItem>
            )}
            {isAtendente && !userTypeInfo?.id_departamento && (
              <SelectItem key="no-dept-atendente" value="0">Sem Departamento</SelectItem>
            )}
            {departamentos.map((dep) => (
              <SelectItem key={dep.id.toString()} value={dep.id.toString()}>
                {dep.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Filtro de Etiquetas */}
      <div>
        <Select
          value={selectedEtiqueta || ''}
          onValueChange={setSelectedEtiqueta}
          disabled={loadingEtiquetas}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loadingEtiquetas ? "Carregando etiquetas..." : "Filtrar por etiqueta"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="all-etiquetas" value="all">Todas as etiquetas</SelectItem>
            {etiquetas.map((etiqueta) => (
              <SelectItem key={etiqueta.id} value={etiqueta.id.toString()}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: etiqueta.cor }}
                  />
                  {etiqueta.nome}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtros de Status */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === 'em_andamento' ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setStatusFilter('em_andamento')}
        >
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Em andamento
        </Button>
        <Button
          variant={statusFilter === 'encerrada' ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setStatusFilter('encerrada')}
        >
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
          </svg>
          Encerradas
        </Button>
      </div>
        
      {/* Botões de limpeza */}
      {hasActiveFilters() && (
        <div className="space-y-2">
          {/* Botão para limpar filtros de departamento e etiqueta - sempre visível */}
          {(selectedDepartamento !== 'all' || selectedEtiqueta !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={clearDepartmentAndTagFilters}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Limpar filtros de departamento e etiqueta
            </Button>
          )}
          
          {/* Botão para limpar todos os filtros - APENAS para Admin/Gestor */}
          {!isAtendente && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={clearAllFilters}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Limpar todos os filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
