import requests
import time

BASE_URL = "http://127.0.0.1:8000/api"

def test_flow():
    print("--- Starting API Logic Verification ---")
    
    # 1. Login
    print("\n1. Testing Login...")
    login_data = {"username": "salah", "password": "salah123"}
    try:
        response = requests.post(f"{BASE_URL}/login", json=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            print(f"PASS: Login successful. Token: {token[:20]}...")
        else:
            print(f"FAIL: Login failed. Status: {response.status_code}, Msg: {response.text}")
            return
    except Exception as e:
        print(f"FAIL: Connection error: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Users
    print("\n2. Testing Get Users...")
    response = requests.get(f"{BASE_URL}/users", headers=headers)
    if response.status_code == 200:
        users = response.json()
        print(f"PASS: Fetched {len(users)} users.")
    else:
        print(f"FAIL: Fetch users failed. Status: {response.status_code}")

    # 3. Create Item
    print("\n3. Testing Create Item...")
    item_data = {"name": "Logistics Truck 500", "category": "Vehicles"}
    response = requests.post(f"{BASE_URL}/items", json=item_data, headers=headers)
    if response.status_code == 200:
        item = response.json()
        item_id = item.get("id")
        print(f"PASS: Item created with ID: {item_id}")
    else:
        print(f"FAIL: Create item failed. Status: {response.status_code}")

    # 4. Create Activity (Pending Request)
    print("\n4. Testing Create Activity...")
    act_data = {
        "date": "07/02/2026",
        "action": "Geliyay: 1 Logistics Truck 500",
        "item_category": "Vehicles",
        "recipient": "Main Warehouse",
        "user": "salah",
        "comment": "Testing new item",
        "status": "Pending"
    }
    response = requests.post(f"{BASE_URL}/activities", json=act_data, headers=headers)
    if response.status_code == 200:
        act = response.json()
        act_id = act.get("id")
        print(f"PASS: Activity created with ID: {act_id}")
    else:
        print(f"FAIL: Create activity failed. Status: {response.status_code}")

    # 5. Approve Activity
    print("\n5. Testing Approval...")
    patch_data = {"status": "Approved"}
    response = requests.patch(f"{BASE_URL}/activities/{act_id}", json=patch_data, headers=headers)
    if response.status_code == 200:
        print(f"PASS: Activity {act_id} approved.")
    else:
        print(f"FAIL: Approval failed. Status: {response.status_code}")

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    # Wait a bit for server to be ready
    time.sleep(2)
    test_flow()
