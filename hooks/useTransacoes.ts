// hooks/useTransacoes.ts
import { useState, useRef } from "react";
import { supabase } from "../lib/supabase"; // Ajuste o caminho se necessário
import { Transacao } from "../types";

export const useTransacoes = (usuario: any) => {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [ultimaExcluida, setUltimaExcluida] = useState<Transacao | null>(null);
  const [exibirDesfazer, setExibirDesfazer] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const buscarTransacoes = async () => {
    if (!usuario) return;
    const { data, error } = await supabase
      .from('transacoes')
      .select('*')
      .eq('user_id', usuario.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar transações:", error);
    } else {
      const transacoesFormatadas = (data || []).map(t => ({
        id: t.id,
        descricao: t.descricao,
        valor: t.valor,
        isReceita: t.is_receita,
        categoriaId: t.categoria,
        eventoId: t.evento_id || undefined
      }));
      setTransacoes(transacoesFormatadas);
    }
  };

  const adicionar = async (descricao: string, valor: number, isReceita: boolean, categoriaId: string) => {
    if (!descricao || isNaN(valor) || valor <= 0 || !usuario) return;

    const { error } = await supabase.from('transacoes').insert([{
      user_id: usuario.id,
      descricao,
      valor,
      is_receita: isReceita,
      categoria: categoriaId
    }]);

    if (error) alert("Erro ao salvar: " + error.message);
    else buscarTransacoes();
  };

  const remover = async (id: string) => {
    const item = transacoes.find((t) => t.id === id);
    if (!item) return;

    setUltimaExcluida(item);
    setExibirDesfazer(true);
    setTransacoes(transacoes.filter((t) => t.id !== id)); 

    const { error } = await supabase.from('transacoes').delete().eq('id', id);
    if (error) console.error("Erro ao excluir do banco:", error);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setExibirDesfazer(false);
      setUltimaExcluida(null);
    }, 2600);
  };

  const desfazerExclusao = async () => {
    if (!ultimaExcluida || !usuario) return;
    setExibirDesfazer(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    const { error } = await supabase.from('transacoes').insert([{
      user_id: usuario.id,
      descricao: ultimaExcluida.descricao,
      valor: ultimaExcluida.valor,
      is_receita: ultimaExcluida.isReceita,
      categoria: ultimaExcluida.categoriaId,
      evento_id: ultimaExcluida.eventoId
    }]);

    if (error) alert("Erro ao restaurar: " + error.message);
    else buscarTransacoes();

    setUltimaExcluida(null);
  };

  const salvarEdicaoTransacao = async (transacaoEditando: Transacao) => {
    if (!usuario) return;
    setTransacoes(transacoes.map(t => t.id === transacaoEditando.id ? transacaoEditando : t));

    const { error } = await supabase.from('transacoes').update({
      descricao: transacaoEditando.descricao,
      valor: transacaoEditando.valor,
      is_receita: transacaoEditando.isReceita,
      categoria: transacaoEditando.categoriaId
    }).eq('id', transacaoEditando.id);

    if (error) {
      alert("Erro ao editar: " + error.message);
      buscarTransacoes();
    }
  };

  // Retorna tudo o que a tela vai precisar acessar
  return {
    transacoes,
    setTransacoes, // Útil para funções de eventos que ainda estão no page.tsx
    ultimaExcluida,
    exibirDesfazer,
    buscarTransacoes,
    adicionar,
    remover,
    desfazerExclusao,
    salvarEdicaoTransacao
  };
};