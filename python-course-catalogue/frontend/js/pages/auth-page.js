// Login/Register page
const authPage = (() => {
  let mode = 'login'; // 'login' | 'register'

  function render() {
    const container = document.getElementById('auth-page');

    if (mode === 'login') {
      container.innerHTML = `
        <div class="auth-card">
          <h2>Welcome back</h2>
          <p class="auth-subtitle">Sign in to continue your Python journey</p>
          <form class="auth-form" id="login-form">
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="login-email" placeholder="you@example.com" required autocomplete="email" />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="login-password" placeholder="Your password" required autocomplete="current-password" />
            </div>
            <div class="form-error" id="login-error"></div>
            <button type="submit" class="btn btn-primary btn-full btn-lg" id="login-btn">Sign In</button>
          </form>
          <div class="auth-toggle">
            Don't have an account? <a id="switch-to-register">Create one</a>
          </div>
        </div>
      `;

      document.getElementById('login-form').addEventListener('submit', handleLogin);
      document.getElementById('switch-to-register').addEventListener('click', () => {
        mode = 'register';
        render();
      });
    } else {
      container.innerHTML = `
        <div class="auth-card">
          <h2>Create account</h2>
          <p class="auth-subtitle">Start your Python journey today</p>
          <form class="auth-form" id="register-form">
            <div class="form-group">
              <label>Username</label>
              <input type="text" id="reg-username" placeholder="yourname" required autocomplete="username" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="reg-email" placeholder="you@example.com" required autocomplete="email" />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="reg-password" placeholder="Minimum 8 characters" required autocomplete="new-password" />
            </div>
            <div class="form-error" id="register-error"></div>
            <button type="submit" class="btn btn-primary btn-full btn-lg" id="register-btn">Create Account</button>
          </form>
          <div class="auth-toggle">
            Already have an account? <a id="switch-to-login">Sign in</a>
          </div>
        </div>
      `;

      document.getElementById('register-form').addEventListener('submit', handleRegister);
      document.getElementById('switch-to-login').addEventListener('click', () => {
        mode = 'login';
        render();
      });
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errorEl = document.getElementById('login-error');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorEl.classList.remove('visible');

    try {
      const data = await api.login({ email, password });
      auth.setToken(data.access_token);
      await app.loadUserData();
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed';
      errorEl.classList.add('visible');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('register-btn');
    const errorEl = document.getElementById('register-error');
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    btn.disabled = true;
    btn.textContent = 'Creating account...';
    errorEl.classList.remove('visible');

    try {
      const data = await api.register({ username, email, password });
      auth.setToken(data.access_token);
      await app.loadUserData();
      toast.success('Account created! Welcome!');
    } catch (err) {
      errorEl.textContent = err.message || 'Registration failed';
      errorEl.classList.add('visible');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  }

  return { render };
})();
