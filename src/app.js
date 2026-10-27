require("./utilitarios/carregarAPIs")();
const http = require('http');
const rotaFutebol = require('./rotas/futebol');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3333);

function responderJson(res, status, dados) {
    const corpo = JSON.stringify(dados, null, 2);

    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(corpo)
    });

    res.end(corpo);
}

const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (await rotaFutebol(req, res, url, responderJson)) return;

    if (req.method === 'GET' && url.pathname === '/') {
        return responderJson(res, 200, {
            status: true,
            api: 'RAVEX-API',
            versao: '1.0.0',
            autor: 'Raphael Júnior',
            mensagem: 'RAVEX-API está online.'
        });
    }

    if (req.method === 'GET' && url.pathname === '/status') {
        return responderJson(res, 200, {
            status: true,
            servico: 'RAVEX-API',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
        });
    }

    return responderJson(res, 404, {
        status: false,
        erro: 'Rota não encontrada.'
    });
});

servidor.listen(PORT, HOST, () => {
    console.log('╭────────────────────────────╮');
    console.log('│       RAVEX-API ONLINE     │');
    console.log('╰────────────────────────────╯');
    console.log(`🌐 http://${HOST}:${PORT}`);
    console.log(`📦 Versão: 1.0.0`);
});
