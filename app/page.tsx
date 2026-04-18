"use client";

import { useState, useEffect, useRef } from "react";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Categoria = {
  id: string;
  nome: string;
  cor: string;
};

type Transacao = {
  id: string;
  descricao: string;
  valor: number;
  isReceita: boolean;
  categoriaId: string;
  eventoId?: string;
};

type Evento = {
  id: string;
  nome: string;
};

type FiltroOrdenacao = "data_desc" | "data_asc" | "valor_desc" | "valor_asc";

type Aba = "lancamentos" | "dashboard" | "relatorios" | "metas";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS_PADRAO: Categoria[] = [
  { id: "custo-fixo",      nome: "Custo Fixo",        cor: "#BB86FC" },
  { id: "lazer",           nome: "Lazer",              cor: "#FFC107" },
  { id: "final-semana",    nome: "Final de Semana",    cor: "#FF7043" },
  { id: "trabalho",        nome: "Trabalho",           cor: "#4FC3F7" },
  { id: "alimentacao",     nome: "Alimentação",        cor: "#81C784" },
  { id: "transporte",      nome: "Transporte",         cor: "#FFD54F" },
  { id: "imprevisto",      nome: "Imprevisto",         cor: "#E57373" },
  { id: "receita",         nome: "Receita",            cor: "#4ade80" },
];

const OPCOES_TEMA = [
  { id: "dark",     nome: "Dark Elegante" },
  { id: "cyber",    nome: "Cyber Noturno" },
  { id: "classico", nome: "Clássico Financeiro" },
  { id: "fintech",  nome: "Fintech Moderna" },
];

const OPCOES_FILTRO: { id: FiltroOrdenacao; nome: string }[] = [
  { id: "data_desc",  nome: "Recentes" },
  { id: "data_asc",   nome: "Antigos" },
  { id: "valor_desc", nome: "Maior Valor" },
  { id: "valor_asc",  nome: "Menor Valor" },
];

const CORES_DISPONIVEIS = [
  "#BB86FC", "#FFC107", "#FF7043", "#4FC3F7",
  "#81C784", "#FFD54F", "#E57373", "#4ade80",
  "#F06292", "#64B5F6", "#A5D6A7", "#CE93D8",
];

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function FinanceiroBechelli() {

  // ─── Estados ───────────────────────────────────────────────────────────────

  const [transacoes,       setTransacoes]       = useState<Transacao[]>([]);
  const [categorias,       setCategorias]       = useState<Categoria[]>(CATEGORIAS_PADRAO);
  const [descricao,        setDescricao]        = useState("");
  const [valor,            setValor]            = useState("");
  const [isReceita,        setIsReceita]        = useState(false);
  const [categoriaId,      setCategoriaId]      = useState(CATEGORIAS_PADRAO[0].id);
  const [criterio,         setCriterio]         = useState<FiltroOrdenacao>("data_desc");
  const [isLoaded,         setIsLoaded]         = useState(false);
  const [temaAtivo,        setTemaAtivo]        = useState("dark");
  const [abaAtiva,         setAbaAtiva]         = useState<Aba>("lancamentos");
  const [periodoRelatorio, setPeriodoRelatorio] = useState<"semanal" | "mensal" | "anual">("mensal");

  // Eventos
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventosExpandidos, setEventosExpandidos] = useState<Set<string>>(new Set());
  const [modalEventoAberto, setModalEventoAberto] = useState(false);
  const [nomeNovoEvento, setNomeNovoEvento] = useState("");
  const [modoAgrupar, setModoAgrupar] = useState(false);
  const [transacoesSelecionadas, setTransacoesSelecionadas] = useState<Set<string>>(new Set());
  const [nomeEventoAgrupamento, setNomeEventoAgrupamento] = useState("");

  // Desfazer exclusão
  const [ultimaExcluida,   setUltimaExcluida]   = useState<Transacao | null>(null);
  const [exibirDesfazer,   setExibirDesfazer]   = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Edição de transação
  const [transacaoEditando, setTransacaoEditando] = useState<Transacao | null>(null);

  // Modal de detalhe do evento (para adicionar transações dentro)
  const [eventoDetalheAberto, setEventoDetalheAberto] = useState<string | null>(null); // id do evento
  const [detalheDescricao, setDetalheDescricao] = useState("");
  const [detalheValor, setDetalheValor] = useState("");
  const [detalheIsReceita, setDetalheIsReceita] = useState(false);
  const [detalheCategoriaId, setDetalheCategoriaId] = useState(categorias[0]?.id ?? "");

  // ─── Funções de Evento ─────────────────────────────────────────────────────

  const criarEvento = () => {
    if (!nomeNovoEvento.trim()) return;
    const novo: Evento = { id: Date.now().toString(), nome: nomeNovoEvento.trim() };
    setEventos([novo, ...eventos]);
    setNomeNovoEvento("");
    setModalEventoAberto(false);
  };

  const excluirEvento = (id: string) => {
    // Desvincula as transações do evento antes de excluir
    setTransacoes(transacoes.map(t => t.eventoId === id ? { ...t, eventoId: undefined } : t));
    setEventos(eventos.filter(e => e.id !== id));
  };

  const toggleExpandirEvento = (id: string) => {
    setEventosExpandidos(prev => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  };

  const confirmarAgrupamento = () => {
    if (!nomeEventoAgrupamento.trim() || transacoesSelecionadas.size === 0) return;
    const novoEvento: Evento = { id: Date.now().toString(), nome: nomeEventoAgrupamento.trim() };
    setEventos([novoEvento, ...eventos]);
    setTransacoes(transacoes.map(t =>
      transacoesSelecionadas.has(t.id) ? { ...t, eventoId: novoEvento.id } : t
    ));
    setTransacoesSelecionadas(new Set());
    setNomeEventoAgrupamento("");
    setModoAgrupar(false);
  };

  const toggleSelecionarTransacao = (id: string) => {
    setTransacoesSelecionadas(prev => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  };

  // ─── Edição de Transação ───────────────────────────────────────────────────

  const salvarEdicaoTransacao = () => {
    if (!transacaoEditando) return;
    setTransacoes(transacoes.map(t =>
      t.id === transacaoEditando.id ? transacaoEditando : t
    ));
    setTransacaoEditando(null);
  };

  // ─── Adicionar transação dentro de um evento já existente ─────────────────

  const adicionarDentroDoEvento = (eventoId: string) => {
    const val = parseFloat(detalheValor);
    if (!detalheDescricao.trim() || isNaN(val) || val <= 0) return;
    const nova: Transacao = {
      id: Date.now().toString(),
      descricao: detalheDescricao.trim(),
      valor: val,
      isReceita: detalheIsReceita,
      categoriaId: detalheCategoriaId,
      eventoId,
    };
    setTransacoes([nova, ...transacoes]);
    setDetalheDescricao("");
    setDetalheValor("");
    setDetalheIsReceita(false);
  };

  // Mover transação avulsa para dentro de um evento
  const moverParaEvento = (transacaoId: string, eventoId: string) => {
    setTransacoes(transacoes.map(t =>
      t.id === transacaoId ? { ...t, eventoId } : t
    ));
  };

  const retirarDoEvento = (transacaoId: string) => {
    setTransacoes(transacoes.map(t =>
      t.id === transacaoId ? { ...t, eventoId: undefined } : t
    ));
  };

  // Menus dropdown
  const [menuTemaAberto,   setMenuTemaAberto]   = useState(false);
  const [menuFiltroAberto, setMenuFiltroAberto] = useState(false);
  const menuTemaRef  = useRef<HTMLDivElement>(null);
  const filtroRef    = useRef<HTMLDivElement>(null);

  // Modal de categorias
  const [modalCategoriasAberto, setModalCategoriasAberto] = useState(false);
  const [novoNomeCategoria,     setNovoNomeCategoria]     = useState("");
  const [novaCorCategoria,      setNovaCorCategoria]      = useState(CORES_DISPONIVEIS[0]);
  const [editandoCategoria,     setEditandoCategoria]     = useState<Categoria | null>(null);

  // ─── Efeitos ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = localStorage.getItem("meus_gastos");
    if (t) setTransacoes(JSON.parse(t));

    const c = localStorage.getItem("minhas_categorias");
    setCategorias(c ? JSON.parse(c) : CATEGORIAS_PADRAO);

    const ev = localStorage.getItem("meus_eventos");
    if (ev) setEventos(JSON.parse(ev));

    const tema = localStorage.getItem("tema_preferido");
    if (tema) {
      setTemaAtivo(tema);
      tema === "dark"
        ? document.documentElement.removeAttribute("data-theme")
        : document.documentElement.setAttribute("data-theme", tema);
    }

    const filtro = localStorage.getItem("filtro_preferido") as FiltroOrdenacao;
    if (filtro) setCriterio(filtro);

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem("meus_gastos", JSON.stringify(transacoes));
  }, [transacoes, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem("minhas_categorias", JSON.stringify(categorias));
  }, [categorias, isLoaded]);

  useEffect(() => {
  if (isLoaded) localStorage.setItem("meus_eventos", JSON.stringify(eventos));
  }, [eventos, isLoaded]);

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuTemaRef.current  && !menuTemaRef.current.contains(t))  setMenuTemaAberto(false);
      if (filtroRef.current    && !filtroRef.current.contains(t))    setMenuFiltroAberto(false);
    };
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  // ─── Funções de Negócio ────────────────────────────────────────────────────

  const mudarTema = (id: string) => {
    setTemaAtivo(id);
    localStorage.setItem("tema_preferido", id);
    id === "dark"
      ? document.documentElement.removeAttribute("data-theme")
      : document.documentElement.setAttribute("data-theme", id);
    setMenuTemaAberto(false);
  };

  const adicionar = () => {
    const val = parseFloat(valor);
    if (!descricao || isNaN(val) || val <= 0) return;
    setTransacoes([
      { id: Date.now().toString(), descricao, valor: val, isReceita, categoriaId },
      ...transacoes,
    ]);
    setDescricao("");
    setValor("");
  };

  const remover = (id: string) => {
    const item = transacoes.find((t) => t.id === id);
    if (!item) return;
    setUltimaExcluida(item);
    setExibirDesfazer(true);
    setTransacoes(transacoes.filter((t) => t.id !== id));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setExibirDesfazer(false);
      setUltimaExcluida(null);
    }, 2600);
  };

  const desfazerExclusao = () => {
    if (!ultimaExcluida) return;
    setTransacoes((prev) => [ultimaExcluida, ...prev]);
    setExibirDesfazer(false);
    setUltimaExcluida(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // ─── Funções de Categoria ──────────────────────────────────────────────────

  const adicionarCategoria = () => {
    if (!novoNomeCategoria.trim()) return;
    const nova: Categoria = {
      id:   Date.now().toString(),
      nome: novoNomeCategoria.trim(),
      cor:  novaCorCategoria,
    };
    setCategorias([...categorias, nova]);
    setNovoNomeCategoria("");
    setNovaCorCategoria(CORES_DISPONIVEIS[0]);
  };

  const salvarEdicaoCategoria = () => {
    if (!editandoCategoria || !editandoCategoria.nome.trim()) return;
    setCategorias(categorias.map((c) =>
      c.id === editandoCategoria.id ? editandoCategoria : c
    ));
    setEditandoCategoria(null);
  };

  const excluirCategoria = (id: string) => {
    // Impede excluir se houver transações usando essa categoria
    const emUso = transacoes.some((t) => t.categoriaId === id);
    if (emUso) return alert("Essa categoria está sendo usada em uma transação.");
    setCategorias(categorias.filter((c) => c.id !== id));
  };

  // ─── Dados Derivados ───────────────────────────────────────────────────────

  const saldo = transacoes.reduce(
    (acc, t) => (t.isReceita ? acc + t.valor : acc - t.valor), 0
  );

  const transacoesOrdenadas = [...transacoes].sort((a, b) => {
    if (criterio === "data_desc")  return b.id.localeCompare(a.id);
    if (criterio === "data_asc")   return a.id.localeCompare(b.id);
    if (criterio === "valor_desc") return b.valor - a.valor;
    if (criterio === "valor_asc")  return a.valor - b.valor;
    return 0;
  });

  // Transações avulsas ordenadas
  const transacoesAvulsas = transacoesOrdenadas.filter(t => !t.eventoId);

  // Para cada evento, pega o ID mais recente/maior/menor das suas transações conforme critério
  const eventosOrdenados = eventos
    .map(ev => {
      const tList = transacoesOrdenadas.filter(t => t.eventoId === ev.id);
      if (tList.length === 0) return null;
      // Usa a primeira transação da lista ordenada como "representante" do evento
      const representante = tList[0];
      return { evento: ev, transacoes: tList, representante };
    })
    .filter(Boolean) as { evento: Evento; transacoes: Transacao[]; representante: Transacao }[];

  // Junta tudo numa lista única para ordenar junto
  type ItemLista =
    | { tipo: 'avulsa'; transacao: Transacao }
    | { tipo: 'evento'; evento: Evento; transacoes: Transacao[]; representante: Transacao };

  const listaUnificada: ItemLista[] = [
    ...transacoesAvulsas.map(t => ({ tipo: 'avulsa' as const, transacao: t })),
    ...eventosOrdenados.map(e => ({ tipo: 'evento' as const, ...e })),
  ].sort((a, b) => {
    const repA = a.tipo === 'avulsa' ? a.transacao : a.representante;
    const repB = b.tipo === 'avulsa' ? b.transacao : b.representante;
    if (criterio === 'data_desc') return repB.id.localeCompare(repA.id);
    if (criterio === 'data_asc')  return repA.id.localeCompare(repB.id);
    if (criterio === 'valor_desc') {
      const valA = a.tipo === 'avulsa' ? a.transacao.valor : a.transacoes.reduce((s, t) => s + t.valor, 0);
      const valB = b.tipo === 'avulsa' ? b.transacao.valor : b.transacoes.reduce((s, t) => s + t.valor, 0);
      return valB - valA;
    }
    if (criterio === 'valor_asc') {
      const valA = a.tipo === 'avulsa' ? a.transacao.valor : a.transacoes.reduce((s, t) => s + t.valor, 0);
      const valB = b.tipo === 'avulsa' ? b.transacao.valor : b.transacoes.reduce((s, t) => s + t.valor, 0);
      return valA - valB;
    }
    return 0;
  });

  const getCategoria = (id: string) =>
  categorias.find((c) => c.id === id);

  // ─── Dados para Gráficos ──────────────────────────────────────────────────────

  // Pizza: gastos por categoria (só despesas)
  const dadosPizza = categorias
    .map(cat => {
      const total = transacoes
        .filter(t => !t.isReceita && t.categoriaId === cat.id)
        .reduce((acc, t) => acc + t.valor, 0);
      return { name: cat.nome, value: total, cor: cat.cor };
    })
    .filter(d => d.value > 0);

  // Barras: receita vs despesa por período
  const gerarDadosBarras = () => {
    const agora = new Date();

    if (periodoRelatorio === "semanal") {
      return Array.from({ length: 7 }, (_, i) => {
        const dia = new Date(agora);
        dia.setDate(agora.getDate() - (6 - i));
        const label = dia.toLocaleDateString("pt-BR", { weekday: "short" });
        const diaStr = dia.toDateString();
        const tsDia = transacoes.filter(t => new Date(parseInt(t.id)).toDateString() === diaStr);
        return {
          name: label,
          Receita: tsDia.filter(t => t.isReceita).reduce((a, t) => a + t.valor, 0),
          Despesa: tsDia.filter(t => !t.isReceita).reduce((a, t) => a + t.valor, 0),
        };
      });
    }

    if (periodoRelatorio === "mensal") {
      return Array.from({ length: 6 }, (_, i) => {
        const mes = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1);
        const label = mes.toLocaleDateString("pt-BR", { month: "short" });
        const tsMes = transacoes.filter(t => {
          const d = new Date(parseInt(t.id));
          return d.getMonth() === mes.getMonth() && d.getFullYear() === mes.getFullYear();
        });
        return {
          name: label,
          Receita: tsMes.filter(t => t.isReceita).reduce((a, t) => a + t.valor, 0),
          Despesa: tsMes.filter(t => !t.isReceita).reduce((a, t) => a + t.valor, 0),
        };
      });
    }

    // Anual
    return Array.from({ length: 12 }, (_, i) => {
      const mes = new Date(agora.getFullYear(), i, 1);
      const label = mes.toLocaleDateString("pt-BR", { month: "short" });
      const tsMes = transacoes.filter(t => {
        const d = new Date(parseInt(t.id));
        return d.getMonth() === i && d.getFullYear() === agora.getFullYear();
      });
      return {
        name: label,
        Receita: tsMes.filter(t => t.isReceita).reduce((a, t) => a + t.valor, 0),
        Despesa: tsMes.filter(t => !t.isReceita).reduce((a, t) => a + t.valor, 0),
      };
    });
  };

  const dadosBarras = gerarDadosBarras();

  // Linha: evolução do saldo ao longo do tempo (últimos 30 dias)
  const dadosLinha = (() => {
    const agora = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const dia = new Date(agora);
      dia.setDate(agora.getDate() - (29 - i));
      dia.setHours(23, 59, 59, 999);
      const saldoAcumulado = transacoes
        .filter(t => new Date(parseInt(t.id)) <= dia)
        .reduce((acc, t) => t.isReceita ? acc + t.valor : acc - t.valor, 0);
      return {
        name: dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        Saldo: parseFloat(saldoAcumulado.toFixed(2)),
      };
    });
  })();

  // Resumo do mês atual
  const mesAtual = new Date();
  const transacoesMes = transacoes.filter(t => {
    const d = new Date(parseInt(t.id));
    return d.getMonth() === mesAtual.getMonth() && d.getFullYear() === mesAtual.getFullYear();
  });
  const receitaMes = transacoesMes.filter(t => t.isReceita).reduce((a, t) => a + t.valor, 0);
  const despesaMes = transacoesMes.filter(t => !t.isReceita).reduce((a, t) => a + t.valor, 0);
  const maiorGasto = [...transacoesMes].filter(t => !t.isReceita).sort((a, b) => b.valor - a.valor)[0];
  const categoriaMaisGasta = dadosPizza.sort((a, b) => b.value - a.value)[0];


  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-fundo font-sans transition-colors duration-500 pb-20">
      <div className="max-w-2xl mx-auto">

        {/* ── CABEÇALHO (sempre visível) ── */}
        <div className="bg-card border-b border-borda px-4 md:px-6 py-4 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <h1 className="text-sm md:text-2xl font-bold text-primaria whitespace-nowrap hidden sm:block">Financeiro Bechelli</h1>
            <h1 className="text-sm font-bold text-primaria sm:hidden">Bechelli</h1>

            {/* Menu de Temas */}
            <div className="relative" ref={menuTemaRef}>
              <button
                onClick={() => setMenuTemaAberto(!menuTemaAberto)}
                className={`p-1.5 md:p-2 rounded-lg border border-primaria/30 transition-all active:scale-95 ${menuTemaAberto ? "bg-primaria/20 border-primaria" : "hover:bg-primaria/10"}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-destaque">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </button>
              {menuTemaAberto && (
                <div className="absolute top-full left-0 mt-2 w-44 bg-card border border-borda rounded-lg shadow-2xl z-50 py-1 animate-in fade-in zoom-in duration-200">
                  <p className="px-3 py-1.5 text-[9px] font-bold text-texto-sec uppercase tracking-widest">Temas</p>
                  {OPCOES_TEMA.map((t) => (
                    <button key={t.id} onClick={() => mudarTema(t.id)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${temaAtivo === t.id ? "bg-fundo text-primaria font-bold" : "text-texto hover:bg-fundo/50"}`}>
                      {t.nome}
                      {temaAtivo === t.id && <div className="w-1.5 h-1.5 rounded-full bg-primaria shadow-[0_0_8px_var(--primaria)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Categorias */}
            <button onClick={() => setModalCategoriasAberto(true)}
              className="p-1.5 md:p-2 rounded-lg border border-primaria/30 hover:bg-primaria/10 transition-all active:scale-95" title="Gerenciar Categorias">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-destaque">
                <path d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </button>

            {/* Agrupar */}
            <button onClick={() => setModoAgrupar(!modoAgrupar)}
              className={`p-1.5 md:p-2 rounded-lg border border-primaria/30 hover:bg-primaria/10 transition-all active:scale-95 ${modoAgrupar ? "bg-primaria/20 border-primaria" : ""}`}
              title="Agrupar em Evento">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-destaque">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
            </button>
          </div>

          {/* Filtro */}
          <div className="relative" ref={filtroRef}>
            <button onClick={() => setMenuFiltroAberto(!menuFiltroAberto)}
              className={`flex items-center gap-1.5 md:gap-3 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-primaria/30 transition-all active:scale-95 ${menuFiltroAberto ? "bg-primaria/20 border-primaria" : "hover:bg-primaria/10"}`}>
              <span className="text-xs md:text-sm text-texto">{OPCOES_FILTRO.find((f) => f.id === criterio)?.nome}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primaria">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {menuFiltroAberto && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-card border border-borda rounded-lg shadow-2xl z-50 py-1 animate-in fade-in zoom-in duration-200">
                <p className="px-3 py-1.5 text-[9px] font-bold text-texto-sec uppercase tracking-widest">Ordem</p>
                {OPCOES_FILTRO.map((f) => (
                  <button key={f.id}
                    onClick={() => { setCriterio(f.id); localStorage.setItem("filtro_preferido", f.id); setMenuFiltroAberto(false); }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between transition-colors ${criterio === f.id ? "bg-fundo text-primaria font-bold" : "text-texto hover:bg-fundo/50"}`}>
                    <span>{f.nome}</span>
                    <div className="w-4 flex justify-end">
                      {criterio === f.id && <div className="w-1.5 h-1.5 rounded-full bg-primaria shadow-[0_0_8px_var(--primaria)]" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CONTEÚDO POR ABA ── */}

        {/* ABA: LANÇAMENTOS */}
        {abaAtiva === "lancamentos" && (
          <div className="bg-card rounded-b-xl border border-t-0 border-borda shadow-2xl overflow-hidden">

            {/* Saldo */}
            <div className="p-8 text-center bg-card border-b border-borda">
              <p className="text-texto-sec text-xs font-bold uppercase tracking-widest mb-1">Saldo Atual</p>
              <h2 className="text-4xl md:text-5xl font-black text-texto">R$ {saldo.toFixed(2)}</h2>
            </div>

            {/* Formulário */}
            <div className="p-6 border-b border-borda">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input className="w-full p-3 bg-fundo text-texto placeholder-texto-sec border border-primaria/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-destaque transition-all"
                  placeholder="Valor (R$)" type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
                <input className="w-full p-3 bg-fundo text-texto placeholder-texto-sec border border-primaria/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-destaque transition-all"
                  placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
              <div className="mb-4">
                <p className="text-xs text-texto-sec uppercase tracking-widest mb-2 font-bold">Categoria</p>
                <div className="flex flex-wrap gap-2">
                  {categorias.map((cat) => (
                    <button key={cat.id} onClick={() => setCategoriaId(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${categoriaId === cat.id ? "border-transparent text-black shadow-md scale-105" : "border-borda text-texto-sec bg-fundo hover:border-primaria/50"}`}
                      style={categoriaId === cat.id ? { backgroundColor: cat.cor } : {}}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.cor }} />
                      {cat.nome}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 mb-4">
                <button onClick={() => setIsReceita(true)}
                  className={`flex-1 p-3 rounded-lg font-bold transition-all border flex items-center justify-center gap-2 ${isReceita ? "bg-btn-receita-bg text-btn-receita-txt border-btn-receita-border shadow-sm" : "bg-fundo text-texto-sec border-transparent hover:bg-card/50"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                  Receita
                </button>
                <button onClick={() => setIsReceita(false)}
                  className={`flex-1 p-3 rounded-lg font-bold transition-all border flex items-center justify-center gap-2 ${!isReceita ? "bg-btn-despesa-bg text-btn-despesa-txt border-btn-despesa-border shadow-sm" : "bg-fundo text-texto-sec border-transparent hover:bg-card/50"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                  Despesa
                </button>
              </div>
              <button onClick={adicionar}
                className={`w-full font-black py-4 px-4 rounded-lg transition-all border-2 ${temaAtivo === "cyber" ? "bg-destaque text-black border-destaque hover:brightness-110 active:scale-95" : "bg-card text-primaria border-primaria hover:bg-primaria hover:text-fundo active:scale-95"}`}>
                ADICIONAR TRANSAÇÃO
              </button>
            </div>

            {/* Lista */}
            <ul className="divide-y divide-borda max-h-[400px] overflow-y-auto bg-fundo custom-scrollbar">
              {listaUnificada.length === 0 ? (
                <li className="p-10 text-center text-texto-sec text-sm italic">Nenhuma transação registrada.</li>
              ) : (
                listaUnificada.map(item => {
                  if (item.tipo === "evento") {
                    const { evento, transacoes: tList } = item;
                    const total = tList.reduce((acc, t) => t.isReceita ? acc + t.valor : acc - t.valor, 0);
                    const expandido = eventosExpandidos.has(evento.id);
                    return (
                      <li key={evento.id} className="border-b border-borda">
                        <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-card/30 transition-colors" onClick={() => toggleExpandirEvento(evento.id)}>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🎯</span>
                            <div>
                              <p className="font-bold text-texto">{evento.nome}</p>
                              <p className="text-xs text-texto-sec">{tList.length} {tList.length === 1 ? "item" : "itens"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-black text-lg ${total >= 0 ? "text-sucesso" : "text-erro"}`}>
                              {total >= 0 ? "+" : ""} R$ {Math.abs(total).toFixed(2)}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                              className={`text-texto-sec transition-transform duration-200 ${expandido ? "rotate-180" : ""}`}>
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>
                        {expandido && (
                          <div className="bg-fundo/50 border-t border-borda">
                            {tList.map(t => {
                              const cat = getCategoria(t.categoriaId);
                              return (
                                <div key={t.id} className="px-6 py-3 flex justify-between items-center hover:bg-card/20 transition-colors border-b border-borda/50 last:border-0">
                                  <div className="flex items-center gap-3">
                                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: cat?.cor ?? "#666" }} />
                                    <div>
                                      <p className="text-sm font-medium text-texto">{t.descricao}</p>
                                      {cat && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cat.cor + "33", color: cat.cor }}>{cat.nome}</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold text-sm ${t.isReceita ? "text-sucesso" : "text-erro"}`}>
                                      {t.isReceita ? "+" : "-"} R$ {t.valor.toFixed(2)}
                                    </span>
                                    <button onClick={(e) => { e.stopPropagation(); retirarDoEvento(t.id); }} className="text-texto-sec hover:text-destaque transition-all p-1 opacity-40 hover:opacity-100" title="Retirar do evento">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
                                    </button>
                                    <button onClick={() => setTransacaoEditando(t)} className="text-texto-sec hover:text-primaria transition-all p-1 opacity-40 hover:opacity-100">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                      </svg>
                                    </button>
                                    <button onClick={() => remover(t.id)} className="text-texto-sec hover:text-erro transition-all p-1 opacity-40 hover:opacity-100 active:scale-75">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            <div className="px-6 py-3 flex justify-between items-center border-t border-borda/50">
                              <button onClick={() => setEventoDetalheAberto(evento.id)} className="text-xs text-primaria hover:underline flex items-center gap-1 transition-colors">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                Adicionar ao evento
                              </button>
                              <button onClick={() => excluirEvento(evento.id)} className="text-xs text-texto-sec hover:text-erro transition-colors flex items-center gap-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                Excluir evento
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  }

                  const t = item.transacao;
                  const cat = getCategoria(t.categoriaId);
                  return (
                    <li key={t.id}
                      className={`p-4 flex justify-between items-center hover:bg-card/30 transition-colors ${modoAgrupar ? "cursor-pointer" : ""} ${transacoesSelecionadas.has(t.id) ? "bg-primaria/10 border-l-2 border-primaria" : ""}`}
                      onClick={() => modoAgrupar && toggleSelecionarTransacao(t.id)}>
                      <div className="flex items-center gap-3">
                        {modoAgrupar && (
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${transacoesSelecionadas.has(t.id) ? "bg-primaria border-primaria" : "border-borda"}`}>
                            {transacoesSelecionadas.has(t.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                        )}
                        <div className="flex items-center justify-center w-6">
                          {t.isReceita
                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sucesso)" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--erro)" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-texto">{t.descricao}</span>
                          {cat && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 w-fit" style={{ backgroundColor: cat.cor + "33", color: cat.cor }}>{cat.nome}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${t.isReceita ? "text-sucesso" : "text-erro"}`}>
                          {t.isReceita ? "+" : "-"} R$ {t.valor.toFixed(2)}
                        </span>
                        {!modoAgrupar && (
                          <>
                            <button onClick={() => setTransacaoEditando(t)} className="text-texto-sec hover:text-primaria transition-all p-1 opacity-40 hover:opacity-100">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button onClick={() => remover(t.id)} className="text-texto-sec hover:text-erro transition-all p-1 opacity-40 hover:opacity-100 active:scale-75">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}

        {/* ABA: DASHBOARD */}
        {abaAtiva === "dashboard" && (
          <div className="bg-card rounded-b-xl border border-t-0 border-borda shadow-2xl overflow-hidden p-6 space-y-6">

            {/* Cards de resumo do mês */}
            <div>
              <p className="text-[10px] font-bold text-texto-sec uppercase tracking-widest mb-3">Resumo do Mês</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-fundo rounded-xl p-4 border border-borda">
                  <p className="text-xs text-texto-sec mb-1">Receitas</p>
                  <p className="text-xl font-black text-sucesso">R$ {receitaMes.toFixed(2)}</p>
                </div>
                <div className="bg-fundo rounded-xl p-4 border border-borda">
                  <p className="text-xs text-texto-sec mb-1">Despesas</p>
                  <p className="text-xl font-black text-erro">R$ {despesaMes.toFixed(2)}</p>
                </div>
                <div className="bg-fundo rounded-xl p-4 border border-borda">
                  <p className="text-xs text-texto-sec mb-1">Maior gasto</p>
                  <p className="text-sm font-bold text-texto truncate">{maiorGasto?.descricao ?? "—"}</p>
                  <p className="text-xs text-erro">{maiorGasto ? `R$ ${maiorGasto.valor.toFixed(2)}` : ""}</p>
                </div>
                <div className="bg-fundo rounded-xl p-4 border border-borda">
                  <p className="text-xs text-texto-sec mb-1">Categoria top</p>
                  <p className="text-sm font-bold truncate" style={{ color: categoriaMaisGasta?.cor ?? "var(--texto)" }}>
                    {categoriaMaisGasta?.name ?? "—"}
                  </p>
                  <p className="text-xs text-erro">{categoriaMaisGasta ? `R$ ${categoriaMaisGasta.value.toFixed(2)}` : ""}</p>
                </div>
              </div>
            </div>

            {/* Gráfico de Pizza */}
            {dadosPizza.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold text-texto-sec uppercase tracking-widest mb-3">Gastos por Categoria</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {dadosPizza.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `R$ ${v.toFixed(2)}`} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--borda)", borderRadius: 8, color: "var(--texto)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {dadosPizza.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-texto">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.cor }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-texto-sec text-sm italic py-6">Nenhuma despesa registrada ainda.</p>
            )}

            {/* Gráfico de Linha — evolução do saldo */}
            <div>
              <p className="text-[10px] font-bold text-texto-sec uppercase tracking-widest mb-3">Evolução do Saldo (30 dias)</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dadosLinha}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--borda)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--texto-sec)" }} interval={6} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--texto-sec)" }} />
                  <Tooltip formatter={(v: any) => `R$ ${v.toFixed(2)}`} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--borda)", borderRadius: 8, color: "var(--texto)" }} />
                  <Line type="monotone" dataKey="Saldo" stroke="var(--primaria)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ABA: RELATÓRIOS */}
        {abaAtiva === "relatorios" && (
          <div className="bg-card rounded-b-xl border border-t-0 border-borda shadow-2xl overflow-hidden p-6 space-y-6">

            {/* Seletor de período */}
            <div className="flex gap-2">
              {(["semanal", "mensal", "anual"] as const).map(p => (
                <button key={p} onClick={() => setPeriodoRelatorio(p)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all active:scale-95 ${periodoRelatorio === p ? "bg-primaria text-fundo border-primaria" : "bg-fundo text-texto-sec border-borda hover:border-primaria/50"}`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Gráfico de Barras */}
            <div>
              <p className="text-[10px] font-bold text-texto-sec uppercase tracking-widest mb-3">Receita vs Despesa</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosBarras} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--borda)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--texto-sec)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--texto-sec)" }} />
                  <Tooltip formatter={(v: any) => `R$ ${v.toFixed(2)}`} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--borda)", borderRadius: 8, color: "var(--texto)" }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "var(--texto-sec)" }} />
                  <Bar dataKey="Receita" fill="var(--sucesso)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesa" fill="var(--erro)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela resumo por categoria */}
            <div>
              <p className="text-[10px] font-bold text-texto-sec uppercase tracking-widest mb-3">Detalhamento por Categoria</p>
              <div className="space-y-2">
                {dadosPizza.length === 0
                  ? <p className="text-center text-texto-sec text-sm italic py-4">Nenhuma despesa registrada.</p>
                  : dadosPizza.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-fundo rounded-lg border border-borda">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.cor }} />
                      <span className="flex-1 text-sm text-texto font-medium">{d.name}</span>
                      <span className="text-sm font-bold text-erro">R$ {d.value.toFixed(2)}</span>
                      <span className="text-xs text-texto-sec w-10 text-right">
                        {despesaMes > 0 ? `${((d.value / despesaMes) * 100).toFixed(0)}%` : "—"}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* ABA: METAS */}
        {abaAtiva === "metas" && (
          <div className="bg-card rounded-b-xl border border-t-0 border-borda shadow-2xl overflow-hidden p-6">
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primaria/40">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
              <p className="text-texto-sec text-sm">Metas chegam na Fase 4 com IA 🤖</p>
              <p className="text-texto-sec/50 text-xs">Aqui você vai definir limites por categoria e receber sugestões inteligentes.</p>
            </div>
          </div>
        )}

      </div>

      {/* ── BARRA DE ABAS (RODAPÉ FIXO) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-borda shadow-2xl">
        <div className="max-w-2xl mx-auto flex">
          {([
            { id: "lancamentos", label: "Lançamentos", icon: <path d="M12 5v14M5 12l7-7 7 7"/> },
            { id: "dashboard",   label: "Dashboard",   icon: <><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></> },
            { id: "relatorios",  label: "Relatórios",  icon: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></> },
            { id: "metas",       label: "Metas",       icon: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></> },
          ] as { id: Aba; label: string; icon: React.ReactNode }[]).map(aba => (
            <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${abaAtiva === aba.id ? "text-primaria" : "text-texto-sec hover:text-texto"}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {aba.icon}
              </svg>
              <span className="text-[10px] font-bold">{aba.label}</span>
              {abaAtiva === aba.id && <div className="w-1 h-1 rounded-full bg-primaria" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── MODAIS E OVERLAYS (fora do fluxo de abas) ── */}

      {/* Modal Categorias */}
      {modalCategoriasAberto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setModalCategoriasAberto(false); }}>
          <div className="bg-card border border-borda rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-borda flex justify-between items-center">
              <h2 className="text-lg font-bold text-primaria">Gerenciar Categorias</h2>
              <button onClick={() => setModalCategoriasAberto(false)} className="text-texto-sec hover:text-erro transition-colors active:scale-75">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {categorias.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg bg-fundo border border-borda">
                  {editandoCategoria?.id === cat.id ? (
                    <div className="flex flex-1 items-center gap-2 flex-wrap">
                      <input className="flex-1 min-w-0 p-1.5 bg-card text-texto border border-primaria/50 rounded text-sm focus:outline-none focus:ring-1 focus:ring-destaque"
                        value={editandoCategoria.nome} onChange={(e) => setEditandoCategoria({ ...editandoCategoria, nome: e.target.value })} />
                      <div className="flex gap-1.5 flex-wrap">
                        {CORES_DISPONIVEIS.map((cor) => (
                          <button key={cor} onClick={() => setEditandoCategoria({ ...editandoCategoria, cor })}
                            className={`w-5 h-5 rounded-full transition-all ${editandoCategoria.cor === cor ? "scale-125 ring-2 ring-white/50" : "hover:scale-110"}`}
                            style={{ backgroundColor: cor }} />
                        ))}
                      </div>
                      <div className="flex gap-2 w-full">
                        <button onClick={salvarEdicaoCategoria} className="flex-1 py-1.5 text-xs font-bold bg-primaria/20 text-primaria rounded hover:bg-primaria/30 transition-colors">Salvar</button>
                        <button onClick={() => setEditandoCategoria(null)} className="flex-1 py-1.5 text-xs font-bold bg-fundo text-texto-sec rounded hover:bg-borda transition-colors">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.cor }} />
                      <span className="flex-1 text-sm text-texto font-medium">{cat.nome}</span>
                      <button onClick={() => setEditandoCategoria(cat)} className="text-texto-sec hover:text-primaria transition-colors p-1">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button onClick={() => excluirCategoria(cat.id)} className="text-texto-sec hover:text-erro transition-colors p-1">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-borda space-y-3">
              <p className="text-[10px] font-bold text-texto-sec uppercase tracking-widest">Nova Categoria</p>
              <input className="w-full p-2.5 bg-fundo text-texto placeholder-texto-sec border border-primaria/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-destaque"
                placeholder="Nome da categoria" value={novoNomeCategoria} onChange={(e) => setNovoNomeCategoria(e.target.value)} />
              <div className="flex gap-2 flex-wrap">
                {CORES_DISPONIVEIS.map((cor) => (
                  <button key={cor} onClick={() => setNovaCorCategoria(cor)}
                    className={`w-6 h-6 rounded-full transition-all ${novaCorCategoria === cor ? "scale-125 ring-2 ring-white/50" : "hover:scale-110"}`}
                    style={{ backgroundColor: cor }} />
                ))}
              </div>
              <button onClick={adicionarCategoria} className="w-full py-2.5 text-sm font-bold bg-card text-primaria border-2 border-primaria rounded-lg hover:bg-primaria hover:text-fundo transition-all active:scale-95">
                + Adicionar Categoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra Agrupar */}
      {modoAgrupar && (
        <div className="fixed top-0 left-0 right-0 z-[60] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-card border-b border-primaria/50 shadow-2xl px-4 py-3 flex flex-col gap-3 max-w-2xl mx-auto rounded-b-2xl">
            <p className="text-xs text-texto-sec uppercase tracking-widest font-bold text-center">
              {transacoesSelecionadas.size} {transacoesSelecionadas.size === 1 ? "item selecionado" : "itens selecionados"} — selecione na lista abaixo
            </p>
            <input className="w-full p-2.5 bg-fundo text-texto placeholder-texto-sec border border-primaria/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-destaque"
              placeholder="Nome do evento" value={nomeEventoAgrupamento} onChange={e => setNomeEventoAgrupamento(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={confirmarAgrupamento} disabled={transacoesSelecionadas.size === 0 || !nomeEventoAgrupamento.trim()}
                className="flex-1 py-2 text-sm font-bold bg-primaria text-fundo rounded-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                Agrupar
              </button>
              <button onClick={() => { setModoAgrupar(false); setTransacoesSelecionadas(new Set()); setNomeEventoAgrupamento(""); }}
                className="flex-1 py-2 text-sm font-bold bg-fundo text-texto-sec border border-borda rounded-lg hover:border-primaria/50 transition-all active:scale-95">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Evento */}
      {modalEventoAberto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) setModalEventoAberto(false); }}>
          <div className="bg-card border border-borda rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-primaria">Novo Evento</h2>
            <input className="w-full p-3 bg-fundo text-texto placeholder-texto-sec border border-primaria/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-destaque"
              placeholder="Ex: Cinema com a família" value={nomeNovoEvento} onChange={e => setNomeNovoEvento(e.target.value)}
              onKeyDown={e => e.key === "Enter" && criarEvento()} autoFocus />
            <div className="flex gap-3">
              <button onClick={criarEvento} className="flex-1 py-3 font-bold bg-card text-primaria border-2 border-primaria rounded-lg hover:bg-primaria hover:text-fundo transition-all active:scale-95">Criar Evento</button>
              <button onClick={() => setModalEventoAberto(false)} className="flex-1 py-3 font-bold bg-fundo text-texto-sec border border-borda rounded-lg hover:border-primaria/50 transition-all active:scale-95">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Transação */}
      {transacaoEditando && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) setTransacaoEditando(null); }}>
          <div className="bg-card border border-borda rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-primaria">Editar Transação</h2>
            <input className="w-full p-3 bg-fundo text-texto border border-primaria/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-destaque"
              placeholder="Valor (R$)" type="number" value={transacaoEditando.valor}
              onChange={e => setTransacaoEditando({ ...transacaoEditando, valor: parseFloat(e.target.value) || 0 })} />
            <input className="w-full p-3 bg-fundo text-texto border border-primaria/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-destaque"
              placeholder="Descrição" value={transacaoEditando.descricao}
              onChange={e => setTransacaoEditando({ ...transacaoEditando, descricao: e.target.value })} />
            <div>
              <p className="text-xs text-texto-sec uppercase tracking-widest mb-2 font-bold">Categoria</p>
              <div className="flex flex-wrap gap-2">
                {categorias.map(cat => (
                  <button key={cat.id} onClick={() => setTransacaoEditando({ ...transacaoEditando, categoriaId: cat.id })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${transacaoEditando.categoriaId === cat.id ? "border-transparent text-black shadow-md" : "border-borda text-texto-sec bg-fundo"}`}
                    style={transacaoEditando.categoriaId === cat.id ? { backgroundColor: cat.cor } : {}}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.cor }} />
                    {cat.nome}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setTransacaoEditando({ ...transacaoEditando, isReceita: true })}
                className={`flex-1 py-2 rounded-lg font-bold text-sm border transition-all ${transacaoEditando.isReceita ? "bg-btn-receita-bg text-btn-receita-txt border-btn-receita-border" : "bg-fundo text-texto-sec border-transparent"}`}>
                ↑ Receita
              </button>
              <button onClick={() => setTransacaoEditando({ ...transacaoEditando, isReceita: false })}
                className={`flex-1 py-2 rounded-lg font-bold text-sm border transition-all ${!transacaoEditando.isReceita ? "bg-btn-despesa-bg text-btn-despesa-txt border-btn-despesa-border" : "bg-fundo text-texto-sec border-transparent"}`}>
                ↓ Despesa
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={salvarEdicaoTransacao} className="flex-1 py-3 font-bold bg-card text-primaria border-2 border-primaria rounded-lg hover:bg-primaria hover:text-fundo transition-all active:scale-95">Salvar</button>
              <button onClick={() => setTransacaoEditando(null)} className="flex-1 py-3 font-bold bg-fundo text-texto-sec border border-borda rounded-lg hover:border-primaria/50 transition-all active:scale-95">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar ao Evento */}
      {eventoDetalheAberto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) setEventoDetalheAberto(null); }}>
          <div className="bg-card border border-borda rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-primaria">Adicionar a: {eventos.find(e => e.id === eventoDetalheAberto)?.nome}</h2>
            <div className="flex flex-col gap-3 border border-borda rounded-lg p-4">
              <p className="text-xs text-texto-sec uppercase tracking-widest font-bold">Nova transação</p>
              <input className="w-full p-2.5 bg-fundo text-texto placeholder-texto-sec border border-primaria/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-destaque"
                placeholder="Valor (R$)" type="number" value={detalheValor} onChange={e => setDetalheValor(e.target.value)} />
              <input className="w-full p-2.5 bg-fundo text-texto placeholder-texto-sec border border-primaria/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-destaque"
                placeholder="Descrição" value={detalheDescricao} onChange={e => setDetalheDescricao(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                {categorias.map(cat => (
                  <button key={cat.id} onClick={() => setDetalheCategoriaId(cat.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${detalheCategoriaId === cat.id ? "border-transparent text-black" : "border-borda text-texto-sec bg-fundo"}`}
                    style={detalheCategoriaId === cat.id ? { backgroundColor: cat.cor } : {}}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.cor }} />
                    {cat.nome}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDetalheIsReceita(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${detalheIsReceita ? "bg-btn-receita-bg text-btn-receita-txt border-btn-receita-border" : "bg-fundo text-texto-sec border-transparent"}`}>↑ Receita</button>
                <button onClick={() => setDetalheIsReceita(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${!detalheIsReceita ? "bg-btn-despesa-bg text-btn-despesa-txt border-btn-despesa-border" : "bg-fundo text-texto-sec border-transparent"}`}>↓ Despesa</button>
              </div>
              <button onClick={() => adicionarDentroDoEvento(eventoDetalheAberto)} className="w-full py-2.5 text-sm font-bold bg-card text-primaria border-2 border-primaria rounded-lg hover:bg-primaria hover:text-fundo transition-all active:scale-95">+ Adicionar</button>
            </div>
            {transacoesAvulsas.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-texto-sec uppercase tracking-widest font-bold">Ou mover uma existente</p>
                {transacoesAvulsas.map(t => {
                  const cat = getCategoria(t.categoriaId);
                  return (
                    <div key={t.id} className="flex justify-between items-center p-3 rounded-lg bg-fundo border border-borda">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-texto">{t.descricao}</span>
                        {cat && <span className="text-[10px]" style={{ color: cat.cor }}>{cat.nome}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${t.isReceita ? "text-sucesso" : "text-erro"}`}>{t.isReceita ? "+" : "-"} R$ {t.valor.toFixed(2)}</span>
                        <button onClick={() => moverParaEvento(t.id, eventoDetalheAberto)} className="text-xs font-bold text-primaria border border-primaria/50 px-2 py-1 rounded-lg hover:bg-primaria/10 transition-all active:scale-95">Mover</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => setEventoDetalheAberto(null)} className="w-full py-2.5 text-sm font-bold bg-fundo text-texto-sec border border-borda rounded-lg hover:border-primaria/50 transition-all active:scale-95">Fechar</button>
          </div>
        </div>
      )}

      {/* Toast Desfazer */}
      {exibirDesfazer && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-card border border-primaria/50 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 min-w-[280px] justify-between">
            <span className="text-sm text-texto">Item removido</span>
            <button onClick={desfazerExclusao} className="text-primaria font-bold text-sm hover:underline flex items-center gap-1 active:scale-95">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              DESFAZER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}