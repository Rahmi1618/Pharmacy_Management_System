from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3
import datetime
import math

app = FastAPI(title="PharmaCare Pro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "pharmacy.db"

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str = "customer"
    phone: Optional[str] = "+251 33 551 0001"

class UserUpdate(BaseModel):
    name: str
    email: str
    phone: str

class InventoryItem(BaseModel):
    name: str
    category: str
    price: float
    quantity: int
    expiry_date: str
    pharmacy_id: int = 1

class OrderItem(BaseModel):
    customer_name: str
    medicine_name: str
    quantity: int
    prescription_notes: Optional[str] = ""

class FeedbackItem(BaseModel):
    customer_name: str
    rating: int
    comments: str

class AIRecommendRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    medicine_query: Optional[str] = ""

class AIAssistantRequest(BaseModel):
    message: str
    customer_name: Optional[str] = "Patient"

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Ensure users table has phone column
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        phone TEXT DEFAULT '+251 33 551 0001'
    )
    ''')
    # Check if phone column exists, if not add it
    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'phone' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '+251 33 551 0001'")
    conn.commit()
    conn.close()

init_db()

@app.post("/api/login")
def login(data: UserLogin):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, role, phone FROM users WHERE email = ? AND password = ?", (data.email, data.password))
    user = cursor.fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"id": user[0], "name": user[1], "email": user[2], "role": user[3], "phone": user[4]}

@app.post("/api/register")
def register(data: UserRegister):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)",
                       (data.name, data.email, data.password, data.role, data.phone))
        conn.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    conn.close()
    return {"id": user_id, "name": data.name, "email": data.email, "role": data.role, "phone": data.phone}

@app.put("/api/users/{user_id}")
def update_user(user_id: int, data: UserUpdate):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?", (data.name, data.email, data.phone, user_id))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already taken by another account")
    conn.close()
    return {"id": user_id, "name": data.name, "email": data.email, "phone": data.phone}

@app.get("/api/inventory")
def get_inventory():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, category, price, quantity, expiry_date, pharmacy_id FROM inventory")
    today = datetime.date.today()
    items = []
    for r in cursor.fetchall():
        exp_date_obj = datetime.datetime.strptime(r[5], "%Y-%m-%d").date()
        status = "Valid"
        if exp_date_obj < today:
            status = "Expired"
        elif (exp_date_obj - today).days <= 30:
            status = "Expiring Soon"
            
        items.append({
            "id": r[0],
            "name": r[1],
            "category": r[2],
            "price": r[3],
            "quantity": r[4],
            "expiry_date": r[5],
            "pharmacy_id": r[6],
            "expiry_status": status
        })
    conn.close()
    return items

@app.post("/api/inventory")
def add_inventory(item: InventoryItem):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO inventory (name, category, price, quantity, expiry_date, pharmacy_id) VALUES (?, ?, ?, ?, ?, ?)",
                   (item.name, item.category, item.price, item.quantity, item.expiry_date, item.pharmacy_id))
    conn.commit()
    item_id = cursor.lastrowid
    conn.close()
    return {"id": item_id, **item.dict()}

@app.put("/api/inventory/{item_id}")
def update_inventory_qty(item_id: int, quantity: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE inventory SET quantity = ? WHERE id = ?", (quantity, item_id))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/api/inventory/{item_id}")
def delete_inventory(item_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM inventory WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/orders")
def get_orders():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, customer_name, medicine_name, quantity, prescription_notes, status, created_at FROM orders ORDER BY id DESC")
    orders = [{"id": r[0], "customer_name": r[1], "medicine_name": r[2], "quantity": r[3], "prescription_notes": r[4], "status": r[5], "created_at": r[6]} for r in cursor.fetchall()]
    conn.close()
    return orders

@app.post("/api/orders")
def create_order(order: OrderItem):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO orders (customer_name, medicine_name, quantity, prescription_notes) VALUES (?, ?, ?, ?)",
                   (order.customer_name, order.medicine_name, order.quantity, order.prescription_notes))
    conn.commit()
    order_id = cursor.lastrowid
    conn.close()
    return {"id": order_id, **order.dict(), "status": "Pending Review"}

@app.put("/api/orders/{order_id}/status")
def update_order_status(order_id: int, status: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/pharmacies")
def get_pharmacies():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, address, lat, lng, phone, hours, open, rating FROM pharmacies")
    pharmacies = [{"id": r[0], "name": r[1], "address": r[2], "lat": r[3], "lng": r[4], "phone": r[5], "hours": r[6], "open": bool(r[7]), "rating": r[8]} for r in cursor.fetchall()]
    conn.close()
    return pharmacies

@app.post("/api/ai/recommend-pharmacy")
def ai_recommend_pharmacy(req: AIRecommendRequest):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, address, lat, lng, phone, hours, open, rating FROM pharmacies")
    pharmacies = cursor.fetchall()
    
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    cursor.execute("SELECT name, pharmacy_id, quantity FROM inventory WHERE expiry_date >= ? AND quantity > 0", (today_str,))
    valid_stock = cursor.fetchall()
    conn.close()

    user_lat = req.lat if req.lat is not None else 11.0820
    user_lng = req.lng if req.lng is not None else 39.7397
    med_q = (req.medicine_query or "").strip().lower()

    scored = []
    for p in pharmacies:
        p_id, name, address, lat, lng, phone, hours, is_open, rating = p
        dist_km = haversine_km(user_lat, user_lng, lat, lng)
        
        has_med = False
        med_qty = 0
        if med_q:
            for s_name, s_pid, s_qty in valid_stock:
                if s_pid == p_id and med_q in s_name.lower():
                    has_med = True
                    med_qty = s_qty
                    break

        score = 100.0
        score -= min(dist_km * 8.0, 40.0)
        if not is_open:
            score -= 25.0
        if med_q:
            if has_med:
                score += 15.0
            else:
                score -= 20.0
        score += (rating - 4.5) * 10.0
        score = max(min(round(score, 1), 99.8), 45.0)

        reasons = []
        reasons.append(f"{dist_km:.2f} km from your location")
        if is_open:
            reasons.append("Currently Open")
        if med_q:
            if has_med:
                reasons.append(f"In Stock ({med_qty} units available)")
            else:
                reasons.append("Requested medicine out of stock here")
        reasons.append(f"{rating}/5 patient rating")

        scored.append({
            "id": p_id,
            "name": name,
            "address": address,
            "phone": phone,
            "hours": hours,
            "open": bool(is_open),
            "distance_km": round(dist_km, 2),
            "ai_score": score,
            "has_requested_med": has_med,
            "reason": " • ".join(reasons)
        })

    scored.sort(key=lambda x: x["ai_score"], reverse=True)
    return {"recommended": scored[0] if scored else None, "all_ranked": scored}

@app.post("/api/ai/assistant")
def ai_assistant(req: AIAssistantRequest):
    msg = req.message.lower()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    cursor.execute("SELECT name, category, price, quantity FROM inventory WHERE expiry_date >= ? AND quantity > 0", (today_str,))
    available_meds = cursor.fetchall()
    conn.close()

    med_list_str = ", ".join([f"{m[0]} (${m[2]:.2f})" for m in available_meds[:5]])

    if any(k in msg for k in ["headache", "fever", "pain", "migraine", "ache"]):
        reply = (
            "For mild to moderate headache, fever, or body pain, **Paracetamol 650mg** ($5.00) or **Ibuprofen 400mg** ($8.25) are available in our verified inventory. "
            "Take Paracetamol after food and stay hydrated. *Note: Consult a doctor if fever persists beyond 48 hours.*"
        )
    elif any(k in msg for k in ["allergy", "sneeze", "itch", "cold", "runny nose"]):
        reply = (
            "For allergy symptoms or sneezing, **Cetirizine 10mg** ($6.50) is currently in stock at Downtown Health Pharmacy. "
            "It provides 24-hour relief with minimal drowsiness."
        )
    elif any(k in msg for k in ["stomach", "acid", "heartburn", "reflux", "ulcer"]):
        reply = (
            "For acid reflux or heartburn, **Omeprazole 20mg** ($11.00) is available in our inventory. "
            "It is typically taken 30 minutes before breakfast."
        )
    elif any(k in msg for k in ["antibiotic", "infection", "amoxicillin"]):
        reply = (
            "Antibiotics such as Amoxicillin require a valid doctor's prescription. "
            "Please upload your prescription in the **Upload Prescription** panel on your dashboard so our licensed pharmacist can verify and dispense fresh stock."
        )
    elif any(k in msg for k in ["nearest", "pharmacy", "location", "where", "closest"]):
        reply = (
            "You can click **Find Pharmacy** in your top menu to run the **AI Nearest Pharmacy Recommender**. "
            "It uses your live GPS coordinates and checks real-time medicine stock to recommend the best branch!"
        )
    elif any(k in msg for k in ["stock", "available", "medicine", "list", "price"]):
        reply = f"Currently verified in-stock medicines include: **{med_list_str}**. You can search or order any of them directly from your dashboard."
    else:
        reply = (
            f"Hello {req.customer_name}! I am your **PharmaCare AI Health & Pharmacy Assistant**. "
            "Ask me about symptoms (e.g., headache, allergy, acid reflux), check medicine availability, or ask me to find the nearest pharmacy with your medicine in stock!"
        )

    return {"reply": reply}

@app.post("/api/feedback")
def submit_feedback(fb: FeedbackItem):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO feedback (customer_name, rating, comments) VALUES (?, ?, ?)",
                   (fb.customer_name, fb.rating, fb.comments))
    conn.commit()
    fb_id = cursor.lastrowid
    conn.close()
    return {"id": fb_id, **fb.dict()}

@app.get("/api/feedback")
def get_feedback():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, customer_name, rating, comments, created_at FROM feedback ORDER BY id DESC")
    feedbacks = [{"id": r[0], "customer_name": r[1], "rating": r[2], "comments": r[3], "created_at": r[4]} for r in cursor.fetchall()]
    conn.close()
    return feedbacks

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
