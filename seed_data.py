from sqlmodel import Session, select
from datetime import datetime
import sys
import os

# Ensure backend folder is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from database import engine
from models import Item, Activity

items_to_add = [
    # Electronics
    {"name": "Television", "category": "Electronics", "qty": 3},
    {"name": "Desktop", "category": "Electronics", "qty": 3},
    {"name": "Printer", "category": "Electronics", "qty": 3},
    {"name": "Laptop", "category": "Electronics", "qty": 5},
    {"name": "LCD Projector", "category": "Electronics", "qty": 3},
    {"name": "Tape Player", "category": "Electronics", "qty": 3},
    {"name": "Voice Recorder", "category": "Electronics", "qty": 3},
    
    # Furniture
    {"name": "Shelves", "category": "Furniture", "qty": 3},
    {"name": "Chair", "category": "Furniture", "qty": 15},
    {"name": "Table", "category": "Furniture", "qty": 3},
    {"name": "Cupboard", "category": "Furniture", "qty": 20},
    {"name": "Mattress", "category": "Furniture", "qty": 80},
    
    # Special Education
    {"name": "White Cane", "category": "Special Education", "qty": 15},
    {"name": "Slate and Stylus", "category": "Special Education", "qty": 15},
    {"name": "Sign Language Materials", "category": "Special Education", "qty": 6},
    {"name": "Abacus", "category": "Special Education", "qty": 15},
    {"name": "Magnifier", "category": "Special Education", "qty": 15},
    
    # Stationary
    {"name": "Braille Paper", "category": "Stationary", "qty": 9},
    {"name": "Flipchart Paper", "category": "Stationary", "qty": 3},
    {"name": "Marker", "category": "Stationary", "qty": 6},
    {"name": "Registration Book", "category": "Stationary", "qty": 100},
    {"name": "Flipchart", "category": "Stationary", "qty": 100},
    
    # Hygiene & Health
    {"name": "First Aid Kits", "category": "Hygiene & Health", "qty": 3},
    {"name": "Disposable Sanitary Pads", "category": "Hygiene & Health", "qty": 700},
    {"name": "Reusable Cloth Pads", "category": "Hygiene & Health", "qty": 600},
    {"name": "Body Soap", "category": "Hygiene & Health", "qty": 80},
    {"name": "Laundry Soap", "category": "Hygiene & Health", "qty": 80},
    {"name": "Gloves", "category": "Hygiene & Health", "qty": 100},
    
    # Cleaning & Utility
    {"name": "Pedestal Garbage Bin", "category": "Cleaning & Utility", "qty": 100},
    {"name": "Mop", "category": "Cleaning & Utility", "qty": 100},
    {"name": "Broom", "category": "Cleaning & Utility", "qty": 100},
    {"name": "Purchase Local Mat", "category": "Cleaning & Utility", "qty": 100},
    
    # Textiles & Clothing
    {"name": "Bed Sheet", "category": "Textiles & Clothing", "qty": 80},
    {"name": "Pants", "category": "Textiles & Clothing", "qty": 400},
    
    # Books
    {"name": "Social Science Grade 7", "category": "Books", "qty": 15000},
    {"name": "Citizenship Grade 7", "category": "Books", "qty": 15000},
    {"name": "English Grade 7", "category": "Books", "qty": 19000},
]

def seed():
    today = datetime.now().strftime("%d/%m/%Y")
    with Session(engine) as session:
        # Clear existing data
        print("Clearing existing Items and Activities...")
        session.exec(select(Item)).all() # Ensure metadata is loaded if needed
        session.exec(Item.__table__.delete())
        session.exec(Activity.__table__.delete())
        session.commit()
        
        print("Seeding new data...")
        for item_data in items_to_add:
            # Create item
            item = Item(name=item_data["name"], category=item_data["category"])
            session.add(item)
            session.commit()
            session.refresh(item)
            
            # Add Inbound Activity
            activity = Activity(
                date=today,
                action=f"Geliyay: {item_data['qty']} {item_data['name']}",
                item_category=item_data["category"],
                recipient="Xafiiska Waxbarashada",
                user="System Admin",
                comment="Bulk Data Entry (Special Needs & Gender)",
                status="Approved"
            )
            session.add(activity)
            
        session.commit()
    print(f"Successfully reset database and added {len(items_to_add)} items.")

if __name__ == "__main__":
    seed()
