'use strict';

const MODELO = 'gemini-3.8-flash';
const URL_API = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

const MAX_TENTATIVAS = 4;
const TEMPO_LIMITE = 60000;
const ESPERAS = [30000, 60000, 120000];

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function conversar(texto, sessao) {
    const chave = String(process.env.GEMINI_API_KEY || '').trim();

    if (!chave) {
        throw new Error('O serviço Gemini não está configurado.');
    }

    const mensagem = String(texto || '').trim();

    if (!mensagem) {
        throw new Error('Escreve uma mensagem para o Gemini.');
    }

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
        try {
            const resposta = await fetch(URL_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': chave
                },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: mensagem }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048
                    }
                }),
                signal: AbortSignal.timeout(TEMPO_LIMITE)
            });

            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                const erro = new Error(
                    dados?.error?.message || `Gemini respondeu com HTTP ${resposta.status}.`
                );

                erro.status = resposta.status;
                erro.temporario = [429, 503, 504].includes(resposta.status);

                throw erro;
            }

            const resultado = dados?.candidates?.[0]?.content?.parts
                ?.map(parte => parte.text || '')
                .join('')
                .trim();

            if (!resultado) {
                throw new Error('O Gemini não devolveu uma resposta de texto.');
            }

            return {
                status: true,
                modelo: MODELO,
                sessao: String(sessao || ''),
                resposta: resultado
            };
        } catch (erro) {
            const temporario = erro.temporario ||
                ['TimeoutError', 'AbortError'].includes(erro.name) ||
                erro instanceof TypeError;

            if (!temporario || tentativa === MAX_TENTATIVAS) {
                if (erro.status === 429) {
                    throw new Error('Limite de pedidos Gemini atingido após várias tentativas.');
                }

                if (erro.status === 503) {
                    throw new Error('O Gemini continua com elevada procura. Tenta novamente mais tarde.');
                }

                if (erro.status === 504 || ['TimeoutError', 'AbortError'].includes(erro.name)) {
                    throw new Error('O Gemini não respondeu dentro do tempo limite após várias tentativas.');
                }

                throw erro;
            }

            const pausa = ESPERAS[tentativa - 1];

            console.log(
                `[RAVEX-IA/GEMINI] Tentativa ${tentativa} falhou. Nova tentativa em ${pausa / 1000}s.`
            );

            await esperar(pausa);
        }
    }
}

module.exports = { conversar };
