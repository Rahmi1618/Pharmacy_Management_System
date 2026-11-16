
# 💊 PharmaCare Pro
## Intelligent, AI-Powered Pharmacy Management & Patient Care System

A next-generation digital healthcare platform designed to seamlessly connect registered patients, local pharmacies, and automated inventory control through AI geolocation matching, real-time stock monitoring, and intelligent prescription workflows.
## 📖 Overview & Purpose
PharmaCare Pro solves modern pharmacy bottlenecks by decentralizing patient access and automating backend safety checks[cite: 13, 15]. Patients gain immediate access to AI-guided branch matching and health assistance[cite: 13, 15], while pharmacists and administrators manage stock expiration risks and fulfillment queues through a dedicated secure portal.

## 📂 Project Architecture & File Directory

text
Pharmacy_Management_System/
├── 📁 backend/
│   ├── 🐍 main.py            # FastAPI server core, REST API routes, & AI recommendation logic
│   ├── 🗄️ pharmacy.db        # SQLite relational database (Users, Inventory, Orders, Pharmacies)
│   └── 📄 requirements.txt   # Pinned Python package dependencies
├── 📁 frontend/
│   ├── 🌐 index.html         # Responsive Tailwind CSS layout & single-page application shell
│   └── ⚡ app.js             # Client-side routing, state management, API synchronization, & UI engine
└── 📖 README.md              # Comprehensive project documentation
🌟 Core Modules & Detailed Descriptions
Module	Functional Description	Target User Role
🔐 Role-Based Auth	
Secure access control supporting separate permissions for Customer, Pharmacist, and Administrator accounts. 
All Users
📍 AI Branch Matcher	
Advanced geolocation algorithm combining GPS coordinates, branch operating hours, patient ratings, and live inventory stock to compute an AI Compatibility Score. 
Registered Customers
🤖 24/7 AI Assistant	
Conversational virtual health helper trained to provide over-the-counter symptom guidance, price checks, and medication availability. 
clean_structure/backend/requirements.txt

Registered Customers
📦 Expiry & Inventory	
Automated pharmaceutical safety monitor that flags expired or soon-to-expire stock, allowing instant removal and stock adjustments. 
Pharmacists / Admins
📋 Prescription Queue	
Secure prescription file upload portal connecting patients directly to a live pharmacist review and order fulfillment queue (Pending ➔ Ready for Pickup). 
Customers & Staff
🚀 Getting Started & Installation Guide
Prerequisites
Python 3.8+ installed on your system.   
A modern web browser (Chrome, Edge, Firefox, or Safari).   

Step 1: Start the FastAPI Backend Server
Open your terminal, navigate to the backend directory, install requirements, and boot up the server:   
PowerShell
cd backend
pip install -r requirements.txt
python main.py
Status Verification: Uvicorn will start running at http://127.0.0.1:8000, and pharmacy.db will automatically initialize with default records.
   
Step 2: Launch the Frontend Application
Open the frontend/ folder in VS Code.   
Right-click index.html and select Open with Live Server (or open the file directly in your browser).   
Click Register / Get Started to create your patient or staff account and unlock your dashboard[cite: 16].

🛠️ Technology Stack
Backend API: Python, FastAPI, Uvicorn, Pydantic, SQLite[cite: 13, 15]

Frontend UI: HTML5, Tailwind CSS, JavaScript (ES6+), FontAwesome Icons, Google Inter Font   

📞 Support & Emergency Contacts
Customer Support: +251 902327220   
Email Support: support@pharmacarepro.com   
