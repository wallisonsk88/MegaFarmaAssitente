# Assistente Digital MegaFarma 💊

Sistema web de assistente de orientação em saúde para farmácia, projetado para rodar em modo kiosk (tela cheia) em tablets.

## 🚀 Instalação e Execução

### 1. Instalar dependências

```bash
pip install -r requirements.txt
```

### 2. Configurar IA

Edite `config.json` na raiz ou use a interface (ícone ⚙️):

```json
{
  "API_KEY": "sua-chave-aqui",
  "MODEL_NAME": "meta-llama/llama-4-scout-17b-16e-instruct:free",
  "MODEL_PROVIDER": "openrouter"
}
```

**Provedores suportados:** `openrouter`, `groq`, `huggingface`

### 3. Rodar o servidor

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

Acesse: **http://localhost:8000**

---

## 🖥️ Deploy em VPS (Produção)

### 1. Instalar no servidor

```bash
sudo apt update && sudo apt install python3-pip nginx certbot python3-certbot-nginx -y
git clone <repo> /opt/megafarma
cd /opt/megafarma
pip install -r requirements.txt
```

### 2. Criar serviço systemd

```bash
sudo tee /etc/systemd/system/megafarma.service <<EOF
[Unit]
Description=Assistente Digital MegaFarma
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/megafarma/backend
ExecStart=/usr/local/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now megafarma
```

### 3. Configurar Nginx + HTTPS

```nginx
server {
    listen 80;
    server_name seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo certbot --nginx -d seudominio.com
```

### 4. Modo Kiosk no Tablet

**Android (Chrome):**
```
chrome --kiosk --disable-session-crashed-bubble https://seudominio.com
```

Ou use um app como **Fully Kiosk Browser** para controle total.

**iPad:**
1. Abra o Safari → seu site
2. "Adicionar à Tela Inicial"
3. Ative Acesso Guiado em: Ajustes → Acessibilidade → Acesso Guiado

---

## 📁 Estrutura

```
/backend
  main.py              # FastAPI app
  config.py            # Gerenciamento de configuração
  /services
    ai_provider.py     # Provedores de IA (OpenRouter, Groq, HF)

/frontend
  index.html           # Interface principal
  style.css            # Estilos
  app.js               # Lógica do app
  manifest.json        # PWA manifest
  sw.js                # Service Worker

config.json            # Configuração de IA
requirements.txt       # Dependências Python
```

## ⚠️ Aviso Legal

Este assistente fornece apenas orientações gerais. Não substitui consulta médica.
