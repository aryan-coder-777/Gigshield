import sqlite3
from datetime import datetime
from pathlib import Path

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings
from app.core.logger import db_logger


def _get_sqlite_path() -> Path | None:
    url = make_url(settings.DATABASE_URL)
    if url.get_backend_name() != "sqlite" or not url.database:
        return None
    return Path(url.database).resolve()


def _archive_corrupt_sqlite(path: Path) -> None:
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    if path.exists():
        dest = path.with_name(f"{path.stem}.corrupt-{timestamp}{path.suffix}")
        path.replace(dest)
        db_logger.warning(f"Archived corrupt SQLite database", extra={"dest": str(dest)})
    journal_path = path.parent / f"{path.name}-journal"
    if journal_path.exists():
        journal_path.replace(path.parent / f"{journal_path.name}.corrupt-{timestamp}")


def ensure_sqlite_database() -> None:
    db_path = _get_sqlite_path()
    if db_path is None:
        return

    db_path.parent.mkdir(parents=True, exist_ok=True)
    if not db_path.exists():
        db_logger.info(f"SQLite database will be created at startup", extra={"path": str(db_path)})
        return

    connection = None
    try:
        connection = sqlite3.connect(db_path)
        integrity = connection.execute("PRAGMA integrity_check").fetchone()
        if not integrity or integrity[0] != "ok":
            raise sqlite3.DatabaseError(f"Integrity check failed: {integrity}")
        db_logger.info("SQLite integrity check passed", extra={"path": str(db_path)})
    except sqlite3.Error as e:
        db_logger.error(f"SQLite integrity check failed — archiving", extra={"error": str(e)})
        if connection is not None:
            connection.close()
        _archive_corrupt_sqlite(db_path)
    else:
        connection.close()


# ── Engine creation — supports both SQLite and PostgreSQL ──────────────────────

def _create_engine():
    url = settings.DATABASE_URL

    if settings.is_postgres:
        # PostgreSQL via asyncpg — no SQLite-specific connect_args
        db_logger.info("Using PostgreSQL database", extra={"url_hint": url[:40] + "..."})
        return create_async_engine(
            url,
            echo=settings.DEBUG,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
        )
    else:
        # SQLite via aiosqlite
        ensure_sqlite_database()
        db_path = _get_sqlite_path()
        db_logger.info("Using SQLite database", extra={"path": str(db_path)})
        return create_async_engine(
            url,
            echo=settings.DEBUG,
            connect_args={"check_same_thread": False, "timeout": 30},
        )


engine = _create_engine()

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def _sqlite_add_column_if_missing(table: str, column: str, col_type: str) -> None:
    """Lightweight schema migration for SQLite (no Alembic in hackathon stack)."""
    db_path = _get_sqlite_path()
    if db_path is None or not db_path.exists():
        return
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.cursor()
        cur.execute(f"PRAGMA table_info({table})")
        names = {row[1] for row in cur.fetchall()}
        if column not in names:
            cur.execute(f'ALTER TABLE {table} ADD COLUMN {column} {col_type}')
            conn.commit()
            db_logger.info(f"SQLite migration: added column", extra={"table": table, "column": column})
    finally:
        conn.close()


async def create_tables():
    """Create all tables on startup. Works for both SQLite and PostgreSQL."""
    from app.models import worker, policy, claim, payout, trigger_event  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    db_logger.info("All database tables created/verified")

    # SQLite-only lightweight migrations
    if settings.is_sqlite:
        _sqlite_add_column_if_missing("payouts", "payment_rail", "VARCHAR(30) DEFAULT 'UPI'")
        _sqlite_add_column_if_missing("payouts", "stripe_payment_intent_id", "VARCHAR(100)")
