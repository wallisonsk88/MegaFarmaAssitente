const https = require('https');

const options = {
    hostname: 'meucomercio.com.br',
    port: 443,
    path: '/_next/data/EMFjW4z4mlt2fHuV4Lwpw/megafarmacodo.json?search=dipirona&store=megafarmacodo',
    method: 'GET',
    headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0'
    }
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const products = json.pageProps.products || [];
            console.log("Produtos Next Data:", products.length);
            products.slice(0, 3).forEach(p => console.log(p.ProductName, p.PromoSalePrice || p.SalePrice));
        } catch (e) {
            console.log("Parsing error:", e.message);
            console.log(data);
        }
    })
});
req.on('error', e => console.log(e));
req.end();
