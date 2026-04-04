import asyncio
import random
from datetime import datetime
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.worker import Worker

FIRST_NAMES = ["Amit", "Rahul", "Priya", "Sneha", "Karan", "Vikram", "Rohan", "Neha", "Pooja", "Arjun", "Anjali", "Suresh", "Manoj", "Kavita", "Sanjay", "Deepak", "Ravi", "Anil", "Sunil", "Rajesh"]
LAST_NAMES = ["Kumar", "Sharma", "Singh", "Patel", "Reddy", "Verma", "Gupta", "Nair", "Rao", "Iyer", "Das", "Yadav", "Chauhan", "Bose", "Jain"]

PLATFORMS = ["Amazon", "Flipkart", "Zepto", "Blinkit", "Zomato", "Swiggy", "Dunzo", "Shadowfax", "Porter"]
CITIES = ["Chennai", "Bangalore", "Hyderabad", "Mumbai", "Pune", "Delhi"]
ZONES = ["Tambaram", "Adyar", "Velachery", "Guindy", "T Nagar", "Anna Nagar", "Koramangala", "Indiranagar", "Whitefield", "HSR Layout", "Andheri", "Bandra"]

def generate_phone():
    return "9" + "".join([str(random.randint(0, 9)) for _ in range(9)])

async def seed_data():
    async with AsyncSessionLocal() as db:
        print("Generating 50 synthetic workers...")
        count = 0
        pwd_hash = get_password_hash("password123")  # All generate workers get same password to save time
        
        for _ in range(50):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            name = f"{first} {last}"
            phone = generate_phone()
            email = f"{first.lower()}.{last.lower()}.{random.randint(100,999)}@example.com"
            platform = random.choice(PLATFORMS)
            city = random.choice(CITIES)
            zones = [random.choice(ZONES)]
            
            # Generate risk score
            risk_score = random.uniform(20.0, 95.0)
            if risk_score < 40:
                risk_tier = "Basic"
            elif risk_score < 70:
                risk_tier = "Standard"
            else:
                risk_tier = "Premium"

            worker = Worker(
                phone=phone,
                name=name,
                email=email,
                hashed_password=pwd_hash,
                platform=platform,
                partner_id=f"{platform[:3].upper()}{random.randint(1000, 9999)}",
                city=city,
                zones=zones,
                weekly_hours=random.choice([40.0, 50.0, 60.0, 70.0]),
                kyc_status="VERIFIED",
                aadhaar_last4=str(random.randint(1000, 9999)),
                zone_risk_score=risk_score,
                risk_tier=risk_tier,
                role="worker",
                is_active=True,
                onboarding_complete=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(worker)
            count += 1

        await db.commit()
        print(f"Successfully seeded {count} new gig workers.")

if __name__ == "__main__":
    asyncio.run(seed_data())
