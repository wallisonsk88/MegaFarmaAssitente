const https = require('https');

const options = {
    hostname: 'meucomercio.com.br',
    port: 443,
    path: '/megafarmacodo?search=dipirona',
    method: 'GET',
    headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
};

const req = https.request(options, res => {
    let html = '';
    res.on('data', chunk => html += chunk);
    res.on('end', () => {
        // Tenta encontrar window.__N_SSP ou script id="__NEXT_DATA__"
        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (match) {
            try {
                const data = JSON.parse(match[1]);
                const products = data.props.pageProps.products || data.props.pageProps.initialState?.products || [];
                console.log("Produtos encontrados via NextJS HTML:", products.length);
                products.slice(0, 3).forEach(p => console.log(p.ProductName, p.SalePrice));
            } catch (e) {
                console.log("Erro de parse");
            }
        } else {
            console.log("NEXT_DATA não encontrado. Tamanho do HTML:", html.length);
        }
    })
});
req.on('error', e => console.log(e));
req.end();
