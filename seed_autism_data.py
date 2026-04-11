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
    # Educational Materials
    {"name": "Language material", "category": "Autism Materials", "qty": 10},
    {"name": "Mathematics material", "category": "Autism Materials", "qty": 10},
    {"name": "Sensorial material", "category": "Autism Materials", "qty": 10},
    {"name": "Practical material", "category": "Autism Materials", "qty": 10},
    {"name": "Geography material", "category": "Autism Materials", "qty": 10},
    {"name": "Abacas (Color Balls)", "category": "Autism Materials", "qty": 50},
    {"name": "Brailles", "category": "Autism Materials", "qty": 20},
    
    # Electronics
    {"name": "Television", "category": "Electronics", "qty": 6},
    {"name": "Printer", "category": "Electronics", "qty": 4},
    {"name": "Photocopy", "category": "Electronics", "qty": 2},
    {"name": "CCTV Camera", "category": "Electronics", "qty": 10},

    # Furniture
    {"name": "Arabian Sofa", "category": "Furniture", "qty": 6},
    {"name": "Office table", "category": "Furniture", "qty": 2},
    {"name": "Office chair", "category": "Furniture", "qty": 2},
    {"name": "Teacher desks", "category": "Furniture", "qty": 10},
    {"name": "Teacher chairs", "category": "Furniture", "qty": 10},
    {"name": "Open shelves", "category": "Furniture", "qty": 10},
    {"name": "Student tables and chairs for KGs students", "category": "Furniture", "qty": 40},
    {"name": "Student tables and chairs for Grade 1 students", "category": "Furniture", "qty": 20},
    {"name": "Student chairs for older special need students", "category": "Furniture", "qty": 20},
    {"name": "White boards", "category": "Furniture", "qty": 10},

    # Special Equipment & Others
    {"name": "Soft Matts", "category": "Special Equipment", "qty": 15},
    {"name": "Wheelchairs", "category": "Special Equipment", "qty": 10},

    # Playground Equipment
    {"name": "Seesaws/ two seat Small", "category": "Playground Equipment", "qty": 1},
    {"name": "Sliders", "category": "Playground Equipment", "qty": 4},
    {"name": "Tunnel", "category": "Playground Equipment", "qty": 2},
    {"name": "Swing Set (2 Person)", "category": "Playground Equipment", "qty": 1},
    {"name": "Monkey Bars", "category": "Playground Equipment", "qty": 1},
    {"name": "Merry go round", "category": "Playground Equipment", "qty": 2},
]

def seed_autism_data():
    today = datetime.now().strftime("%d/%m/%Y")
    with Session(engine) as session:
        print("Seeding new Autism School Equipment data...")
        
        # Update existing records to correct the supplier name
        existing_acts = session.exec(select(Activity).where(Activity.comment == "Autism School Equipment Data Entry")).all()
        for act in existing_acts:
            changed = False
            if act.recipient == "Xafiiska Waxbarashada":
                act.recipient = "mohamed whole sale"
                changed = True
            if act.user == "System Admin":
                act.user = "Salah Abdi Ismail"
                changed = True
                
            if changed:
                session.add(act)
        session.commit()

        for item_data in items_to_add:
            # Check if item exists to avoid duplication
            existing_item = session.exec(select(Item).where(Item.name == item_data["name"])).first()
            if not existing_item:
                item = Item(name=item_data["name"], category=item_data["category"])
                session.add(item)
                session.commit()
                session.refresh(item)
            
            # Add Inbound Activity only if it wasn't added before
            existing_act = session.exec(select(Activity).where(Activity.comment == "Autism School Equipment Data Entry").where(Activity.action == f"Geliyay: {item_data['qty']} {item_data['name']}")).first()
            if not existing_act:
                activity = Activity(
                    date=today,
                    action=f"Geliyay: {item_data['qty']} {item_data['name']}",
                    item_category=item_data["category"],
                    recipient="mohamed whole sale",
                    user="Salah Abdi Ismail",
                    comment="Autism School Equipment Data Entry",
                    status="Pending"
                )
                session.add(activity)
            
        session.commit()
    print(f"Successfully added {len(items_to_add)} Autism equipment items.")

if __name__ == "__main__":
    seed_autism_data()
