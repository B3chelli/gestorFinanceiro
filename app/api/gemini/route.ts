import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Recebe a requisição do seu frontend (celular do seu amigo)
    const body = await request.json();

    // 2. Faz a chamada para o Google usando a chave escondida do servidor
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), // Repassa o prompt que veio do frontend
      }
    );

    // 3. Devolve a resposta do Google para o seu frontend
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Erro na API Route:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}