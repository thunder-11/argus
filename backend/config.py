import os
from dotenv import load_dotenv

load_dotenv()

# ── Database ──────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cfas.db")

# ── JWT Auth ──────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "cfas-hackathon-secret-key-change-in-prod-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# ── Blockchain API Keys (plug in when available) ──────────
# Set these in a .env file or environment variables:
#   ETHERSCAN_API_KEY=your_key_here
#   TRONGRID_API_KEY=your_key_here
#   BSCSCAN_API_KEY=your_key_here
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY", "")
TRONGRID_API_KEY = os.getenv("TRONGRID_API_KEY", "")
BSCSCAN_API_KEY = os.getenv("BSCSCAN_API_KEY", "")

# When API keys are empty, the system uses synthetic demo data
USE_DEMO_DATA = not any([ETHERSCAN_API_KEY, TRONGRID_API_KEY, BSCSCAN_API_KEY])

# ── API Base URLs ─────────────────────────────────────────
ETHERSCAN_BASE_URL = "https://api.etherscan.io/api"
TRONGRID_BASE_URL = "https://api.trongrid.io"
BSCSCAN_BASE_URL = "https://api.bscscan.com/api"
BLOCKSTREAM_BASE_URL = "https://blockstream.info/api"

# ── Tracing Defaults ─────────────────────────────────────
DEFAULT_MAX_HOPS = 4
MAX_HOP_LIMIT = 6
MIN_AMOUNT_FILTER_USD = 50.0
TX_CACHE_TTL_HOURS = 6

# ── Risk Scoring Weights ─────────────────────────────────
RISK_WEIGHT_MIXER = 30
RISK_WEIGHT_BRIDGE = 20
RISK_WEIGHT_HIGH_VELOCITY = 15
RISK_WEIGHT_PEELING = 15
RISK_WEIGHT_BURNER = 10
RISK_WEIGHT_MULTI_COMPLAINT = 10

# ── Syndicate Detection ──────────────────────────────────
SYNDICATE_THRESHOLD = 3

# ── Report Generation ────────────────────────────────────
REPORTS_DIR = os.getenv("REPORTS_DIR", "./reports")
NOTICES_DIR = os.getenv("NOTICES_DIR", "./notices")
