"""
GigShield — Structured Logging System
======================================
Provides color-coded, leveled, structured console logging for all services.
Each module gets its own named logger via `get_logger(__name__)`.
"""
import logging
import sys
from typing import Optional

# ANSI color codes for terminal output
_COLORS = {
    "DEBUG":    "\033[36m",   # Cyan
    "INFO":     "\033[32m",   # Green
    "WARNING":  "\033[33m",   # Yellow
    "ERROR":    "\033[31m",   # Red
    "CRITICAL": "\033[35m",   # Magenta
    "RESET":    "\033[0m",
    "BOLD":     "\033[1m",
    "DIM":      "\033[2m",
    "WHITE":    "\033[37m",
    "BLUE":     "\033[34m",
}


class GigShieldFormatter(logging.Formatter):
    """
    Custom formatter that outputs structured, color-coded log lines.
    Format: [LEVEL] timestamp | module | message {key=value ...}
    """

    LEVEL_STYLES = {
        "DEBUG":    _COLORS["DIM"] + _COLORS["BLUE"],
        "INFO":     _COLORS["GREEN"] if "GREEN" in _COLORS else _COLORS["INFO"],
        "WARNING":  _COLORS["WARNING"],
        "ERROR":    _COLORS["ERROR"],
        "CRITICAL": _COLORS["BOLD"] + _COLORS["CRITICAL"],
    }

    def format(self, record: logging.LogRecord) -> str:
        level = record.levelname
        color = self.LEVEL_STYLES.get(level, "")
        reset = _COLORS["RESET"]
        bold = _COLORS["BOLD"]
        dim = _COLORS["DIM"]

        # Timestamp — short format
        ts = self.formatTime(record, datefmt="%H:%M:%S")

        # Module name — trim to last 2 segments
        name_parts = record.name.split(".")
        short_name = ".".join(name_parts[-2:]) if len(name_parts) > 1 else record.name

        # Level badge
        level_badge = f"{color}{bold}[{level[:4]}]{reset}"

        # Compose message
        msg = record.getMessage()

        # Extract structured fields if passed via `extra`
        extras = ""
        skip = {"name", "msg", "args", "levelname", "levelno", "pathname",
                 "filename", "module", "exc_info", "exc_text", "stack_info",
                 "lineno", "funcName", "created", "msecs", "relativeCreated",
                 "thread", "threadName", "processName", "process", "taskName",
                 "message"}
        kv_parts = []
        for k, v in record.__dict__.items():
            if k not in skip and not k.startswith("_"):
                kv_parts.append(f"{dim}{k}{reset}={color}{v}{reset}")
        if kv_parts:
            extras = "  " + "  ".join(kv_parts)

        return (
            f"{dim}{ts}{reset}  "
            f"{level_badge}  "
            f"{bold}{short_name}{reset}  "
            f"{msg}"
            f"{extras}"
        )


def _build_handler() -> logging.StreamHandler:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(GigShieldFormatter())
    return handler


_handler = _build_handler()

# Root GigShield logger — all child loggers inherit this
_root_logger = logging.getLogger("gigshield")
_root_logger.setLevel(logging.DEBUG)
if not _root_logger.handlers:
    _root_logger.addHandler(_handler)
_root_logger.propagate = False


def get_logger(name: str) -> logging.Logger:
    """
    Get a named logger under the gigshield hierarchy.
    Usage:
        from app.core.logger import get_logger
        logger = get_logger(__name__)
        logger.info("Policy created", extra={"worker_id": 42, "plan": "Premium"})
    """
    # Map module names like "app.services.payout" → "gigshield.services.payout"
    mapped = name.replace("app.", "gigshield.", 1) if name.startswith("app.") else f"gigshield.{name}"
    child = logging.getLogger(mapped)
    if not child.handlers:
        child.addHandler(_handler)
    child.propagate = False
    return child


# Pre-built loggers for commonly-used services
api_logger      = get_logger("app.api")
service_logger  = get_logger("app.services")
db_logger       = get_logger("app.core.database")
fraud_logger    = get_logger("app.services.fraud")
payout_logger   = get_logger("app.services.payout")
trigger_logger  = get_logger("app.services.trigger")
premium_logger  = get_logger("app.services.premium")
startup_logger  = get_logger("app.startup")
