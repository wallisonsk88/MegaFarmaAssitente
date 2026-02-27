const https = require('https');

https.get('https://meucomercio.com.br/megafarmacodo', (res) => {
    let html = '';
    res.on('data', c => html += c);
    res.on('end', () => {
        const buildIdMatch = html.match(/"buildId":"([^"]+)"/);
        if (!buildIdMatch) return console.log("Build ID não encontrado");

        const buildId = buildIdMatch[1];
        console.log("Build ID:", buildId);

        const url = `https://meucomercio.com.br/_next/data/${buildId}/megafarmacodo.json?search=dipirona&store=megafarmacodo`;
        https.get(url, (res2) => {
            let jsonStr = '';
            res2.on('data', c => jsonStr += c);
            res2.on('end', () => {
                const data = JSON.parse(jsonStr);
                console.log("Produtos:", data.pageProps.products.length);
                data.pageProps.products.slice(0, 3).forEach(p => console.log(p.ProductName, p.SalePrice));
            });
        });
    });
});
