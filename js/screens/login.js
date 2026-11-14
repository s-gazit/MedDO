// Login screen: email and password only. No sign-up, no password reset.
import { signIn } from '../auth.js';
import { go } from '../router.js';
import { S } from '../strings.js';

export function renderLogin(app) {
  app.innerHTML = `
    <main class="login-page">
      <div class="login-brand"><span class="brand brand-lg"><img src="./assets/img/logo-mark.png" alt=""><span>${S.appName}</span></span></div>
      <h1>${S.login.title}</h1>
      <form novalidate>
        <div class="form-error" role="alert" hidden></div>
        <div class="field">
          <label for="email">${S.login.email}</label>
          <input class="input" id="email" name="email" type="email" dir="ltr" autocomplete="username" required>
        </div>
        <div class="field">
          <label for="password">${S.login.password}</label>
          <input class="input" id="password" name="password" type="password" dir="ltr" autocomplete="current-password" required>
        </div>
        <button class="btn btn-primary btn-block" type="submit">${S.login.submit}</button>
      </form>
    </main>
    <footer class="disclaimer">${S.disclaimer}</footer>`;

  const form = app.querySelector('form');
  const errorBox = form.querySelector('.form-error');
  const button = form.querySelector('button');

  function showError(text) {
    errorBox.textContent = text;
    errorBox.hidden = false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) return showError(S.login.missing);

    button.disabled = true;
    button.textContent = S.login.submitting;
    const ok = await signIn(email, password).catch(() => false);
    if (ok) return go('/');
    button.disabled = false;
    button.textContent = S.login.submit;
    showError(S.login.error);
  });

  form.email.focus();
}
