from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    __tablename__ = "wh_users"
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    name: str
    role: str  # 'wasiir', 'agaasime', 'storekeeper'
    status: str = "Active"

class Item(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    category: str = Field(index=True)

class Activity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: str  # format dd/mm/yyyy
    action: str
    item_category: Optional[str] = None
    recipient: str
    user: str
    comment: Optional[str] = None
    status: str = "Approved" # Default for old, "Pending" for new storekeeper entries
    created_at: datetime = Field(default_factory=datetime.utcnow)
