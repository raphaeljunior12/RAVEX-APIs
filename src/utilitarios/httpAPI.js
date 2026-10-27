async function requisitarJson(url, opcoes = {}) {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), opcoes.timeout || 10000);

    try {
        const resposta = await fetch(url, {
            method: opcoes.method || 'GET',
            headers: opcoes.headers || {},
            signal: controlador.signal
        });

        const texto = await resposta.text();

        let dados = null;

        try {
            dados = texto ? JSON.parse(texto) : null;
        } catch {
            dados = {
                resposta: texto
            };
        }

        if (!resposta.ok) {
            const erro = new Error(`API externa respondeu HTTP ${resposta.status}.`);
            erro.status = resposta.status;
            erro.dados = dados;
            throw erro;
        }

        return dados;
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = {
    requisitarJson
};
