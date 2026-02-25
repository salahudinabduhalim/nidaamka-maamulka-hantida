from sqlmodel import SQLModel, create_engine, Session
import os

# Database URL format: "postgresql://user:password@host:port/database"
DATABASE_URL = os.getenv("DATABASE_URL")

# Render sometimes uses "postgres://" which SQLModel/SQLAlchemy doesn't like.
# We only replace it if it's NOT already "postgresql://"
if DATABASE_URL and DATABASE_URL.startswith("postgres://") and not DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is NOT set. PostgreSQL is mandatory.")

engine = create_engine(DATABASE_URL)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
