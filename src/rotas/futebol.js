const futebol = require('../servicos/futebol');

async function rotaFutebol(req, res, url, responderJson) {
    if (!url.pathname.startsWith('/api/futebol')) {
        return false;
    }

    if (req.method !== 'GET') {
        responderJson(res, 405, {
            status: false,
            erro: 'Método não permitido.'
        });
        return true;
    }

    if (url.pathname === '/api/futebol/status') {
        responderJson(res, 200, futebol.obterStatus());
        return true;
    }

    if (url.pathname === '/api/futebol/hoje') {
        try {
            const dados = await futebol.jogosHoje();
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 502, {
                status: false,
                erro: 'Não foi possível consultar os jogos de hoje.'
            });
        }
        return true;
    }

    if (url.pathname === '/api/futebol/amanha') {
        try {
            const dados = await futebol.jogosAmanha();
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 502, {
                status: false,
                erro: 'Não foi possível consultar os jogos de amanhã.'
            });
        }
        return true;
    }

    if (url.pathname === '/api/futebol/aovivo') {
        try {
            const dados = await futebol.aoVivo();
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 502, {
                status: false,
                erro: 'Não foi possível consultar os jogos ao vivo.'
            });
        }
        return true;
    }

    if (url.pathname === '/api/futebol/buscar') {
        const time = url.searchParams.get('time');

        if (!time || time.trim().length < 2) {
            responderJson(res, 400, {
                status: false,
                erro: 'Informe o time usando ?time=NomeDoTime.'
            });
            return true;
        }

        try {
            const dados = await futebol.buscarTime(time);
            const solicitado = Number(url.searchParams.get('limite'));
            const limite = Number.isInteger(solicitado) && solicitado >= 1
                ? Math.min(solicitado, 50)
                : 10;

            dados.jogos = dados.jogos.slice(0, limite);
            dados.retornados = dados.jogos.length;
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 502, {
                status: false,
                erro: 'Não foi possível buscar o time.'
            });
        }
        return true;
    }

    if (url.pathname === '/api/futebol/proximos') {
        const time = url.searchParams.get('time');

        if (!time || time.trim().length < 2) {
            responderJson(res, 400, {
                status: false,
                erro: 'Informe o time usando ?time=NomeDoTime.'
            });
            return true;
        }

        try {
            const dados = await futebol.proximosJogos(time);
            const solicitado = Number(url.searchParams.get('limite'));
            const limite = Number.isInteger(solicitado) && solicitado >= 1
                ? Math.min(solicitado, 20)
                : 5;

            dados.jogos = dados.jogos.slice(0, limite);
            dados.retornados = dados.jogos.length;
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 502, {
                status: false,
                erro: 'Não foi possível consultar os próximos jogos.'
            });
        }
        return true;
    }

    if (url.pathname === '/api/futebol/tabela') {
        const competicao = url.searchParams.get('competicao');

        if (!competicao || competicao.trim().length < 2) {
            responderJson(res, 400, {
                status: false,
                erro: 'Informe a competição usando ?competicao=premier.'
            });
            return true;
        }

        try {
            const dados = await futebol.tabela(competicao);
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 400, {
                status: false,
                erro: erro?.message || 'Não foi possível consultar a tabela.'
            });
        }

        return true;
    }

    if (url.pathname === '/api/futebol/artilheiros') {
        const competicao = url.searchParams.get('competicao');

        if (!competicao || competicao.trim().length < 2) {
            responderJson(res, 400, {
                status: false,
                erro: 'Informe a competição usando ?competicao=premier.'
            });
            return true;
        }

        try {
            const dados = await futebol.artilheiros(competicao);
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 400, {
                status: false,
                erro: erro?.message || 'Não foi possível consultar os artilheiros.'
            });
        }
        return true;
    }

    if (url.pathname === '/api/futebol/calendario') {
        const competicao = url.searchParams.get('competicao');

        if (!competicao || competicao.trim().length < 2) {
            responderJson(res, 400, {
                status: false,
                erro: 'Informe a competição usando ?competicao=premier.'
            });
            return true;
        }

        try {
            const dados = await futebol.calendario(competicao);
            const solicitado = Number(url.searchParams.get('limite'));
            const limite = Number.isInteger(solicitado) && solicitado >= 1
                ? Math.min(solicitado, 50)
                : 20;

            dados.jogos = dados.jogos.slice(0, limite);
            dados.retornados = dados.jogos.length;
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 400, {
                status: false,
                erro: erro?.message || 'Não foi possível consultar o calendário.'
            });
        }
        return true;
    }

    if (url.pathname === '/api/futebol/time') {
        const time = url.searchParams.get('time');

        if (!time || time.trim().length < 2) {
            responderJson(res, 400, {
                status: false,
                erro: 'Informe o time usando ?time=NomeDoTime.'
            });
            return true;
        }

        try {
            const dados = await futebol.time(time);
            dados.jogos = dados.jogos.slice(0, 20);
            dados.retornados = dados.jogos.length;
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 502, {
                status: false,
                erro: erro?.message || 'Não foi possível consultar o time.'
            });
        }
        return true;
    }

    if (url.pathname === '/api/futebol/confronto') {
        const time1 = url.searchParams.get('time1');
        const time2 = url.searchParams.get('time2');

        if (!time1 || !time2 || time1.trim().length < 2 || time2.trim().length < 2) {
            responderJson(res, 400, {
                status: false,
                erro: 'Informe ?time1=TimeA&time2=TimeB.'
            });
            return true;
        }

        try {
            const dados = await futebol.confronto(time1, time2);
            dados.jogos = dados.jogos.slice(0, 20);
            dados.retornados = dados.jogos.length;
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 502, {
                status: false,
                erro: erro?.message || 'Não foi possível consultar o confronto.'
            });
        }
        return true;
    }

    if (url.pathname === '/api/futebol/ravexlive') {
        const time = url.searchParams.get('time');

        if (!time || time.trim().length < 2) {
            responderJson(res, 400, {
                status: false,
                erro: 'Informe o time usando ?time=NomeDoTime.'
            });
            return true;
        }

        try {
            const dados = await futebol.ravexLive(time);
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 502, {
                status: false,
                erro: erro?.message || 'Não foi possível consultar o RAVEX Live.'
            });
        }
        return true;
    }

    if (url.pathname === '/api/futebol/assistir') {
        const time = url.searchParams.get('time');

        if (!time || time.trim().length < 2) {
            responderJson(res, 400, {
                status: false,
                erro: 'Informe o time usando ?time=NomeDoTime.'
            });
            return true;
        }

        try {
            const dados = await futebol.ondeAssistir(time);
            responderJson(res, 200, dados);
        } catch (erro) {
            responderJson(res, 502, {
                status: false,
                erro: 'Não foi possível consultar onde assistir.'
            });
        }
        return true;
    }

    const rotas = {
        '/api/futebol/assistir': 'ondeAssistir'
    };

    if (rotas[url.pathname]) {
        responderJson(res, 503, {
            status: false,
            recurso: rotas[url.pathname],
            erro: 'Fonte esportiva ainda não configurada.'
        });
        return true;
    }

    responderJson(res, 404, {
        status: false,
        erro: 'Rota de futebol não encontrada.'
    });

    return true;
}

module.exports = rotaFutebol;
