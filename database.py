from sqlmodel import SQLModel, create_engine, Session
import os

# Database URL format
DATABASE_URL = os.getenv("DATABASE_URL")

# Render sometimes uses "postgres://" which SQLModel/SQLAlchemy doesn't like.
# We only replace it if it's NOT already "postgresql://"
if DATABASE_URL and DATABASE_URL.startswith("postgres://") and not DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    # Fallback to SQLite for local development
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, "test_warehouse.db")
    DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

