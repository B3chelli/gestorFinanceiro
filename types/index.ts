// types/index.ts

export type Categoria = {
  id: string;
  nome: string;
  cor: string;
};

export type Transacao = {
  id: string;
  descricao: string;
  valor: number;
  isReceita: boolean;
  categoriaId: string;
  eventoId?: string;
};

export type Evento = {
  id: string;
  nome: string;
};

export type Meta = {
  categoriaId: string;
  valorLimite: number;
};

export type PerfilFinanceiro = {
  nome: string;
  respostas: Record<string, string>;
  concluido: boolean;
};

export type Objetivo = {
  id: string;
  nome: string;
  valorAlvo: number;
  valorGuardado: number;
  cor: string;
};

export type FiltroOrdenacao = "data_desc" | "data_asc" | "valor_desc" | "valor_asc";

export type Aba = "lancamentos" | "dashboard" | "relatorios" | "metas";