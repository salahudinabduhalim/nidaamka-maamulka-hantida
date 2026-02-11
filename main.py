import uvicorn
import os
import sys
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import SQLModel, Session, select

# Ensure backend folder is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, get_session, create_db_and_tables
from models import User, Item, Activity
from auth import verify_password, get_password_hash, create_access_token

app = FastAPI(title="Warehouse Management API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Create initial user if not exists
    with Session(engine) as session:
        initial_users = [
            User(username="maxamed", password_hash=get_password_hash("maxamed123"), name="Mudane Wasiir Maxamed Sh. Aden", role="wasiir"),
            User(username="abdinur", password_hash=get_password_hash("abdinur123"), name="Abdinur Abdulahi Ali", role="agaasime"),
            User(username="salah", password_hash=get_password_hash("salah123"), name="Salah Abdi Ismail", role="storekeeper"),
            User(username="admin", password_hash=get_password_hash("admin123"), name="System Administrator", role="wasiir"),
        ]
        for u in initial_users:
            statement = select(User).where(User.username == u.username)
            if not session.exec(statement).first():
                session.add(u)
        session.commit()

# --- Serve Static Files ---
current_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(current_dir, "index.html")):
    # Flat structure (GitHub/Render)
    static_dir = current_dir
else:
    # Nested structure (Local backend folder)
    static_dir = os.path.abspath(os.path.join(current_dir, ".."))

app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def read_index():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.get("/login")
def read_login():
    return FileResponse(os.path.join(static_dir, "login.html"))

# Special case for other top-level files if needed, but mount /static covers assets
@app.get("/{filename}")
def read_file(filename: str):
    file_path = os.path.join(static_dir, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404)

# --- Auth Endpoints ---
@app.post("/api/login")
def login(data: dict, session: Session = Depends(get_session)):
    username = data.get("username")
    password = data.get("password")
    
    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()
    
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "name": user.name,
            "role": user.role,
            "username": user.username
        }
    }

# --- Inventory Endpoints ---
@app.get("/api/items", response_model=List[Item])
def get_items(session: Session = Depends(get_session)):
    return session.exec(select(Item)).all()

@app.post("/api/items", response_model=Item)
def create_item(item: Item, session: Session = Depends(get_session)):
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

# --- Activity Endpoints ---
@app.get("/api/activities", response_model=List[Activity])
def get_activities(session: Session = Depends(get_session)):
    return session.exec(select(Activity)).all()

@app.post("/api/activities", response_model=Activity)
def create_activity(activity: Activity, session: Session = Depends(get_session)):
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity

@app.patch("/api/activities/{activity_id}")
def update_activity_status(activity_id: int, data: dict, session: Session = Depends(get_session)):
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    if "status" in data:
        activity.status = data["status"]
    
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity

# --- User Endpoints ---
@app.get("/api/users", response_model=List[User])
def get_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()

@app.post("/api/migrate-users")
def migrate_users(users: List[dict], session: Session = Depends(get_session)):
    for u_data in users:
        # Check if user already exists
        statement = select(User).where(User.username == u_data["username"])
        existing = session.exec(statement).first()
        if not existing:
            new_user = User(
                username=u_data["username"],
                password_hash=get_password_hash(u_data.get("password", "change_me")),
                name=u_data.get("name", u_data["username"]),
                role=u_data.get("role", "storekeeper"),
                status=u_data.get("status", "Active")
            )
            session.add(new_user)
    session.commit()
    return {"status": "success", "message": "Users migrated successfully"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
