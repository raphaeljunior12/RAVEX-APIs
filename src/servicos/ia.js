'use strict';

const COMANDOS_TEXTO = Object.freeze({
    gpt: 'Assistente de conversação',
    chatbot: 'Conversa inteligente',
    gemini: 'Conversação Gemini',
    deepseek: 'Análise e raciocínio',
    blackbox: 'Assistência de programação',
    copilot: 'Assistência de produtividade',
    llama: 'Assistente de conversação',
    mistral: 'Assistente de conversação',
    mistral2: 'Assistente de conversação',
    talkai: 'Conversa natural',
    aitranslate: 'Tradução de textos',
    grammer: 'Correcção gramatical',
    mathai: 'Resolução de problemas matemáticos',
    refrase: 'Reformulação de textos',
    summarize: 'Resumo de conteúdos',
    roast: 'Humor e brincadeiras leves'
});

const COMANDOS_IMAGEM = Object.freeze({
    dalle: 'Geração de imagens DALL-E',
    flux: 'Geração de imagens Flux',
    animeai: 'Geração de imagens Anime'
});

function obterStatus() {
    const geminiConfigurado = Boolean(
        String(process.env.GEMINI_API_KEY || '').trim()
    );

    const modelos = {};

    for (const [nome, descricao] of Object.entries(COMANDOS_TEXTO)) {
        modelos[nome] = {
            descricao,
            motor: 'Gemini',
            disponivel: geminiConfigurado,
            provedorConfigurado: geminiConfigurado
        };
    }

    for (const [nome, descricao] of Object.entries(COMANDOS_IMAGEM)) {
        modelos[nome] = {
            descricao,
            disponivel: false,
            provedorConfigurado: false
        };
    }

    return {
        status: true,
        servico: 'RAVEX-IA',
        disponivel: geminiConfigurado,
        motor: 'Gemini',
        mensagem: geminiConfigurado
            ? 'Integração Gemini configurada. A disponibilidade efectiva depende do provedor.'
            : 'A chave Gemini ainda não está configurada.',
        modelos
    };
}

module.exports = {
    obterStatus
};
