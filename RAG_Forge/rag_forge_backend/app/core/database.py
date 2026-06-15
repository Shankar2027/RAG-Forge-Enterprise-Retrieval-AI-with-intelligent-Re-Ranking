"""
RAG Forge – Database Configuration Layer
Supports dynamic switching between local SQLite and Production PostgreSQL.
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings

# 1. Define the base for your ORM models
class Base(DeclarativeBase):
    pass

# 2. Dynamic Engine Configuration
database_url = settings.database_url

if database_url.startswith("postgres"):
    # Translate to asyncpg for production performance
    if "asyncpg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    
    # Configure the engine to be fully compatible with transaction-mode pooling (PgBouncer)
    engine = create_async_engine(
        database_url,
        poolclass=NullPool,  # The critical fix: disable SQLAlchemy's internal connection pool
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0
        },
        echo=settings.debug
    )
else:
    # Ensure local SQLite uses the correct async driver
    if database_url.startswith("sqlite") and "aiosqlite" not in database_url:
        database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    # SQLite configuration
    engine = create_async_engine(
        database_url,
        connect_args={"check_same_thread": False},
        echo=settings.debug
    )

# 3. Session Factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# 4. Table Initialization Utility
async def init_db() -> None:
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# 5. Dependency Injection Provider
async def get_db():
    """Provides an isolated database session for every request."""
    # The 'async with' block automatically closes the session when the request finishes
    # and safely rolls back if an unhandled exception occurs.
    async with AsyncSessionLocal() as session:
        yield session