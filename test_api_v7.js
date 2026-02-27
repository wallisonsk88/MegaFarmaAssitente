const https = require('https');

const options = {
    hostname: 'meucomercio.com.br',
    port: 443,
    path: '/api/product/shop/1673173/products?page=1&perPage=20&search=dipirona',
    method: 'GET',
    headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Host': 'meucomercio.com.br'
    }
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const products = json.products || [];
            console.log("Encontrados:", products.length);
            products.slice(0, 5).forEach(p => console.log(p.ProductName, " | Promo:", p.PromoSalePrice, "| Sale:", p.SalePrice));
        } catch (e) {
            console.log("Erro parse:", e.message);
        }
    })
});
req.on('error', e => console.log(e));
req.end();
