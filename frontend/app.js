const API_BASE = "http://127.0.0.1:8000/api";

        // --- State Management ---
        const state = {
            currentUser: JSON.parse(localStorage.getItem('pharma_user')) || null,
            currentView: 'home',
            pharmacies: [],
            aiRecommendation: null,
            aiRankedPharmacies: [],
            inventory: [],
            orders: [],
            feedbacks: [],
            userLocation: null,
            chatHistory: [
                { sender: 'ai', text: "Hello! I am your PharmaCare AI Assistant. How can I assist you with your medications, symptoms, or nearest pharmacy today?" }
            ]
        };

        // --- Toast Notifications ---
        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            const bgColor = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-amber-600';
            const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
            
            toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0 text-sm font-medium`;
            toast.innerHTML = `<i class="fa-solid ${icon} text-lg"></i><span>${message}</span>`;
            
            container.appendChild(toast);
            setTimeout(() => { toast.classList.remove('translate-y-2', 'opacity-0'); }, 10);
            setTimeout(() => {
                toast.classList.add('translate-y-2', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        }

        // --- Data Sync with FastAPI Backend ---
        async function syncBackendData() {
            try {
                const [invRes, ordRes, pharmRes, fbRes] = await Promise.all([
                    fetch(`${API_BASE}/inventory`),
                    fetch(`${API_BASE}/orders`),
                    fetch(`${API_BASE}/pharmacies`),
                    fetch(`${API_BASE}/feedback`)
                ]);
                if (invRes.ok) state.inventory = await invRes.json();
                if (ordRes.ok) state.orders = await ordRes.json();
                if (pharmRes.ok) state.pharmacies = await pharmRes.json();
                if (fbRes.ok) state.feedbacks = await fbRes.json();
            } catch (err) {
                console.warn("Backend offline or unreachable.", err);
            }
        }

        // --- Router & Access Control ---
        // "Find Pharmacy" and "Feedback" are ONLY accessible AFTER full customer registration & login!
        const router = {
            navigate: async function(viewName) {
                const protectedViews = ['dashboard', 'finder', 'feedback'];
                if (protectedViews.includes(viewName) && !state.currentUser) {
                    showToast('Please register or sign in first to access Find Pharmacy, Feedback, and Dashboard.', 'error');
                    viewName = 'register';
                }

                state.currentView = viewName;
                window.scrollTo(0, 0);
                await syncBackendData();
                renderNavbar();
                updateFloatingAIWidget();
                renderView();
            }
        };

        function updateFloatingAIWidget() {
            const widget = document.getElementById('floating-ai-widget');
            if (state.currentUser) {
                widget.classList.remove('hidden');
            } else {
                widget.classList.add('hidden');
            }
        }

        function toggleAIChatWidget() {
            const win = document.getElementById('ai-chat-window');
            win.classList.toggle('hidden');
        }

        function renderNavbar() {
            const desktopNav = document.getElementById('desktop-nav-links');
            const mobileMenu = document.getElementById('mobile-menu');

            if (state.currentUser) {
                const isAdmin = state.currentUser.role === 'pharmacist' || state.currentUser.role === 'admin';
                const badgeColor = isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
                const roleLabel = isAdmin ? 'Pharmacist / Admin' : 'Customer';

                // Logged-in Navbar includes Find Pharmacy & Feedback!
                desktopNav.innerHTML = `
                    <button onclick="router.navigate('home')" class="nav-link text-slate-600 hover:text-emerald-600 font-medium text-sm transition">Home</button>
                    <button onclick="router.navigate('about')" class="nav-link text-slate-600 hover:text-emerald-600 font-medium text-sm transition">About Us</button>
                    <button onclick="router.navigate('finder')" class="nav-link text-slate-600 hover:text-emerald-600 font-medium text-sm transition"><i class="fa-solid fa-wand-magic-sparkles mr-1 text-emerald-500"></i> Find Pharmacy (AI)</button>
                    <button onclick="router.navigate('feedback')" class="nav-link text-slate-600 hover:text-emerald-600 font-medium text-sm transition"><i class="fa-solid fa-comments mr-1 text-emerald-500"></i> Feedback</button>
                    <div class="flex items-center space-x-3 pl-2 border-l border-slate-200">
                        <div class="text-right hidden lg:block">
                            <div class="text-xs font-bold text-slate-700">${state.currentUser.name}</div>
                            <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${badgeColor}">${roleLabel}</span>
                        </div>
                        <button onclick="router.navigate('dashboard')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-lg font-medium transition shadow-sm">Dashboard</button>
                        <button onclick="logout()" class="text-slate-400 hover:text-rose-600 p-2 transition" title="Logout"><i class="fa-solid fa-right-from-bracket"></i></button>
                    </div>
                `;

                mobileMenu.innerHTML = `
                    <div class="py-2 px-3 bg-slate-50 rounded-lg mb-2">
                        <p class="font-bold text-slate-800 text-sm">${state.currentUser.name}</p>
                        <p class="text-xs text-emerald-600 font-medium">${roleLabel}</p>
                    </div>
                    <button onclick="router.navigate('home'); toggleMobileMenu();" class="block w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium">Home</button>
                    <button onclick="router.navigate('about'); toggleMobileMenu();" class="block w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium">About Us</button>
                    <button onclick="router.navigate('finder'); toggleMobileMenu();" class="block w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"><i class="fa-solid fa-wand-magic-sparkles mr-1 text-emerald-500"></i> Find Pharmacy (AI)</button>
                    <button onclick="router.navigate('feedback'); toggleMobileMenu();" class="block w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"><i class="fa-solid fa-comments mr-1 text-emerald-500"></i> Feedback</button>
                    <button onclick="router.navigate('dashboard'); toggleMobileMenu();" class="block w-full text-left px-3 py-2 rounded-lg text-emerald-600 font-bold">My Dashboard</button>
                    <button onclick="logout(); toggleMobileMenu();" class="block w-full text-left px-3 py-2 rounded-lg text-rose-600 font-medium">Logout</button>
                `;
            } else {
                // Logged-out / Public Navbar: Find Pharmacy & Feedback are NOT shown until customer registers and logs in!
                desktopNav.innerHTML = `
                    <button onclick="router.navigate('home')" class="nav-link text-slate-600 hover:text-emerald-600 font-medium text-sm transition">Home</button>
                    <button onclick="router.navigate('about')" class="nav-link text-slate-600 hover:text-emerald-600 font-medium text-sm transition">About Us</button>
                    <div class="flex items-center space-x-3">
                        <button onclick="router.navigate('login')" class="text-slate-700 hover:text-emerald-600 font-medium text-sm px-3 py-2 transition">Sign In</button>
                        <button onclick="router.navigate('register')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-xl font-medium transition shadow-sm shadow-emerald-200">Register / Get Started</button>
                    </div>
                `;

                mobileMenu.innerHTML = `
                    <button onclick="router.navigate('home'); toggleMobileMenu();" class="block w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium">Home</button>
                    <button onclick="router.navigate('about'); toggleMobileMenu();" class="block w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium">About Us</button>
                    <div class="pt-2 border-t border-slate-100 space-y-2">
                        <button onclick="router.navigate('login'); toggleMobileMenu();" class="w-full border border-emerald-600 text-emerald-700 py-2 rounded-xl font-medium text-center">Sign In</button>
                        <button onclick="router.navigate('register'); toggleMobileMenu();" class="w-full bg-emerald-600 text-white py-2 rounded-xl font-medium text-center shadow-sm">Register Now</button>
                    </div>
                `;
            }
        }

        function toggleMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('hidden');
        }

        function renderView() {
            const main = document.getElementById('main-content');
            switch(state.currentView) {
                case 'home':
                    main.innerHTML = getHomeView();
                    break;
                case 'about':
                    main.innerHTML = getAboutView();
                    break;
                case 'finder':
                    main.innerHTML = getFinderView();
                    break;
                case 'feedback':
                    main.innerHTML = getFeedbackView();
                    break;
                case 'login':
                    main.innerHTML = getLoginView();
                    break;
                case 'register':
                    main.innerHTML = getRegisterView();
                    break;
                case 'dashboard':
                    if (state.currentUser.role === 'pharmacist' || state.currentUser.role === 'admin') {
                        main.innerHTML = getPharmacistDashboardView();
                    } else {
                        main.innerHTML = getCustomerDashboardView();
                    }
                    break;
                default:
                    main.innerHTML = getHomeView();
            }
        }

        // --- View Templates ---

        function getHomeView() {
            const ctaPrimary = state.currentUser 
                ? `<button onclick="router.navigate('finder')" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl transition shadow-lg flex items-center justify-center space-x-2"><i class="fa-solid fa-wand-magic-sparkles"></i><span>AI Nearest Pharmacy Finder</span></button>`
                : `<button onclick="router.navigate('register')" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl transition shadow-lg flex items-center justify-center space-x-2"><i class="fa-solid fa-user-plus"></i><span>Register to Get Started</span></button>`;

            const ctaSecondary = state.currentUser
                ? `<button onclick="router.navigate('dashboard')" class="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl transition flex items-center justify-center space-x-2"><i class="fa-solid fa-gauge"></i><span>Go to My Dashboard</span></button>`
                : `<button onclick="router.navigate('login')" class="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl transition flex items-center justify-center space-x-2"><i class="fa-solid fa-right-to-bracket"></i><span>Sign In to Account</span></button>`;

            return `
                <!-- Hero Section -->
                <section class="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                    <div class="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                        <div class="space-y-6">
                            <span class="inline-flex items-center space-x-2 bg-emerald-800/80 border border-emerald-600 px-3 py-1 rounded-full text-xs font-semibold text-emerald-200">
                                <i class="fa-solid fa-robot text-emerald-400"></i>
                                <span>AI-Enhanced Digital Pharmacy Network</span>
                            </span>
                            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                                Smart Healthcare & <span class="text-emerald-400">AI Pharmacy Finder.</span>
                            </h1>
                            <p class="text-lg text-emerald-100 max-w-xl leading-relaxed">
                                Register your patient account to unlock our <strong>AI Nearest Pharmacy Recommender</strong>, consult our <strong>AI Health Assistant</strong>, upload prescriptions, and share service feedback.
                            </p>
                            <div class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
                                ${ctaPrimary}
                                ${ctaSecondary}
                            </div>
                            <div class="grid grid-cols-3 gap-4 pt-6 border-t border-emerald-800/60">
                                <div>
                                    <div class="text-2xl font-bold text-white">AI Powered</div>
                                    <div class="text-xs text-emerald-300">Smart Branch Matching</div>
                                </div>
                                <div>
                                    <div class="text-2xl font-bold text-white">24/7 AI</div>
                                    <div class="text-xs text-emerald-300">Medication Assistant</div>
                                </div>
                                <div>
                                    <div class="text-2xl font-bold text-white">100%</div>
                                    <div class="text-xs text-emerald-300">Verified Pharmacists</div>
                                </div>
                            </div>
                        </div>
                        <div class="relative flex justify-center">
                            <div class="w-full max-w-md bg-slate-900/40 backdrop-blur-md border border-emerald-500/30 rounded-3xl p-6 shadow-2xl">
                                <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-800/50">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span class="text-sm font-semibold text-white">Member Portal Features</span>
                                    </div>
                                    <span class="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-medium">${state.currentUser ? 'Unlocked' : 'Register to Unlock'}</span>
                                </div>
                                <div class="space-y-4">
                                    <div class="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex items-center space-x-4">
                                        <div class="bg-emerald-600/20 p-3 rounded-xl text-emerald-400">
                                            <i class="fa-solid fa-wand-magic-sparkles text-xl"></i>
                                        </div>
                                        <div>
                                            <div class="text-sm font-bold text-white">AI Nearest Pharmacy Recommender</div>
                                            <div class="text-xs text-slate-400">Matches GPS location + live medicine stock</div>
                                        </div>
                                    </div>
                                    <div class="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex items-center space-x-4">
                                        <div class="bg-teal-600/20 p-3 rounded-xl text-teal-400">
                                            <i class="fa-solid fa-robot text-xl"></i>
                                        </div>
                                        <div>
                                            <div class="text-sm font-bold text-white">AI Pharmacy Assistant</div>
                                            <div class="text-xs text-slate-400">Instant guidance on symptoms & available stock</div>
                                        </div>
                                    </div>
                                    <div class="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex items-center space-x-4">
                                        <div class="bg-amber-600/20 p-3 rounded-xl text-amber-400">
                                            <i class="fa-solid fa-comments text-xl"></i>
                                        </div>
                                        <div>
                                            <div class="text-sm font-bold text-white">Verified Patient Feedback</div>
                                            <div class="text-xs text-slate-400">Rate pharmacies and share your experience</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Features Grid Section -->
                <section class="py-20 bg-white px-4 sm:px-6 lg:px-8">
                    <div class="max-w-7xl mx-auto">
                        <div class="text-center max-w-2xl mx-auto mb-16">
                            <h2 class="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Comprehensive Features</h2>
                            <h3 class="text-3xl font-bold text-slate-900">Intelligent Care After Registration</h3>
                            <p class="text-slate-600 mt-2">Create your account in seconds to access AI-guided pharmacy selection, prescription uploads, and patient reviews.</p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div class="bg-slate-50 border border-slate-200/80 p-8 rounded-2xl hover:shadow-xl transition group">
                                <div class="bg-emerald-100 text-emerald-600 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:bg-emerald-600 group-hover:text-white transition">
                                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                                </div>
                                <h4 class="text-xl font-bold text-slate-900 mb-3">AI Pharmacy Recommendation</h4>
                                <p class="text-slate-600 text-sm leading-relaxed">Analyzes your GPS coordinates, medicine availability, and branch hours to recommend the closest, best-stocked pharmacy.</p>
                            </div>
                            <div class="bg-slate-50 border border-slate-200/80 p-8 rounded-2xl hover:shadow-xl transition group">
                                <div class="bg-emerald-100 text-emerald-600 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:bg-emerald-600 group-hover:text-white transition">
                                    <i class="fa-solid fa-robot"></i>
                                </div>
                                <h4 class="text-xl font-bold text-slate-900 mb-3">24/7 AI Health Assistant</h4>
                                <p class="text-slate-600 text-sm leading-relaxed">Chat with our built-in AI assistant to check OTC options, inquire about stock prices, and get prescription instructions.</p>
                            </div>
                            <div class="bg-slate-50 border border-slate-200/80 p-8 rounded-2xl hover:shadow-xl transition group">
                                <div class="bg-emerald-100 text-emerald-600 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:bg-emerald-600 group-hover:text-white transition">
                                    <i class="fa-solid fa-warehouse"></i>
                                </div>
                                <h4 class="text-xl font-bold text-slate-900 mb-3">Expiry Alerts & Inventory</h4>
                                <p class="text-slate-600 text-sm leading-relaxed">Pharmacists receive automated expiration alerts and can remove expired stock immediately to guarantee safe dispensing.</p>
                            </div>
                        </div>
                    </div>
                </section>
            `;
        }

        function getAboutView() {
            return `
                <section class="py-16 bg-white px-4 sm:px-6 lg:px-8 flex-1">
                    <div class="max-w-4xl mx-auto space-y-12">
                        <div class="text-center">
                            <span class="text-xs font-bold uppercase tracking-widest text-emerald-600">About PharmaCare Pro</span>
                            <h2 class="text-3xl sm:text-4xl font-bold text-slate-900 mt-2">AI-Driven Pharmacy Operations & Patient Access</h2>
                            <p class="text-slate-600 mt-4 text-base max-w-2xl mx-auto">PharmaCare Pro bridges the gap between registered patients, local pharmacies, and intelligent medication guidance.</p>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div class="space-y-4">
                                <h3 class="text-2xl font-bold text-slate-900">Our Mission</h3>
                                <p class="text-slate-600 leading-relaxed">To empower registered patients with AI-assisted pharmacy matching, instant health Q&A, and seamless prescription fulfillment from trusted local branches.</p>
                                <div class="space-y-2 pt-2">
                                    <div class="flex items-center space-x-3 text-slate-700 font-medium text-sm">
                                        <i class="fa-solid fa-check text-emerald-600"></i>
                                        <span>AI Nearest Pharmacy & Stock Matching</span>
                                    </div>
                                    <div class="flex items-center space-x-3 text-slate-700 font-medium text-sm">
                                        <i class="fa-solid fa-check text-emerald-600"></i>
                                        <span>Interactive AI Pharmacy Assistant</span>
                                    </div>
                                    <div class="flex items-center space-x-3 text-slate-700 font-medium text-sm">
                                        <i class="fa-solid fa-check text-emerald-600"></i>
                                        <span>Verified Member Feedback & Ratings</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gradient-to-br from-emerald-600 to-teal-800 p-8 rounded-3xl text-white shadow-xl">
                                <h3 class="text-xl font-bold mb-4">Emergency & Contact Info</h3>
                                <div class="space-y-4 text-sm">
                                    <div class="flex items-start space-x-3">
                                        <i class="fa-solid fa-location-dot mt-1 text-emerald-300"></i>
                                        <div><strong>Headquarters:</strong> Main Street, Kombolcha, Ethiopia</div>
                                    </div>
                                    <div class="flex items-start space-x-3">
                                        <i class="fa-solid fa-phone mt-1 text-emerald-300"></i>
                                        <div><strong>Phone Support:</strong> +251 33 551 0001</div>
                                    </div>
                                    <div class="flex items-start space-x-3">
                                        <i class="fa-solid fa-envelope mt-1 text-emerald-300"></i>
                                        <div><strong>Email:</strong> support@pharmacarepro.com</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            `;
        }

        // --- Protected View: Find Pharmacy with AI Recommendation Engine ---
        function getFinderView() {
            const topRec = state.aiRecommendation;
            const displayList = state.aiRankedPharmacies.length > 0 ? state.aiRankedPharmacies : state.pharmacies;

            return `
                <section class="py-12 bg-slate-50 flex-1 px-4 sm:px-6 lg:px-8">
                    <div class="max-w-7xl mx-auto space-y-8">
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <span class="text-xs font-bold uppercase tracking-widest text-emerald-600">AI Geolocation & Stock Engine</span>
                                <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">AI Nearest Pharmacy Recommender</h2>
                                <p class="text-slate-600 text-sm">Enter an optional medicine name and let our AI analyze GPS distance, stock availability, and hours to recommend the best branch.</p>
                            </div>
                        </div>

                        <!-- AI Recommender Control Bar -->
                        <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-end">
                            <div class="flex-1 w-full">
                                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Medicine Needed (Optional for AI Stock Check)</label>
                                <input type="text" id="ai-med-query" placeholder="e.g., Paracetamol, Cetirizine, Ibuprofen..." class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50">
                            </div>
                            <button onclick="runAIPharmacyRecommendation()" class="w-full md:w-auto bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm">
                                <i class="fa-solid fa-wand-magic-sparkles"></i>
                                <span>Run AI Nearest Recommendation</span>
                            </button>
                        </div>

                        <!-- AI Top Recommendation Banner -->
                        ${topRec ? `
                            <div class="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-6 rounded-3xl shadow-xl border border-emerald-500/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div class="space-y-2">
                                    <div class="inline-flex items-center space-x-2 bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 rounded-full text-xs font-bold text-emerald-300">
                                        <i class="fa-solid fa-robot"></i>
                                        <span>AI Top Match • ${topRec.ai_score}% Compatibility Score</span>
                                    </div>
                                    <h3 class="text-2xl font-bold text-white">${topRec.name}</h3>
                                    <p class="text-sm text-emerald-100"><i class="fa-solid fa-location-dot mr-1.5 text-emerald-400"></i>${topRec.address} • <i class="fa-solid fa-phone ml-2 mr-1 text-emerald-400"></i>${topRec.phone}</p>
                                    <p class="text-xs text-emerald-200 bg-white/10 inline-block px-3 py-1.5 rounded-xl mt-1">
                                        <strong>Why AI chose this:</strong> ${topRec.reason}
                                    </p>
                                </div>
                                <div class="flex flex-col space-y-2 w-full md:w-auto">
                                    <button onclick="router.navigate('dashboard')" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition text-center shadow-md">
                                        Order From This Branch
                                    </button>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Map & Ranked List Layout -->
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <!-- Pharmacy List -->
                            <div class="lg:col-span-1 space-y-4" id="pharmacy-list-container">
                                ${displayList.map((p, idx) => `
                                    <div class="bg-white border ${idx === 0 && topRec ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'} p-5 rounded-2xl shadow-sm hover:shadow-md transition space-y-3">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <h3 class="font-bold text-slate-900 text-base">${p.name}</h3>
                                                ${p.ai_score ? `<span class="text-[11px] font-bold text-emerald-600"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>AI Score: ${p.ai_score}%</span>` : ''}
                                            </div>
                                            <span class="text-xs px-2.5 py-1 rounded-full font-semibold ${p.open ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${p.open ? 'Open Now' : 'Closed'}</span>
                                        </div>
                                        <p class="text-xs text-slate-500"><i class="fa-solid fa-location-dot mr-1 text-emerald-600"></i> ${p.address}</p>
                                        <p class="text-xs text-slate-500"><i class="fa-solid fa-phone mr-1 text-emerald-600"></i> ${p.phone}</p>
                                        ${p.reason ? `<p class="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">${p.reason}</p>` : ''}
                                        <div class="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                                            <span class="text-slate-600 font-medium"><i class="fa-regular fa-clock mr-1"></i> ${p.hours || '8:00 AM - 10:00 PM'}</span>
                                            <span class="font-bold text-emerald-600">${p.distance_km !== undefined ? p.distance_km + ' km away' : 'Nearby'}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Map Visualization Container -->
                            <div class="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col h-[500px]">
                                <div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                                    <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Live GPS & AI Spatial Analyzer</span>
                                    <span id="location-status-badge" class="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                                        ${state.userLocation ? `GPS Locked: ${state.userLocation.lat.toFixed(4)}, ${state.userLocation.lng.toFixed(4)}` : 'Click Run AI Recommendation for GPS Lock'}
                                    </span>
                                </div>
                                <div id="map-canvas" class="flex-1 bg-slate-100 rounded-xl relative overflow-hidden flex items-center justify-center">
                                    <div class="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
                                    <div class="relative z-10 text-center space-y-4 p-4">
                                        <div class="inline-flex items-center space-x-2 bg-white/95 backdrop-blur px-4 py-2.5 rounded-xl shadow-lg border border-slate-200">
                                            <i class="fa-solid fa-map-location-dot text-emerald-600 text-lg"></i>
                                            <span id="map-title-status" class="text-xs font-bold text-slate-800">
                                                ${topRec ? `AI Recommended: ${topRec.name} (${topRec.distance_km} km)` : 'Kombolcha Pharmacy Network Map'}
                                            </span>
                                        </div>
                                        <div class="flex flex-wrap justify-center gap-4 pt-4">
                                            ${displayList.map((p, idx) => `
                                                <div class="bg-white border ${idx === 0 ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-slate-200'} shadow-md px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-2">
                                                    <div class="w-2.5 h-2.5 ${idx === 0 ? 'bg-emerald-600' : 'bg-slate-400'} rounded-full"></div>
                                                    <span class="font-bold text-slate-800">${p.name}</span>
                                                    ${idx === 0 ? '<span class="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-bold">AI Best Match</span>' : ''}
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            `;
        }

        async function runAIPharmacyRecommendation() {
            const medQuery = document.getElementById('ai-med-query').value;
            showToast("AI Engine analyzing live GPS coordinates & pharmacy stock...", "info");

            const executeFetch = async (lat, lng) => {
                try {
                    const res = await fetch(`${API_BASE}/ai/recommend-pharmacy`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lat, lng, medicine_query: medQuery })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        state.aiRecommendation = data.recommended;
                        state.aiRankedPharmacies = data.all_ranked;
                        showToast(`AI Recommendation ready: ${data.recommended.name} (${data.recommended.ai_score}% match)!`, "success");
                        renderView();
                    }
                } catch (e) {
                    console.warn(e);
                    showToast("Could not connect to AI backend.", "error");
                }
            };

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        executeFetch(pos.coords.latitude, pos.coords.longitude);
                    },
                    () => {
                        // Fallback to Kombolcha city center coordinates if browser GPS blocked
                        state.userLocation = { lat: 11.0820, lng: 39.7397 };
                        executeFetch(11.0820, 39.7397);
                    }
                );
            } else {
                executeFetch(11.0820, 39.7397);
            }
        }

        // --- Protected View: Customer Feedback ---
        function getFeedbackView() {
            return `
                <section class="py-12 bg-slate-50 flex-1 px-4 sm:px-6 lg:px-8">
                    <div class="max-w-4xl mx-auto space-y-8">
                        <div class="text-center space-y-2">
                            <span class="text-xs font-bold uppercase tracking-widest text-emerald-600">Verified Member Reviews</span>
                            <h2 class="text-3xl font-bold text-slate-900">Customer Feedback & Ratings</h2>
                            <p class="text-slate-600 text-sm max-w-lg mx-auto">Thank you for being a registered member, <strong>${state.currentUser.name}</strong>! Share your feedback regarding our pharmacy services and AI recommendations.</p>
                        </div>

                        <!-- Feedback Form & List Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <!-- Form -->
                            <div class="md:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                                <h3 class="font-bold text-slate-900 text-base pb-3 border-b border-slate-100">Leave a Review</h3>
                                <form onsubmit="handleFeedbackSubmit(event)" class="space-y-4">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Your Name</label>
                                        <input type="text" id="feedback-name" required readonly value="${state.currentUser.name}" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-100 text-slate-600 font-medium">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Rating (1 to 5 Stars)</label>
                                        <select id="feedback-rating" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50">
                                            <option value="5">⭐⭐⭐⭐⭐ (5/5) Excellent</option>
                                            <option value="4">⭐⭐⭐⭐ (4/5) Very Good</option>
                                            <option value="3">⭐⭐⭐ (3/5) Average</option>
                                            <option value="2">⭐⭐ (2/5) Needs Improvement</option>
                                            <option value="1">⭐ (1/5) Poor</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Feedback Comments</label>
                                        <textarea id="feedback-comment" required rows="3" placeholder="Write your experience..." class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50"></textarea>
                                    </div>
                                    <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition text-sm shadow-sm">
                                        Submit Feedback
                                    </button>
                                </form>
                            </div>

                            <!-- Reviews List -->
                            <div class="md:col-span-2 space-y-4">
                                <h3 class="font-bold text-slate-900 text-base">Recent Patient Reviews</h3>
                                <div id="feedback-list-container" class="space-y-4">
                                    ${state.feedbacks.map(f => `
                                        <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                                            <div class="flex justify-between items-start">
                                                <div>
                                                    <h4 class="font-bold text-slate-900 text-sm">${f.customer_name || f.name}</h4>
                                                    <div class="text-amber-500 text-xs">${'⭐'.repeat(f.rating)}</div>
                                                </div>
                                                <span class="text-xs text-slate-400">${f.created_at ? f.created_at.split(' ')[0] : f.date || ''}</span>
                                            </div>
                                            <p class="text-slate-600 text-xs leading-relaxed">"${f.comments || f.comment}"</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            `;
        }

        async function handleFeedbackSubmit(event) {
            event.preventDefault();
            const name = document.getElementById('feedback-name').value;
            const rating = parseInt(document.getElementById('feedback-rating').value);
            const comments = document.getElementById('feedback-comment').value;

            try {
                await fetch(`${API_BASE}/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customer_name: name, rating, comments })
                });
            } catch (e) { console.warn(e); }

            showToast("Thank you! Your feedback has been submitted successfully.", "success");
            router.navigate('feedback');
        }

        // --- Login & Register Views ---
        function getLoginView() {
            return `
                <section class="py-16 bg-slate-100 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
                    <div class="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6">
                        <div class="text-center space-y-2">
                            <div class="bg-emerald-600 text-white w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-xl shadow-md shadow-emerald-200">
                                <i class="fa-solid fa-lock"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-slate-900">Sign In</h2>
                            <p class="text-xs text-slate-500">Sign in to access AI Pharmacy Finder, AI Assistant, Feedback, and Dashboard.</p>
                        </div>

                        <form onsubmit="handleLogin(event)" class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                                <input type="email" id="login-email" required placeholder="Enter your email" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50/50">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
                                <input type="password" id="login-password" required placeholder="••••••••" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50/50">
                            </div>
                            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-md shadow-emerald-200 text-sm">
                                Sign In
                            </button>
                        </form>

                        <div class="border-t border-slate-100 pt-4 text-center">
                            <p class="text-xs text-slate-600">
                                New customer? <button onclick="router.navigate('register')" class="text-emerald-600 font-bold hover:underline">Register New Account</button>
                            </p>
                        </div>
                    </div>
                </section>
            `;
        }

        function getRegisterView() {
            return `
                <section class="py-16 bg-slate-100 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
                    <div class="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6">
                        <div class="text-center space-y-2">
                            <div class="bg-emerald-600 text-white w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-xl shadow-md shadow-emerald-200">
                                <i class="fa-solid fa-user-plus"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-slate-900">Customer & Staff Registration</h2>
                            <p class="text-xs text-slate-500">Create your account to unlock Find Pharmacy (AI), AI Assistant, and Feedback.</p>
                        </div>

                        <form onsubmit="handleRegister(event)" class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                                <input type="text" id="reg-name" required placeholder="Enter your full name" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50/50">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                                <input type="email" id="reg-email" required placeholder="Enter your email" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50/50">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
                                <input type="password" id="reg-password" required placeholder="Create a password" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50/50">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Account Role</label>
                                <select id="reg-role" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50/50">
                                    <option value="customer">Customer</option>
                                    <option value="pharmacist">Pharmacist</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-md shadow-emerald-200 text-sm">
                                Complete Registration
                            </button>
                        </form>

                        <div class="border-t border-slate-100 pt-4 text-center">
                            <p class="text-xs text-slate-600">
                                Already registered? <button onclick="router.navigate('login')" class="text-emerald-600 font-bold hover:underline">Sign In</button>
                            </p>
                        </div>
                    </div>
                </section>
            `;
        }

        async function handleLogin(event) {
            event.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const res = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                if (!res.ok) {
                    throw new Error("Invalid email or password.");
                }
                const user = await res.json();
                state.currentUser = user;
                localStorage.setItem('pharma_user', JSON.stringify(user));
                showToast(`Welcome back, ${user.name}! Find Pharmacy & Feedback are now unlocked.`, "success");
                router.navigate('dashboard');
            } catch (err) {
                showToast(err.message, "error");
            }
        }

        async function handleRegister(event) {
            event.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role').value;

            try {
                const res = await fetch(`${API_BASE}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.detail || "Registration failed.");
                }
                const user = await res.json();
                state.currentUser = user;
                localStorage.setItem('pharma_user', JSON.stringify(user));
                showToast("Registration complete! Welcome to PharmaCare Pro.", "success");
                router.navigate('dashboard');
            } catch (err) {
                showToast(err.message, "error");
            }
        }

        function logout() {
            state.currentUser = null;
            state.aiRecommendation = null;
            state.aiRankedPharmacies = [];
            localStorage.removeItem('pharma_user');
            showToast("Logged out successfully.", "info");
            router.navigate('home');
        }

        // --- AI Assistant Handlers (Both Dashboard Embedded & Floating Widget) ---
        async function queryAIAssistantAPI(userText) {
            state.chatHistory.push({ sender: 'user', text: userText });
            renderChatHistories();

            try {
                const res = await fetch(`${API_BASE}/ai/assistant`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: userText,
                        customer_name: state.currentUser ? state.currentUser.name : "Patient"
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    state.chatHistory.push({ sender: 'ai', text: data.reply });
                } else {
                    state.chatHistory.push({ sender: 'ai', text: "I am currently having trouble connecting to the server. Please try again." });
                }
            } catch (e) {
                state.chatHistory.push({ sender: 'ai', text: "Please ensure the FastAPI backend (`python main.py`) is running to receive live AI responses." });
            }
            renderChatHistories();
        }

        function renderChatHistories() {
            const formattedHTML = state.chatHistory.map(m => {
                if (m.sender === 'user') {
                    return `<div class="flex justify-end"><div class="bg-emerald-600 text-white px-3.5 py-2.5 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm">${m.text}</div></div>`;
                } else {
                    const cleanText = m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return `<div class="flex justify-start"><div class="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm leading-relaxed">${cleanText}</div></div>`;
                }
            }).join('');

            const floatingBox = document.getElementById('floating-chat-messages');
            if (floatingBox) {
                floatingBox.innerHTML = formattedHTML;
                floatingBox.scrollTop = floatingBox.scrollHeight;
            }

            const dashBox = document.getElementById('dashboard-ai-messages');
            if (dashBox) {
                dashBox.innerHTML = formattedHTML;
                dashBox.scrollTop = dashBox.scrollHeight;
            }
        }

        function sendFloatingAIMessage(event) {
            event.preventDefault();
            const input = document.getElementById('floating-ai-input');
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            queryAIAssistantAPI(text);
        }

        function sendDashboardAIMessage(event) {
            event.preventDefault();
            const input = document.getElementById('dashboard-ai-input');
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            queryAIAssistantAPI(text);
        }

        function askQuickAIPrompt(promptText) {
            queryAIAssistantAPI(promptText);
        }

        // --- Customer Dashboard (Includes Embedded AI Assistant + Quick Access to AI Pharmacy Finder & Feedback) ---
        function getCustomerDashboardView() {
            return `
                <section class="py-10 bg-slate-50 flex-1 px-4 sm:px-6 lg:px-8">
                    <div class="max-w-7xl mx-auto space-y-8">
                        <!-- Welcome Header -->
                        <div class="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <span class="text-xs uppercase font-bold tracking-wider text-emerald-300">Authenticated Patient Portal</span>
                                <h2 class="text-2xl sm:text-3xl font-bold mt-1">Welcome, ${state.currentUser.name}</h2>
                                <p class="text-emerald-100 text-sm mt-1">Use our AI Assistant, find the nearest pharmacy with AI recommendations, order stock, or leave feedback.</p>
                            </div>
                            <div class="flex flex-wrap items-center gap-3">
                                <button onclick="router.navigate('finder')" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition text-xs flex items-center space-x-2 shadow-md">
                                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                                    <span>AI Find Nearest Pharmacy</span>
                                </button>
                                <button onclick="router.navigate('feedback')" class="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-4 py-2.5 rounded-xl transition text-xs flex items-center space-x-2">
                                    <i class="fa-solid fa-comments"></i>
                                    <span>Leave Feedback</span>
                                </button>
                            </div>
                        </div>

                        <!-- Customer Grid -->
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <!-- Left Column: AI Assistant + Prescription Upload + Quick Order -->
                            <div class="lg:col-span-1 space-y-8">
                                <!-- Embedded AI Assistant Card -->
                                <div class="bg-white border border-emerald-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                                    <div class="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center space-x-3">
                                        <div class="bg-white/20 p-2 rounded-xl">
                                            <i class="fa-solid fa-robot text-lg"></i>
                                        </div>
                                        <div>
                                            <h3 class="font-bold text-sm">PharmaCare AI Assistant</h3>
                                            <p class="text-[11px] text-emerald-100">Ask about symptoms, stock & dosages</p>
                                        </div>
                                    </div>
                                    <div id="dashboard-ai-messages" class="p-4 h-56 overflow-y-auto space-y-3 bg-slate-50 text-xs">
                                        ${state.chatHistory.map(m => {
                                            if (m.sender === 'user') {
                                                return `<div class="flex justify-end"><div class="bg-emerald-600 text-white px-3.5 py-2.5 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm">${m.text}</div></div>`;
                                            } else {
                                                const cleanText = m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                                return `<div class="flex justify-start"><div class="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm leading-relaxed">${cleanText}</div></div>`;
                                            }
                                        }).join('')}
                                    </div>
                                    <div class="px-3 py-2 bg-slate-100 flex flex-wrap gap-1.5 border-t border-slate-200">
                                        <button onclick="askQuickAIPrompt('What do you have for headache?')" class="text-[10px] bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg transition">Headache relief?</button>
                                        <button onclick="askQuickAIPrompt('What medicines are in stock?')" class="text-[10px] bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg transition">Check stock</button>
                                        <button onclick="askQuickAIPrompt('Find nearest pharmacy')" class="text-[10px] bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg transition">Nearest branch</button>
                                    </div>
                                    <form onsubmit="sendDashboardAIMessage(event)" class="p-3 bg-white border-t border-slate-100 flex space-x-2">
                                        <input type="text" id="dashboard-ai-input" required placeholder="Type your health question..." class="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600 bg-slate-50">
                                        <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition">Send</button>
                                    </form>
                                </div>

                                <!-- Prescription Upload Card -->
                                <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                    <div class="flex items-center space-x-3 pb-3 border-b border-slate-100">
                                        <div class="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl">
                                            <i class="fa-solid fa-file-prescription text-lg"></i>
                                        </div>
                                        <div>
                                            <h3 class="font-bold text-slate-900 text-base">Upload Prescription</h3>
                                            <p class="text-xs text-slate-500">Send doctor notes for quick refill</p>
                                        </div>
                                    </div>
                                    <form onsubmit="handlePrescriptionUpload(event)" class="space-y-4">
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Medicine / Notes</label>
                                            <input type="text" id="rx-med-name" required placeholder="e.g., Amoxicillin 500mg" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Prescription File (PDF/Image)</label>
                                            <input type="file" id="rx-file" required class="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100">
                                        </div>
                                        <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition text-sm shadow-sm">
                                            Submit Prescription
                                        </button>
                                    </form>
                                </div>

                                <!-- Account Settings / Edit Profile Card -->
                                <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                    <div class="flex items-center space-x-3 pb-3 border-b border-slate-100">
                                        <div class="bg-teal-100 text-teal-600 p-2.5 rounded-xl">
                                            <i class="fa-solid fa-user-gear text-lg"></i>
                                        </div>
                                        <div>
                                            <h3 class="font-bold text-slate-900 text-base">Account Settings</h3>
                                            <p class="text-xs text-slate-500">Update your email & phone number</p>
                                        </div>
                                    </div>
                                    <form onsubmit="handleProfileUpdate(event)" class="space-y-4">
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                                            <input type="text" id="profile-name" required value="${state.currentUser.name}" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                                            <input type="email" id="profile-email" required value="${state.currentUser.email || ''}" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                                            <input type="text" id="profile-phone" required value="${state.currentUser.phone || '+251 33 551 0001'}" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50">
                                        </div>
                                        <button type="submit" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl transition text-sm shadow-sm">
                                            Save Profile Changes
                                        </button>
                                    </form>
                                </div>
                            </div>

                            <!-- Right Column: Medicine Search & Order History -->
                            <div class="lg:col-span-2 space-y-8">
                                <!-- Medicine Search & Availability -->
                                <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100">
                                        <div>
                                            <h3 class="font-bold text-slate-900 text-base">Live Medicine Stock & Ordering</h3>
                                            <p class="text-xs text-slate-500">Search verified stock and order immediately</p>
                                        </div>
                                        <div class="w-full sm:w-64">
                                            <input type="text" id="inventory-search-input" onkeyup="filterInventory()" placeholder="Search medicine..." class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600 bg-slate-50">
                                        </div>
                                    </div>
                                    <div class="overflow-x-auto">
                                        <table class="w-full text-left text-xs">
                                            <thead class="bg-slate-50 text-slate-600 uppercase font-semibold">
                                                <tr>
                                                    <th class="p-3">Medicine Name</th>
                                                    <th class="p-3">Category</th>
                                                    <th class="p-3">Stock Status</th>
                                                    <th class="p-3">Price</th>
                                                    <th class="p-3 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody id="customer-inventory-table" class="divide-y divide-slate-100">
                                                ${renderCustomerInventoryRows(state.inventory)}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <!-- Order & Prescription History -->
                                <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                    <h3 class="font-bold text-slate-900 text-base pb-3 border-b border-slate-100">My Orders & Refills</h3>
                                    <div class="overflow-x-auto">
                                        <table class="w-full text-left text-xs">
                                            <thead class="bg-slate-50 text-slate-600 uppercase font-semibold">
                                                <tr>
                                                    <th class="p-3">Order ID</th>
                                                    <th class="p-3">Notes / Type</th>
                                                    <th class="p-3">Medicine</th>
                                                    <th class="p-3">Qty</th>
                                                    <th class="p-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100">
                                                ${state.orders.map(o => `
                                                    <tr>
                                                        <td class="p-3 font-bold text-slate-800">#${o.id}</td>
                                                        <td class="p-3 text-slate-600">${o.prescription_notes || 'Stock Order'}</td>
                                                        <td class="p-3 text-slate-800 font-medium">${o.medicine_name}</td>
                                                        <td class="p-3 text-slate-600">${o.quantity}</td>
                                                        <td class="p-3">
                                                            <span class="px-2.5 py-1 rounded-full font-semibold text-[10px] ${o.status === 'Ready for Pickup' ? 'bg-emerald-100 text-emerald-700' : o.status === 'Pending Review' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}">${o.status}</span>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            `;
        }

        function renderCustomerInventoryRows(items) {
            return items.map(item => {
                const isExpired = item.expiry_status === 'Expired';
                return `
                    <tr class="hover:bg-slate-50 transition">
                        <td class="p-3 font-bold text-slate-800">${item.name}</td>
                        <td class="p-3 text-slate-600">${item.category}</td>
                        <td class="p-3">
                            ${isExpired 
                                ? '<span class="px-2 py-0.5 rounded font-semibold text-[10px] bg-rose-100 text-rose-700">Expired (Unavailable)</span>'
                                : `<span class="px-2 py-0.5 rounded font-semibold text-[10px] ${item.quantity > 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${item.quantity > 0 ? `${item.quantity} in stock` : 'Out of Stock'}</span>`
                            }
                        </td>
                        <td class="p-3 font-bold text-emerald-600">$${item.price.toFixed(2)}</td>
                        <td class="p-3 text-right">
                            ${isExpired 
                                ? '<span class="text-slate-400 text-[10px]">Unavailable</span>'
                                : `<button onclick="quickOrderMedicine('${item.name}')" class="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 px-3 py-1.5 rounded-lg font-semibold transition text-xs">Order</button>`
                            }
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function filterInventory() {
            const query = document.getElementById('inventory-search-input').value.toLowerCase();
            const filtered = state.inventory.filter(i => i.name.toLowerCase().includes(query) || i.category.toLowerCase().includes(query));
            document.getElementById('customer-inventory-table').innerHTML = renderCustomerInventoryRows(filtered);
        }

        async function handlePrescriptionUpload(event) {
            event.preventDefault();
            const med = document.getElementById('rx-med-name').value;
            try {
                await fetch(`${API_BASE}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_name: state.currentUser.name,
                        medicine_name: med,
                        quantity: 1,
                        prescription_notes: "Prescription Upload"
                    })
                });
            } catch (e) { console.warn(e); }

            showToast("Prescription uploaded successfully and sent to pharmacist queue!", "success");
            router.navigate('dashboard');
        }

        async function quickOrderMedicine(medName) {
            try {
                await fetch(`${API_BASE}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_name: state.currentUser.name,
                        medicine_name: medName,
                        quantity: 1,
                        prescription_notes: "Direct Order"
                    })
                });
            } catch (e) { console.warn(e); }

            showToast(`Order placed for ${medName}!`, "success");
            router.navigate('dashboard');
        }

        // --- Pharmacist / Admin Dashboard with Expiry Alerts ---
        function getPharmacistDashboardView() {
            const expiredOrSoon = state.inventory.filter(i => i.expiry_status === 'Expired' || i.expiry_status === 'Expiring Soon');

            return `
                <section class="py-10 bg-slate-50 flex-1 px-4 sm:px-6 lg:px-8">
                    <div class="max-w-7xl mx-auto space-y-8">
                        <!-- Welcome Header -->
                        <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <span class="text-xs uppercase font-bold tracking-wider text-emerald-400">Pharmacist & Admin Portal</span>
                                <h2 class="text-2xl sm:text-3xl font-bold mt-1">Dashboard - ${state.currentUser.name}</h2>
                                <p class="text-slate-300 text-sm mt-1">Add stock, monitor expiration alerts, remove expired items, and fulfill patient orders.</p>
                            </div>
                            <button onclick="openAddStockModal()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition text-sm flex items-center space-x-2">
                                <i class="fa-solid fa-plus"></i>
                                <span>Add New Stock Item</span>
                            </button>
                        </div>

                        <!-- Expiry Alert Banner -->
                        ${expiredOrSoon.length > 0 ? `
                            <div class="bg-rose-50 border-l-4 border-rose-600 p-5 rounded-2xl shadow-sm flex items-start space-x-4">
                                <div class="bg-rose-100 text-rose-600 p-2.5 rounded-xl">
                                    <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                                </div>
                                <div>
                                    <h3 class="font-bold text-rose-900 text-base">Medication Expiry Alert (${expiredOrSoon.length} Items Attention Required)</h3>
                                    <p class="text-xs text-rose-700 mt-1">
                                        The following items are expired or expiring soon: 
                                        <strong>${expiredOrSoon.map(i => `${i.name} (${i.expiry_status}: ${i.expiry_date})`).join(', ')}</strong>. 
                                        Please remove expired stock immediately to ensure patient safety.
                                    </p>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Two Main Sections: Inventory Management & Prescription Queue -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <!-- Inventory Management -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                <div class="flex justify-between items-center pb-3 border-b border-slate-100">
                                    <div>
                                        <h3 class="font-bold text-slate-900 text-base">Inventory & Expiry Monitor</h3>
                                        <p class="text-xs text-slate-500">Live stock counts, expiry dates, and removal</p>
                                    </div>
                                    <span class="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">${state.inventory.length} Items</span>
                                </div>
                                <div class="overflow-x-auto max-h-[450px] overflow-y-auto">
                                    <table class="w-full text-left text-xs">
                                        <thead class="bg-slate-50 text-slate-600 uppercase font-semibold sticky top-0">
                                            <tr>
                                                <th class="p-3">Medicine</th>
                                                <th class="p-3">Stock</th>
                                                <th class="p-3">Expiry</th>
                                                <th class="p-3">Status</th>
                                                <th class="p-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100">
                                            ${state.inventory.map(item => {
                                                let badge = '<span class="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-100 text-emerald-700">Valid</span>';
                                                if (item.expiry_status === 'Expired') {
                                                    badge = '<span class="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-rose-100 text-rose-700"><i class="fa-solid fa-circle-exclamation mr-1"></i>Expired</span>';
                                                } else if (item.expiry_status === 'Expiring Soon') {
                                                    badge = '<span class="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-amber-100 text-amber-700">Expiring Soon</span>';
                                                }
                                                return `
                                                    <tr>
                                                        <td class="p-3 font-bold text-slate-800">${item.name}<div class="text-[10px] text-slate-400 font-normal">${item.category} • $${item.price.toFixed(2)}</div></td>
                                                        <td class="p-3 font-semibold text-slate-700">${item.quantity}</td>
                                                        <td class="p-3 text-slate-600">${item.expiry_date}</td>
                                                        <td class="p-3">${badge}</td>
                                                        <td class="p-3 text-right space-x-1">
                                                            <button onclick="updateStockPrompt(${item.id}, ${item.quantity}, '${item.name}')" class="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition" title="Update Stock"><i class="fa-solid fa-pen"></i></button>
                                                            <button onclick="deleteStockItem(${item.id})" class="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-2 py-1 rounded transition font-semibold text-[10px]" title="Remove Item"><i class="fa-solid fa-trash mr-1"></i>Remove</button>
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Prescription Fulfillment Queue -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                <div class="flex justify-between items-center pb-3 border-b border-slate-100">
                                    <div>
                                        <h3 class="font-bold text-slate-900 text-base">Prescription Fulfillment Queue</h3>
                                        <p class="text-xs text-slate-500">Review and fulfill patient orders</p>
                                    </div>
                                    <span class="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">${state.orders.length} Orders</span>
                                </div>
                                <div class="overflow-x-auto max-h-[450px] overflow-y-auto">
                                    <table class="w-full text-left text-xs">
                                        <thead class="bg-slate-50 text-slate-600 uppercase font-semibold sticky top-0">
                                            <tr>
                                                <th class="p-3">Order ID</th>
                                                <th class="p-3">Customer</th>
                                                <th class="p-3">Items</th>
                                                <th class="p-3">Status</th>
                                                <th class="p-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100">
                                            ${state.orders.map(o => `
                                                <tr>
                                                    <td class="p-3 font-bold text-slate-800">#${o.id}</td>
                                                    <td class="p-3 text-slate-600">${o.customer_name}</td>
                                                    <td class="p-3 text-slate-800 font-medium">${o.medicine_name} (${o.quantity}x)</td>
                                                    <td class="p-3">
                                                        <span class="px-2.5 py-1 rounded-full font-semibold text-[10px] ${o.status === 'Ready for Pickup' ? 'bg-emerald-100 text-emerald-700' : o.status === 'Pending Review' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}">${o.status}</span>
                                                    </td>
                                                    <td class="p-3 text-right">
                                                        <button onclick="fulfillOrder(${o.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-semibold transition text-[10px]">Fulfill</button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Modal for Adding Stock -->
                <div id="stock-modal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div class="flex justify-between items-center pb-3 border-b border-slate-100">
                            <h3 class="font-bold text-slate-900 text-base">Add New Pharmaceutical Stock</h3>
                            <button onclick="closeAddStockModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <form onsubmit="handleAddStock(event)" class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Medicine Name</label>
                                <input type="text" id="new-stock-name" required placeholder="e.g., Azithromycin 250mg" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                                <input type="text" id="new-stock-category" required placeholder="e.g., Antibiotics" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50">
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Stock Quantity</label>
                                    <input type="number" id="new-stock-qty" required min="1" value="100" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Price ($)</label>
                                    <input type="number" step="0.01" id="new-stock-price" required min="0.5" value="19.99" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Expiry Date</label>
                                <input type="date" id="new-stock-expiry" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50">
                            </div>
                            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                <button type="button" onclick="closeAddStockModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                                <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition">Save Stock Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }

        function openAddStockModal() {
            document.getElementById('stock-modal').classList.remove('hidden');
        }

        function closeAddStockModal() {
            document.getElementById('stock-modal').classList.add('hidden');
        }

        async function handleAddStock(event) {
            event.preventDefault();
            const name = document.getElementById('new-stock-name').value;
            const category = document.getElementById('new-stock-category').value;
            const quantity = parseInt(document.getElementById('new-stock-qty').value);
            const price = parseFloat(document.getElementById('new-stock-price').value);
            const expiry_date = document.getElementById('new-stock-expiry').value;

            try {
                await fetch(`${API_BASE}/inventory`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, category, quantity, price, expiry_date })
                });
            } catch (e) { console.warn(e); }

            closeAddStockModal();
            showToast(`Successfully added ${name} to inventory stock!`, "success");
            router.navigate('dashboard');
        }

        async function updateStockPrompt(id, currentQty, name) {
            const newStock = prompt(`Update stock quantity for ${name}:`, currentQty);
            if (newStock !== null && !isNaN(newStock)) {
                try {
                    await fetch(`${API_BASE}/inventory/${id}?quantity=${parseInt(newStock)}`, { method: 'PUT' });
                } catch (e) { console.warn(e); }
                showToast(`Updated stock for ${name} to ${newStock}`, "success");
                router.navigate('dashboard');
            }
        }

        async function deleteStockItem(id) {
            if (confirm("Are you sure you want to remove this item from inventory?")) {
                try {
                    await fetch(`${API_BASE}/inventory/${id}`, { method: 'DELETE' });
                } catch (e) { console.warn(e); }
                showToast("Stock item removed from inventory.", "info");
                router.navigate('dashboard');
            }
        }

        async function fulfillOrder(orderId) {
            try {
                await fetch(`${API_BASE}/orders/${orderId}/status?status=Ready%20for%20Pickup`, { method: 'PUT' });
            } catch (e) { console.warn(e); }
            showToast(`Order #${orderId} marked as Ready for Pickup!`, "success");
            router.navigate('dashboard');
        }

        
        async function handleProfileUpdate(event) {
            event.preventDefault();
            const name = document.getElementById('profile-name').value;
            const email = document.getElementById('profile-email').value;
            const phone = document.getElementById('profile-phone').value;

            try {
                const res = await fetch(`${API_BASE}/users/${state.currentUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.detail || "Failed to update profile.");
                }
                const updatedUser = await res.json();
                state.currentUser = { ...state.currentUser, ...updatedUser };
                localStorage.setItem('pharma_user', JSON.stringify(state.currentUser));
                showToast("Profile email and phone updated successfully!", "success");
                router.navigate('dashboard');
            } catch (err) {
                showToast(err.message, "error");
            }
        }

        // --- Initial Load ---
        window.onload = function() {
            router.navigate('home');
        };