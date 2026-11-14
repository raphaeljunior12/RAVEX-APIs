'use strict';

const { URL } = require('url');

const BASE_URL = 'https://pro-apis.zone.id/api/ai';

const ENDPOINTS = Object.freeze([
    'gpt',
    'chatbot',
    'gemini',
    'deepseek',
    'blackbox',
    'copilot',
    'llama',
    'mistral',
    'mistral2',
    'talkai',
    'dalle',
    'flux',
    'animeai',
    'aitranslate',
    'grammer',
    'mathai',
    'refrase',
    'summarize',
    'roast'
]);

function extrairResposta(dados) {
    if (typeof dados === 'string') return dados;

    if (!dados || typeof dados !== 'object') return '';

    const campos = [
        'response',
        'result',
        'answer',
        'message',
        'text',
        'content',
        'output',
        'url',
        'image',
        'data'
    ];

    for (const campo of campos) {
        const valor = dados[campo];

        if (typeof valor === 'string' && valor.trim()) {
            return valor.trim();
        }

        if (valor && typeof valor === 'object') {
            const interno = extrairResposta(valor);
            if (interno) return interno;
        }
    }

    return '';
}

async function consultar(endpoint, pergunta, sessao) {
    const chave = String(process.env.PRO_APIS_KEY || '').trim();

    if (!chave) {
        throw new Error('A chave PRO_APIS_KEY ainda não está configurada no RAVEX-API.');
    }

    const nome = String(endpoint || '').trim().toLowerCase();

    if (!ENDPOINTS.includes(nome)) {
        throw new Error('Endpoint Pro-APIs não autorizado.');
    }

    const texto = String(pergunta || '').trim();

    if (!texto) {
        throw new Error('É necessário indicar um texto ou pedido.');
    }

    const url = new URL(`${BASE_URL}/${nome}`);
    url.searchParams.set('key', chave);
    url.searchParams.set('q', texto);

    if (nome === 'chatbot' && sessao) {
        url.searchParams.set('session', String(sessao));
    }

    let resposta;

    try {
        resposta = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': chave,
                Accept: 'application/json'
            },
            signal: AbortSignal.timeout(90000)
        });
    } catch (erro) {
        if (erro.name === 'TimeoutError' || erro.name === 'AbortError') {
            throw new Error('O Pro-APIs demorou demasiado tempo a responder.');
        }

        throw new Error('Não foi possível comunicar com o Pro-APIs.');
    }

    const corpo = await resposta.text();

    let dados;

    try {
        dados = corpo ? JSON.parse(corpo) : {};
    } catch {
        throw new Error('O Pro-APIs devolveu uma resposta que não é JSON válido.');
    }

    if (!resposta.ok || dados?.success === false) {
        const erro =
            dados?.error ||
            dados?.erro ||
            dados?.message ||
            `O Pro-APIs respondeu com o código HTTP ${resposta.status}.`;

        throw new Error(String(erro));
    }

    return {
        status: true,
        endpoint: nome,
        resposta: extrairResposta(dados),
        dados
    };
}

module.exports = {
    ENDPOINTS,
    consultar,
    extrairResposta
};
