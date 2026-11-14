'use strict';

const crypto = require('crypto');
const ia = require('../servicos/ia');
const gemini = require('../servicos/gemini');
const proApis = require('../servicos/proApis');

async function lerCorpo(req, limite = 20000) {
    let corpo = '';

    for await (const parte of req) {
        corpo += parte;

        if (corpo.length > limite) {
            const erro = new Error('Pedido demasiado grande.');
            erro.statusCode = 413;
            throw erro;
        }
    }

    try {
        return JSON.parse(corpo || '{}');
    } catch {
        const erro = new Error('JSON inválido.');
        erro.statusCode = 400;
        throw erro;
    }
}

async function rotaIA(req, res, url, responderJson) {
    if (!url.pathname.startsWith('/api/ia')) {
        return false;
    }

    const chaveConfigurada = String(
        process.env.RAVEX_BOT_API_KEY || ''
    ).trim();

    if (!chaveConfigurada) {
        responderJson(res, 503, {
            status: false,
            erro: 'Autenticação da API IA não configurada.'
        });
        return true;
    }

    const chaveRecebida = String(
        url.searchParams.get('apikey') || ''
    ).trim();

    const esperada = Buffer.from(chaveConfigurada);
    const recebida = Buffer.from(chaveRecebida);

    const chaveValida =
        esperada.length === recebida.length &&
        crypto.timingSafeEqual(esperada, recebida);

    if (!chaveValida) {
        responderJson(res, 401, {
            status: false,
            erro: 'Chave de acesso inválida ou não fornecida.'
        });
        return true;
    }

    if (url.pathname === '/api/ia/status') {
        if (req.method !== 'GET') {
            responderJson(res, 405, {
                status: false,
                erro: 'Método não permitido.'
            });
            return true;
        }

        responderJson(res, 200, ia.obterStatus());
        return true;
    }

    if (url.pathname === '/api/ia/gemini') {
        if (req.method !== 'POST') {
            responderJson(res, 405, {
                status: false,
                erro: 'Utiliza o método POST.'
            });
            return true;
        }

        try {
            const dados = await lerCorpo(req);
            const texto = String(dados.text || '').trim();
            const sessao = String(dados.id || '').trim();

            if (!texto) {
                responderJson(res, 400, {
                    status: false,
                    erro: 'O campo text é obrigatório.'
                });
                return true;
            }

            const resultado = await gemini.conversar(texto, sessao);
            responderJson(res, 200, resultado);
        } catch (erro) {
            console.error('[RAVEX-IA/GEMINI]', erro.message);

            responderJson(res, erro.statusCode || 502, {
                status: false,
                erro: erro.message || 'Não foi possível contactar o Gemini.'
            });
        }

        return true;
    }

    const correspondencia = url.pathname.match(
        /^\/api\/ia\/proapis\/([a-z0-9]+)$/
    );

    if (correspondencia) {
        if (req.method !== 'POST') {
            responderJson(res, 405, {
                status: false,
                erro: 'Utiliza o método POST.'
            });
            return true;
        }

        const endpoint = correspondencia[1];

        if (!proApis.ENDPOINTS.includes(endpoint)) {
            responderJson(res, 404, {
                status: false,
                erro: 'Endpoint Pro-APIs não encontrado.'
            });
            return true;
        }

        try {
            const dados = await lerCorpo(req);
            const texto = String(dados.text || '').trim();
            const sessao = String(dados.id || '').trim();

            if (!texto) {
                responderJson(res, 400, {
                    status: false,
                    erro: 'O campo text é obrigatório.'
                });
                return true;
            }

            const resultado = await proApis.consultar(
                endpoint,
                texto,
                sessao
            );

            responderJson(res, 200, resultado);
        } catch (erro) {
            console.error(`[RAVEX-IA/PRO-APIS/${endpoint}]`, erro.message);

            responderJson(res, erro.statusCode || 502, {
                status: false,
                erro: erro.message || 'Não foi possível contactar o Pro-APIs.'
            });
        }

        return true;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        responderJson(res, 405, {
            status: false,
            erro: 'Método não permitido.'
        });
        return true;
    }

    responderJson(res, 404, {
        status: false,
        erro: 'Rota de IA não encontrada.'
    });

    return true;
}

module.exports = rotaIA;
