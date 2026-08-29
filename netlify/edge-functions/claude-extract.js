// Netlify EDGE Function: proxy seguro para a API da Anthropic.
// Diferente de uma Netlify Function "clássica" (netlify/functions), uma
// Edge Function roda em outra infraestrutura, sem o limite fixo de ~10s
// que interrompia chamadas de IA mais demoradas com erro 504.
//
// A chave continua só no servidor (variável de ambiente ANTHROPIC_API_KEY),
// nunca no navegador.

export default async (request, context) => {
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido.' }), { status: 405 });
    }

    const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'ANTHROPIC_API_KEY não configurada no Netlify. Vá em Site configuration → Environment variables e adicione essa chave.',
      }), { status: 500 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Corpo da requisição inválido.' }), { status: 400 });
    }

    const { system, userContent, maxTokens } = payload;
    if (!userContent) {
      return new Response(JSON.stringify({ error: 'Faltou o conteúdo a analisar (userContent).' }), { status: 400 });
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens || 4096,
        system: system || undefined,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Erro na API da Anthropic.', details: data }), { status: resp.status });
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    // Rede de segurança: qualquer erro inesperado ainda volta como JSON legível,
    // nunca como uma página de erro genérica que o front-end não consegue interpretar.
    return new Response(JSON.stringify({ error: 'Erro inesperado na função: ' + (err && err.message ? err.message : String(err)) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = { path: '/api/claude-extract' };
