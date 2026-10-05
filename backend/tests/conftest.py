"""Configuración de pytest: agrega la carpeta backend/ al path para importar los módulos."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
