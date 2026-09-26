import { createClient } from '../firebase-client.js';
import {
  AUTH_MODE,
  MIN_PASSWORD_LENGTH,
  authErrorMessage,
  authModeCopy,
  authRedirectUrl,
  isPasswordLongEnough,
  requiresNewPasswordPolicy
} from '../flashday-auth.mjs';

const $ = (id) => document.getElementById(id);

const form = $('auth-form');
const tabs = document.querySelectorAll('.auth-tab');

const firebaseConfig = __FLASHDAY_FIREBASE_CONFIG__;
const supabase = firebaseConfig?.apiKey && firebaseConfig?.projectId
  ? createClient(firebaseConfig)
  : null;

// Firebase returns password-reset links as ?mode=resetPassword&oobCode=…
// on the continueUrl; hold the code so the form can complete the reset.
const resetParams = new URLSearchParams(window.location.search);
const resetCode = resetParams.get('mode') === 'resetPassword' ? resetParams.get('oobCode') : null;

let mode = AUTH_MODE.SIGN_IN;
let signedInUser = null;

function appUrl() {
  return authRedirectUrl(window.location.origin, '/app/');
}

function recoveryUrl() {
  return authRedirectUrl(window.location.origin, '/login/#recovery');
}

function openAuthenticatedApp(session) {
  if (!session?.access_token || !session.user?.id) {
    throw new Error('FlashDay chưa nhận được phiên đăng nhập.');
  }
  showStatus('Đăng nhập thành công. Đang mở FlashDay…', 'success');
  window.location.assign(appUrl());
}

function showStatus(message, tone = 'info') {
  const node = $('auth-status');
  node.textContent = message;
  node.dataset.tone = tone;
  node.classList.toggle('hidden', !message);
}

function clearStatus() {
  showStatus('');
}

function setBusy(isBusy) {
  const submit = $('auth-submit-btn');
  const provider = $('auth-google-btn');
  submit.disabled = isBusy;
  provider.disabled = isBusy;
  form.setAttribute('aria-busy', String(isBusy));
}

function setMode(nextMode) {
  mode = nextMode;
  const copy = authModeCopy(mode);
  const isRecovery = mode === AUTH_MODE.RECOVERY;
  const isPasswordUpdate = mode === AUTH_MODE.UPDATE_PASSWORD;
  const needsPassword = !isRecovery;
  const needsEmail = !isPasswordUpdate;
  const supportsProvider = mode === AUTH_MODE.SIGN_UP || mode === AUTH_MODE.SIGN_IN;
  const enforcesNewPasswordPolicy = requiresNewPasswordPolicy(mode);

  $('auth-title').textContent = copy.title;
  $('auth-submit-btn').textContent = copy.submit;
  $('password').autocomplete = copy.passwordAutocomplete || 'off';
  $('password').required = needsPassword;
  $('password').minLength = enforcesNewPasswordPolicy ? MIN_PASSWORD_LENGTH : 0;
  $('password').placeholder = enforcesNewPasswordPolicy ? `Ít nhất ${MIN_PASSWORD_LENGTH} ký tự` : 'Mật khẩu của bạn';
  $('email').required = needsEmail;
  $('email-field').classList.toggle('hidden', !needsEmail);
  $('password-field').classList.toggle('hidden', !needsPassword);
  $('password-confirm-field').classList.toggle('hidden', !isPasswordUpdate);
  $('password-confirm').required = isPasswordUpdate;
  $('auth-providers').classList.toggle('hidden', !supportsProvider);
  $('auth-divider').classList.toggle('hidden', !supportsProvider);
  $('forgot-password').classList.toggle('hidden', mode !== AUTH_MODE.SIGN_IN);
  $('return-to-signin').classList.toggle('hidden', !isRecovery);
  $('auth-tabs').classList.toggle('hidden', isRecovery || isPasswordUpdate);
  
  if (isPasswordUpdate) {
    $('auth-sub').textContent = 'Chọn một mật khẩu mới cho tài khoản của bạn.';
  } else if (mode === AUTH_MODE.SIGN_UP) {
    $('auth-sub').textContent = 'Tạo tài khoản để đồng bộ đa nền tảng. Không quảng cáo. Không bullshit.';
  } else if (mode === AUTH_MODE.SIGN_IN) {
    $('auth-sub').textContent = 'Đăng nhập để tiếp tục quá trình ôn tập hôm nay.';
  } else if (mode === AUTH_MODE.RECOVERY) {
    $('auth-sub').textContent = 'Nhập email của bạn để nhận liên kết đặt lại mật khẩu.';
  }

  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === mode));
  clearStatus();
  
  window.history.replaceState(null, '', '#' + mode);
}

async function submitEmailPassword() {
  const email = $('email').value.trim();
  const password = $('password').value;

  if (mode === AUTH_MODE.RECOVERY) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: recoveryUrl() });
    if (error) throw error;
    showStatus('Nếu địa chỉ này có tài khoản, FlashDay đã gửi email đặt lại mật khẩu.', 'success');
    return;
  }

  if (requiresNewPasswordPolicy(mode) && !isPasswordLongEnough(password)) {
    showStatus(`Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`, 'error');
    return;
  }

  if (mode === AUTH_MODE.UPDATE_PASSWORD) {
    if (password !== $('password-confirm').value) {
      showStatus('Hai mật khẩu mới chưa trùng nhau.', 'error');
      return;
    }
    if (!resetCode) {
      showStatus('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.', 'error');
      return;
    }
    const { data, error } = await supabase.auth.completePasswordReset(resetCode, password);
    if (error) throw error;
    openAuthenticatedApp(data.session);
    return;
  }

  if (mode === AUTH_MODE.SIGN_UP) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: appUrl() }
    });
    if (error) throw error;
    if (data.session) {
      openAuthenticatedApp(data.session);
      return;
    }
    setMode(AUTH_MODE.SIGN_IN);
    $('email').value = email;
    showStatus('Hãy kiểm tra inbox để xác nhận email, rồi đăng nhập.', 'success');
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  openAuthenticatedApp(data.session);
}

function validateSubmission() {
  const email = $('email');
  const password = $('password');

  if (mode !== AUTH_MODE.UPDATE_PASSWORD && !email.validity.valid) {
    showStatus('Nhập một địa chỉ email hợp lệ.', 'error');
    email.focus();
    return false;
  }
  if (mode !== AUTH_MODE.RECOVERY && !password.value) {
    showStatus('Nhập mật khẩu để tiếp tục.', 'error');
    password.focus();
    return false;
  }
  return true;
}

async function submitGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: appUrl() }
  });
  if (error) throw error;
}

tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.tab)));

$('forgot-password').addEventListener('click', () => setMode(AUTH_MODE.RECOVERY));
$('return-to-signin').addEventListener('click', () => setMode(AUTH_MODE.SIGN_IN));

$('auth-google-btn').addEventListener('click', async () => {
  if (!supabase) {
    showStatus('Đăng nhập chưa được cấu hình. Hãy thử lại sau.', 'error');
    return;
  }
  setBusy(true);
  try {
    await submitGoogle();
  } catch (error) {
    showStatus(authErrorMessage(error), 'error');
    setBusy(false);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) {
    showStatus('Đăng nhập chưa được cấu hình. Hãy thử lại sau.', 'error');
    return;
  }
  if (!validateSubmission()) return;
  setBusy(true);
  try {
    await submitEmailPassword();
  } catch (error) {
    showStatus(authErrorMessage(error), 'error');
  } finally {
    setBusy(false);
  }
});

// Initialize mode: a Firebase oobCode reset link wins over the URL hash,
// then fall back to ?…#signup / #signin style deep links.
const hashMode = window.location.hash.replace('#', '');
if (resetCode) {
  setMode(AUTH_MODE.UPDATE_PASSWORD);
} else if (Object.values(AUTH_MODE).includes(hashMode)) {
  setMode(hashMode);
} else {
  setMode(AUTH_MODE.SIGN_IN);
}

if (!supabase) {
  showStatus('Đăng nhập đang được cấu hình. Hãy thử lại sau.', 'error');
} else {
  // Surface a failed Google redirect (unauthorized domain, cancelled sign-in…)
  // instead of silently landing back on this page logged out.
  supabase.auth.getRedirectResult().then(({ error }) => {
    if (error) showStatus(authErrorMessage(error), 'error');
  });

  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      showStatus(authErrorMessage(error), 'error');
      return;
    }
    signedInUser = data.session?.user || null;
    const isRecovering = mode === AUTH_MODE.UPDATE_PASSWORD || mode === AUTH_MODE.RECOVERY;
    if (signedInUser && !isRecovering) {
      window.location.assign(appUrl());
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    signedInUser = session?.user || null;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    });
  }
});
