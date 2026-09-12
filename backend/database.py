from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool
from config import DATABASE_URL

engine_options = {
    "connect_args": {"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    "echo": False,
}
if DATABASE_URL in {"sqlite://", "sqlite:///:memory:"}:
    engine_options["poolclass"] = StaticPool

engine = create_engine(DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Call once at startup."""
    import models  # noqa: F401 — registers models with Base
    import app.persistence.models  # noqa: F401 — local/test schema registration
    Base.metadata.create_all(bind=engine)
