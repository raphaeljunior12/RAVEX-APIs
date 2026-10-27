const futebolAPI = require('./provedores/futebolAPI');
const { listarCompeticoes } = require('./provedores/competicoes');

const SERVICO = 'RAVEX Futebol';

function obterStatus() {
    const fonte = futebolAPI.obterStatusSeguro();
    const disponivel = fonte.configurado;

    return {
        status: true,
        servico: SERVICO,
        versao: '1.0.0',
        fonte,
        recursos: {
            jogosHoje: disponivel,
            aoVivo: disponivel,
            buscarTime: disponivel,
            proximosJogos: disponivel,
            ondeAssistir: false
        },
        mensagem: disponivel
            ? 'Fonte esportiva configurada.'
            : 'Módulo de futebol carregado. Fonte esportiva ainda não configurada.'
    };
}

function dataLocalISO(data = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(data);
}

async function jogosHoje() {
    const hoje = dataLocalISO();
    const competicoes = listarCompeticoes();

    const resultados = await Promise.allSettled(
        competicoes.map(c => futebolAPI.buscarPartidas(c.id))
    );

    const jogos = [];
    let consultasOK = 0;
    let consultasFalharam = 0;

    for (const resultado of resultados) {
        if (resultado.status !== 'fulfilled') {
            consultasFalharam++;
            continue;
        }

        consultasOK++;

        for (const jogo of resultado.value) {
            if (!jogo.data) continue;

            const dataJogo = dataLocalISO(new Date(jogo.data));

            if (dataJogo === hoje) {
                jogos.push(jogo);
            }
        }
    }

    jogos.sort((a, b) => new Date(a.data) - new Date(b.data));

    return {
        status: true,
        data: hoje,
        total: jogos.length,
        consultas: {
            competicoes: competicoes.length,
            sucesso: consultasOK,
            falhas: consultasFalharam
        },
        jogos
    };
}

async function aoVivo() {
    const competicoes = listarCompeticoes();
    const resultados = await Promise.allSettled(
        competicoes.map(c => futebolAPI.buscarPartidas(c.id))
    );

    const jogos = [];
    let consultasOK = 0;
    let consultasFalharam = 0;

    for (const resultado of resultados) {
        if (resultado.status !== 'fulfilled') {
            consultasFalharam++;
            continue;
        }

        consultasOK++;
        jogos.push(...resultado.value.filter(jogo => jogo.estado === 'AO_VIVO'));
    }

    jogos.sort((a, b) => new Date(a.data) - new Date(b.data));

    return {
        status: true,
        total: jogos.length,
        consultas: {
            competicoes: competicoes.length,
            sucesso: consultasOK,
            falhas: consultasFalharam
        },
        jogos
    };
}

function normalizarTexto(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

async function buscarTime(nomeTime) {
    const busca = normalizarTexto(nomeTime);

    if (busca.length < 2) {
        throw new Error('Informe pelo menos 2 caracteres para buscar um time.');
    }

    const competicoes = listarCompeticoes();
    const resultados = await Promise.allSettled(
        competicoes.map(c => futebolAPI.buscarPartidas(c.id))
    );

    const encontrados = new Map();
    let consultasOK = 0;
    let consultasFalharam = 0;

    for (const resultado of resultados) {
        if (resultado.status !== 'fulfilled') {
            consultasFalharam++;
            continue;
        }

        consultasOK++;

        for (const jogo of resultado.value) {
            const casa = normalizarTexto(jogo.casa?.nome);
            const fora = normalizarTexto(jogo.fora?.nome);

            if (casa.includes(busca) || fora.includes(busca)) {
                encontrados.set(`${jogo.competicao.id}:${jogo.id}`, jogo);
            }
        }
    }

    const jogos = [...encontrados.values()]
        .sort((a, b) => new Date(a.data) - new Date(b.data));

    return {
        status: true,
        busca: String(nomeTime).trim(),
        total: jogos.length,
        consultas: {
            competicoes: competicoes.length,
            sucesso: consultasOK,
            falhas: consultasFalharam
        },
        jogos
    };
}

async function proximosJogos(nomeTime) {
    const resultado = await buscarTime(nomeTime);
    const agora = Date.now();

    const jogos = resultado.jogos
        .filter(jogo => {
            if (!jogo.data || jogo.finalizado) return false;
            const inicio = new Date(jogo.data).getTime();
            return Number.isFinite(inicio) && inicio > agora;
        })
        .sort((a, b) => new Date(a.data) - new Date(b.data));

    return {
        status: true,
        busca: resultado.busca,
        total: jogos.length,
        consultas: resultado.consultas,
        jogos
    };
}

async function ondeAssistir(nomeTime) {
    const busca = String(nomeTime || '').trim();

    if (busca.length < 2) {
        throw new Error('Informe o nome do time.');
    }

    const proximos = await proximosJogos(busca);
    const jogo = proximos.jogos[0] || null;

    return {
        status: true,
        busca,
        disponivel: false,
        jogo,
        transmissao: null,
        mensagem: jogo
            ? 'Ainda não há uma fonte oficial de transmissão configurada na RAVEX-API.'
            : 'Nenhum próximo jogo encontrado para consultar transmissão.'
    };
}

module.exports = {
    obterStatus,
    jogosHoje,
    aoVivo,
    buscarTime,
    proximosJogos,
    ondeAssistir
};
