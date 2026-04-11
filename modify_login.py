import re

file_path = r"c:\Users\salah\OneDrive\Desktop\nidamka\login.html"

with open(file_path, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Replace body styles
new_body_style = """        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Poppins', sans-serif;
            background: url('education_bg.png') no-repeat center center fixed;
            background-size: cover;
            position: relative;
        }

        body::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.4);
            z-index: 1;
        }"""
html = re.sub(r'body\s*\{\s*background:\s*#1e293b;\s*display:\s*flex;\s*height:\s*100vh;\s*margin:\s*0;\s*overflow:\s*hidden;\s*font-family:\s*\'Poppins\',\s*sans-serif;\s*\}', new_body_style, html)

# 2. Remove split-screen, left-side, right-side, minister-info CSS
html = re.sub(r'\.split-screen\s*\{.*?\/\* Right Side - Login Form \*\/\s*\.right-side\s*\{[^}]*\}', '', html, flags=re.DOTALL)
html = re.sub(r'@keyframes slideInLeft\s*\{.*?\}\s*', '', html, flags=re.DOTALL)
html = re.sub(r'\.left-side\s*\{.*?\}\s*', '', html, flags=re.DOTALL)
html = re.sub(r'\.left-side::after\s*\{.*?\}\s*', '', html, flags=re.DOTALL)
html = re.sub(r'\.minister-info\s*\{.*?\}\s*', '', html, flags=re.DOTALL)
html = re.sub(r'\.minister-info h1\s*\{.*?\}\s*', '', html, flags=re.DOTALL)
html = re.sub(r'\.minister-info \.title\s*\{.*?\}\s*', '', html, flags=re.DOTALL)
html = re.sub(r'\.minister-info \.quote\s*\{.*?\}\s*', '', html, flags=re.DOTALL)
html = re.sub(r'\.right-side\s*\{.*?\}\s*', '', html, flags=re.DOTALL)


# 3. Enhance glassmorphism
old_login_container = """        .login-container {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 3.5rem;
            border-radius: 24px;
            width: 100%;
            max-width: 450px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            animation: fadeIn 1s ease-out 0.3s both;
        }"""
new_login_container = """        .login-container {
            background: rgba(255, 255, 255, 0.08); /* More visible glass */
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 3.5rem;
            border-radius: 24px;
            width: 100%;
            max-width: 450px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
            animation: fadeIn 1s ease-out 0.1s both;
            z-index: 10;
        }
        
        .welcome-text {
            color: #cbd5e1;
            font-size: 0.95rem;
            margin-top: 0.5rem;
            margin-bottom: 2rem;
            line-height: 1.5;
            font-weight: 300;
        }"""
html = html.replace(old_login_container, new_login_container)

# 4. Modify Mobile Adjustments
old_media = re.search(r'\/\* Mobile Adjustments \*\/\s*@media screen and \(max-width: 768px\)\s*\{.*?\}\s*<\/style>', html, flags=re.DOTALL).group(0)
new_media = """/* Mobile Adjustments */
        @media screen and (max-width: 768px) {
            .login-container {
                padding: 2.5rem 2rem;
                margin: 20px;
                border-radius: 16px;
                background: rgba(30, 41, 59, 0.6);
                backdrop-filter: blur(20px);
            }

            .login-header img {
                width: 80px;
                height: 80px;
                margin-bottom: 1rem;
            }

            .login-header h2 {
                font-size: 1.15rem;
            }
            
            .welcome-text {
                font-size: 0.85rem;
                margin-bottom: 1.5rem;
            }
        }
    </style>"""
html = html.replace(old_media, new_media)

# 5. Modify Body HTML logic
old_body_html = """    <div class="split-screen">
        <!-- Left Section: Educational Background -->
        <div class="left-side">
        </div>

        <!-- Right Section: Login Form -->
        <div class="right-side">
            <div class="login-container">
                <div class="login-header">
                    <img src="logo.jpg" alt="Logo">
                    <h2>Nidaamka Maamulka Agabka Xafiiska</h2>
                </div>
                <div id="error-box" class="error-message">Username ama Password-ka waa khalad!</div>
                <form id="login-form">
                    <div class="form-group">
                        <label>Username (Gal Magaca)</label>
                        <div class="input-wrapper">
                            <i class="fa-solid fa-user"></i>
                            <input type="text" id="username" class="form-control" placeholder="Tusaale: salah" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Password (Gal Sirta)</label>
                        <div class="input-wrapper">
                            <i class="fa-solid fa-lock"></i>
                            <input type="password" id="password" class="form-control" placeholder="••••••••" required>
                            <i class="fa-solid fa-eye eye-toggle" id="togglePassword"></i>
                        </div>
                    </div>
                    <button type="submit" class="btn-login">Gal Nidaamka (Sign In)</button>
                </form>
            </div>
        </div>
    </div>"""

# Ensure text and new container wrapper
new_body_html = """    <div class="login-container">
        <div class="login-header">
            <img src="logo.jpg" alt="Logo">
            <h2>Nidaamka Maamulka Agabka</h2>
            <div class="welcome-text">Kusoo dhawoow Nidaamka Casriga ah ee Maamulka Hantida iyo Agabka Waxbarashada.</div>
        </div>
        <div id="error-box" class="error-message">Username ama Password-ka waa khalad!</div>
        <form id="login-form">
            <div class="form-group">
                <label>Username (Gal Magaca)</label>
                <div class="input-wrapper">
                    <i class="fa-solid fa-user"></i>
                    <input type="text" id="username" class="form-control" placeholder="Tusaale: salah" required>
                </div>
            </div>
            <div class="form-group">
                <label>Password (Gal Sirta)</label>
                <div class="input-wrapper">
                    <i class="fa-solid fa-lock"></i>
                    <input type="password" id="password" class="form-control" placeholder="••••••••" required>
                    <i class="fa-solid fa-eye eye-toggle" id="togglePassword"></i>
                </div>
            </div>
            <button type="submit" class="btn-login">Gal Nidaamka (Sign In)</button>
        </form>
    </div>"""

html = html.replace(old_body_html, new_body_html)

# Add a missing semi-colon fixing if needed in any place?
with open(file_path, "w", encoding="utf-8") as f:
    f.write(html)
