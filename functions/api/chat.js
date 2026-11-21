const MODEL = '@cf/zai-org/glm-4.7-flash';
const SYSTEM_PROMPT = `Você é JARVIS, assistente pessoal de Ivan. Responda sempre em português brasileiro, com precisão, clareza e postura profissional. Ajude nas áreas profissional (especialmente engenharia elétrica, sistemas ferroviários e implantação de sinalização e telecomunicações), pessoal, residencial e financeira. Organize respostas técnicas, explicite premissas e incertezas. Você não tem autorização nem ferramentas para executar ações externas nesta versão. Nunca afirme que enviou e-mails, alterou agenda, controlou dispositivos ou realizou operações que não foram efetivamente integradas. Para ações externas, explique o que seria feito e solicite autorização; por enquanto, apenas prepare instruções. Não solicite nem exponha senhas, chaves ou dados bancários.`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8', 'cache-control':'no-store'}});
}

export async function onRequestPost({request, env}) {
  if (!env.JARVIS_ACCESS_PASSWORD) return json({error:'O administrador ainda não configurou a senha de acesso.'}, 503);
  const auth = request.headers.get('Authorization') || '';
  const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!supplied || supplied !== env.JARVIS_ACCESS_PASSWORD) return json({error:'Acesso não autorizado.'}, 401);
  if (!env.AI) return json({error:'A vinculação Workers AI não está configurada.'}, 503);
  if (!env.DB) return json({error:'A base D1 não está vinculada. Consulte o README.'}, 503);

  let body;
  try { body = await request.json(); } catch { return json({error:'Corpo JSON inválido.'}, 400); }
  const conversationId = String(body.conversationId || '');
  const message = String(body.message || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return json({error:'Identificador de conversa inválido.'}, 400);
  if (!message || message.length > 6000) return json({error:'A mensagem deve ter entre 1 e 6.000 caracteres.'}, 400);

  try {
    // Retenção simples: remove conversas antigas e limita cada conversa às últimas 40 mensagens.
    await env.DB.prepare('DELETE FROM messages WHERE created_at < unixepoch() - 2592000').run();
    const rows = await env.DB.prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 14').bind(conversationId).all();
    const prior = (rows.results || []).reverse();
    const messages = [{role:'system', content:SYSTEM_PROMPT}, ...prior, {role:'user', content:message}];
    const result = await env.AI.run(MODEL, {messages, max_tokens:1200, temperature:0.45});
    const reply = result?.response || result?.result?.response || result?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) throw new Error('Resposta vazia do modelo.');

    await env.DB.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').bind(conversationId, 'user', message).run();
    await env.DB.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').bind(conversationId, 'assistant', reply.slice(0, 12000)).run();
    await env.DB.prepare(`DELETE FROM messages WHERE conversation_id = ? AND id NOT IN (SELECT id FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 40)`).bind(conversationId, conversationId).run();
    return json({reply, model:MODEL});
  } catch (error) {
    console.error('JARVIS chat error', error);
    return json({error:'Não foi possível obter uma resposta. Verifique os limites da conta Cloudflare e a configuração do modelo.'}, 502);
  }
}
