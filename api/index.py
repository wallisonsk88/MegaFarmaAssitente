import os
import sys

# Adiciona o diretório 'backend' ao caminho do Python para que as importações funcionem
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, backend_path)

from backend.main import app
