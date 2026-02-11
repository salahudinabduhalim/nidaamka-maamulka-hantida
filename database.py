from sqlmodel import SQLModel, create_engine, Session
import os

# Database URL format: "postgresql://user:password@host:port/database"
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback to SQLite for local development/testing if no URL provided
    sqlite_file_name = "test_warehouse.db"
    DATABASE_URL = f"sqlite:///backend/{sqlite_file_name}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
