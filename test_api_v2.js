const https = require('https');

const options = {
    hostname: 'api.meucomercio.com.br',
    port: 443,
    path: '/api/v1/store/megafarmacodo/products?categorySlug=&subCategory=&search=dipirona&lowStock=false&stockControl=false&sort=ProductName&page=1&perPage=20&onlyPromo=false&sortFilter=A-Z',
    method: 'GET',
    headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://meucomercio.com.br',
        'Referer': 'https://meucomercio.com.br/'
    }
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            console.log("Status:", res.statusCode);
            const json = JSON.parse(data);
            console.log("Found:", json.products ? json.products.length : 0);
            if (json.products) {
                json.products.slice(0, 3).forEach(p => console.log(p.ProductName, p.SalePrice));
            }
        } catch (e) {
            console.log("Parsing error:", e.message);
            console.log(data.substring(0, 200));
        }
    })
});
req.on('error', e => console.log(e));
req.end();
