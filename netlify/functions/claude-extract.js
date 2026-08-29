// Netlify Function: proxy seguro para a API da Anthropic.
// A chave fica só aqui no servidor (variável de ambiente ANTHROPIC_API_KEY),
// nunca no navegador. O front-end (index.html) chama este endpoint em
// /.netlify/functions/claude-extract em vez de chamar a Anthropic direto.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido.' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'ANTHROPIC_API_KEY não configurada no Netlify. Vá em Site settings → Environment variables e adicione essa chave.',
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corpo da requisição inválido.' }) };
  }

  const { system, userContent, maxTokens } = payload;
  if (!userContent) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Faltou o conteúdo a analisar (userContent).' }) };
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: maxTokens || 4096,
        system: system || undefined,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: data.error?.message || 'Erro na API da Anthropic.', details: data }) };
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao chamar a Anthropic: ' + err.message }) };
  }
};
