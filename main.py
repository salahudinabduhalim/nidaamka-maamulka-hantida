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
    from sqlalchemy import text
    create_db_and_tables()
    with Session(engine) as session:
        # 1. Seed Users (if none exist)
        if not session.exec(select(User)).first():
            initial_users = [
                User(username="maxamed", password_hash=get_password_hash("maxamed123"), name="Mudane Wasiir Maxamed Sh. Aden", role="wasiir"),
                User(username="abdinur", password_hash=get_password_hash("abdinur123"), name="Abdinur Abdulahi Ali", role="agaasime"),
                User(username="salah", password_hash=get_password_hash("salah123"), name="Salah Abdi Ismail", role="storekeeper"),
                User(username="admin", password_hash=get_password_hash("admin123"), name="System Administrator", role="wasiir"),
            ]
            for u in initial_users:
                session.add(u)
            session.commit()

        # 2. Seed Bulk Items (only if database is empty)
        if not session.exec(select(Item)).first():
            from datetime import datetime
            today = datetime.now().strftime("%d/%m/%Y")
            
            items_to_add = [
                {"name": "Television", "category": "Electronics", "qty": 3},
                {"name": "Desktop", "category": "Electronics", "qty": 3},
                {"name": "Printer", "category": "Electronics", "qty": 3},
                {"name": "Laptop", "category": "Electronics", "qty": 5},
                {"name": "LCD Projector", "category": "Electronics", "qty": 3},
                {"name": "Tape Player", "category": "Electronics", "qty": 3},
                {"name": "Voice Recorder", "category": "Electronics", "qty": 3},
                {"name": "Shelves", "category": "Furniture", "qty": 3},
                {"name": "Chair", "category": "Furniture", "qty": 15},
                {"name": "Table", "category": "Furniture", "qty": 3},
                {"name": "Cupboard", "category": "Furniture", "qty": 20},
                {"name": "Mattress", "category": "Furniture", "qty": 80},
                {"name": "White Cane", "category": "Special Education", "qty": 15},
                {"name": "Slate and Stylus", "category": "Special Education", "qty": 15},
                {"name": "Sign Language Materials", "category": "Special Education", "qty": 6},
                {"name": "Abacus", "category": "Special Education", "qty": 15},
                {"name": "Magnifier", "category": "Special Education", "qty": 15},
                {"name": "Braille Paper", "category": "Stationary", "qty": 9},
                {"name": "Flipchart Paper", "category": "Stationary", "qty": 3},
                {"name": "Marker", "category": "Stationary", "qty": 6},
                {"name": "Registration Book", "category": "Stationary", "qty": 100},
                {"name": "Flipchart", "category": "Stationary", "qty": 100},
                {"name": "First Aid Kits", "category": "Hygiene & Health", "qty": 3},
                {"name": "Disposable Sanitary Pads", "category": "Hygiene & Health", "qty": 700},
                {"name": "Reusable Cloth Pads", "category": "Hygiene & Health", "qty": 600},
                {"name": "Body Soap", "category": "Hygiene & Health", "qty": 80},
                {"name": "Laundry Soap", "category": "Hygiene & Health", "qty": 80},
                {"name": "Gloves", "category": "Hygiene & Health", "qty": 100},
                {"name": "Pedestal Garbage Bin", "category": "Cleaning & Utility", "qty": 100},
                {"name": "Mop", "category": "Cleaning & Utility", "qty": 100},
                {"name": "Broom", "category": "Cleaning & Utility", "qty": 100},
                {"name": "Purchase Local Mat", "category": "Cleaning & Utility", "qty": 100},
                {"name": "Bed Sheet", "category": "Textiles & Clothing", "qty": 80},
                {"name": "Pants", "category": "Textiles & Clothing", "qty": 400},
                {"name": "Social Science Grade 7", "category": "Books", "qty": 15000},
                {"name": "Citizenship Grade 7", "category": "Books", "qty": 15000},
                {"name": "English Grade 7", "category": "Books", "qty": 19000},
            ]

            for item_data in items_to_add:
                item = Item(name=item_data["name"], category=item_data["category"])
                session.add(item)
                session.commit()
                session.refresh(item)
                
                activity = Activity(
                    date=today,
                    action=f"Geliyay: {item_data['qty']} {item_data['name']}",
                    item_category=item_data["category"],
                    recipient="Xafiiska Waxbarashada",
                    user="System Admin",
                    comment="Bulk Seeding (Fixed List)",
                    status="Approved"
                )
                session.add(activity)
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

@app.post("/api/users", response_model=User)
def create_user(user_data: dict, session: Session = Depends(get_session)):
    # Check if user already exists
    statement = select(User).where(User.username == user_data["username"])
    if session.exec(statement).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    new_user = User(
        username=user_data["username"],
        password_hash=get_password_hash(user_data.get("password", "change_me")),
        name=user_data.get("name"),
        role=user_data.get("role", "storekeeper"),
        status=user_data.get("status", "Active")
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@app.patch("/api/users/{user_id}", response_model=User)
def update_user(user_id: int, data: dict, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if "username" in data and data["username"]:
        user.username = data["username"]
    if "name" in data:
        user.name = data["name"]
    if "role" in data:
        user.role = data["role"]
    if "status" in data:
        user.status = data["status"]
    if "password" in data and data["password"]:
        user.password_hash = get_password_hash(data["password"])
    
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    session.delete(user)
    session.commit()
    return {"status": "success", "message": "User deleted successfully"}

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
