import { createClient } from '../firebase-client.js';
import { detectStorageBlocking } from '../cloud-compat.mjs';
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
const client = firebaseConfig?.apiKey && firebaseConfig?.projectId
  ? createClient(firebaseConfig)
  : null;

// Firebase email-action links arrive as ?mode=…&oobCode=… on the
// continueUrl: resetPassword, verifyEmail and recoverEmail.
const actionParams = new URLSearchParams(window.location.search);
const actionMode = actionParams.get('mode');
const actionCode = actionParams.get('oobCode');
const resetCode = actionMode === 'resetPassword' ? actionCode : null;
// Set by the /app/ route guard when Firebase restores no session there.
const sessionLost = actionParams.get('session') === 'lost';

let mode = AUTH_MODE.SIGN_IN;
let signedInUser = null;

function appUrl() {
  return authRedirectUrl(window.location.origin, '/app/');
}

function recoveryUrl() {
  // After the hosted reset page finishes, "Continue" should land on a clean
  // sign-in form — not back on the "send another reset email" screen.
  return authRedirectUrl(window.location.origin, '/login/');
}

function openAuthenticatedApp(session) {
  if (!session?.user?.id) {
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
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: recoveryUrl() });
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
    const { data, error } = await client.auth.completePasswordReset(resetCode, password);
    if (error) throw error;
    openAuthenticatedApp(data.session);
    return;
  }

  if (mode === AUTH_MODE.SIGN_UP) {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirectUrl(window.location.origin, '/login/#signin') }
    });
    if (error) throw error;
    if (data.session) {
      openAuthenticatedApp(data.session);
      return;
    }
    setMode(AUTH_MODE.SIGN_IN);
    $('email').value = email;
    showStatus(
      data?.verificationError
        ? 'Tài khoản đã tạo nhưng chưa gửi được email xác nhận. Đăng nhập để nhận lại link.'
        : 'Hãy kiểm tra inbox để xác nhận email, rồi đăng nhập.',
      data?.verificationError ? 'error' : 'success'
    );
    return;
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });
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
  // Popup-first inside the shim: a resolved session opens the app directly;
  // the redirect fallback path lands back here and routes via getSession().
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: appUrl() }
  });
  if (error) throw error;
  if (data?.session) {
    openAuthenticatedApp(data.session);
    return;
  }
  if (data?.cancelled) {
    // The popup closed without producing a session. popup-closed-by-user is
    // also Firebase's verdict when the helper iframe is blocked and the
    // completed auth event never reaches this page — so name both causes.
    const storage = await detectStorageBlocking();
    showStatus(
      storage.blocked
        ? 'Cửa sổ Google đã đóng nhưng phiên không về được — trình duyệt đang chặn lưu trữ/iframe của Firebase. Tắt extension chặn tracker (uBlock, Privacy Badger…) cho trang này, hoặc đăng nhập bằng email/mật khẩu.'
        : 'Cửa sổ đăng nhập Google đã đóng trước khi hoàn tất. Nếu bạn đã đăng nhập xong mà vẫn kẹt ở đây, một extension đang chặn Firebase — thử tắt nó hoặc dùng email/mật khẩu.',
      'error'
    );
  }
}

tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.tab)));

$('forgot-password').addEventListener('click', () => setMode(AUTH_MODE.RECOVERY));
$('return-to-signin').addEventListener('click', () => setMode(AUTH_MODE.SIGN_IN));

$('auth-google-btn').addEventListener('click', async () => {
  if (!client) {
    showStatus('Đăng nhập chưa được cấu hình. Hãy thử lại sau.', 'error');
    return;
  }
  setBusy(true);
  showStatus('Đang chờ Google xác thực…', 'info');
  try {
    await submitGoogle();
    // Resolving without navigation means a cancelled popup or a redirect
    // fallback that's still completing — either way the button must be
    // usable again for a retry.
    setBusy(false);
  } catch (error) {
    showStatus(authErrorMessage(error), 'error');
    setBusy(false);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client) {
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

// Email-action links other than password reset (address verification, email
// recovery) are applied in place — the hosted handler only runs when the
// console keeps the default action URL.
if (client && actionCode && (actionMode === 'verifyEmail' || actionMode === 'recoverEmail')) {
  // Drop the one-time code from the address bar immediately; it stays valid
  // in memory for the apply call below.
  window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  client.auth.applyActionCode(actionCode).then(({ error }) => {
    if (error) {
      showStatus(authErrorMessage(error), 'error');
    } else {
      showStatus(
        actionMode === 'verifyEmail'
          ? 'Email đã xác nhận. Đăng nhập để bắt đầu ôn tập.'
          : 'Email đã khôi phục. Đăng nhập lại và đổi mật khẩu ngay.',
        'success'
      );
    }
  });
}

if (!client) {
  showStatus('Đăng nhập đang được cấu hình. Hãy thử lại sau.', 'error');
} else {
  // Surface a failed Google redirect (unauthorized domain, cancelled sign-in…)
  // instead of silently landing back on this page logged out.
  client.auth.getRedirectResult().then(({ error }) => {
    if (error) showStatus(authErrorMessage(error), 'error');
  });

  const inRecoveryFlow = () =>
    mode === AUTH_MODE.UPDATE_PASSWORD || mode === AUTH_MODE.RECOVERY;

  const returnedFromAuthHandler = /firebaseapp\.com|accounts\.google\.com|\/__\/auth\//
    .test(document.referrer || '');

  // The auth handler navigates the popup window back to this page after
  // delivering the credential to the opener. When that happens the opener
  // is already routing to /app/ — running the full login flow in the popup
  // just flashes the form (or worse, /app/) inside a tiny window. Same-origin
  // now, so window.close() is allowed and the popup disappears immediately.
  if (window.opener) {
    showStatus('Đang hoàn tất đăng nhập…', 'info');
    window.close();
  } else {

  // Returning from the auth round-trip means a session is being resolved —
  // show progress instead of a silent form flash.
  if (returnedFromAuthHandler && !resetCode) {
    showStatus('Đang hoàn tất đăng nhập Google…', 'info');
  }

  client.auth.getSession().then(({ data, error }) => {
    if (error) {
      showStatus(authErrorMessage(error), 'error');
      return;
    }
    signedInUser = data.session?.user || null;
    if (signedInUser && !inRecoveryFlow()) {
      window.location.assign(appUrl());
      return;
    }
    // Came back from the auth handler but no session exists — the redirect
    // state was likely lost (blocked sessionStorage, cross-tab handoff…).
    // Give SIGNED_IN a grace window to fire before warning the learner.
    if (returnedFromAuthHandler && !inRecoveryFlow()) {
      window.setTimeout(() => {
        if (!signedInUser) {
          showStatus(
            'Google đã trả về nhưng phiên chưa được tạo — trình duyệt có thể đang chặn lưu trữ phiên. Hãy bấm Google lần nữa hoặc dùng email/mật khẩu.',
            'error'
          );
        }
      }, 2500);
    }
  });

  client.auth.onAuthStateChange((event, session) => {
    signedInUser = session?.user || null;
    // getRedirectResult() resolves asynchronously and can finish AFTER
    // getSession() already observed a null session. Without this branch a
    // slow Google round-trip signs the learner in but strands them here.
    if (event === 'SIGNED_IN' && signedInUser && !inRecoveryFlow()) {
      window.location.assign(appUrl());
    }
  });

  // A blocked IndexedDB means the session dies on every navigation — that is
  // the login→app→login loop. sessionStorage blocked only breaks the Google
  // popup/redirect handoff; email+password still works. Real auth errors
  // already on screen take precedence over this diagnostic.
  detectStorageBlocking().then((storage) => {
    if (!$('auth-status').classList.contains('hidden')) return;
    if (!storage.indexedDB) {
      showStatus(
        'Trình duyệt đang chặn bộ nhớ trang web (IndexedDB) nên phiên đăng nhập không lưu được qua mỗi lần chuyển trang. Tắt chế độ ẩn danh/extension chặn tracker hoặc đổi trình duyệt, rồi tải lại.',
        'error'
      );
    } else if (!storage.sessionStorage) {
      showStatus(
        'Trình duyệt đang chặn sessionStorage — đăng nhập Google có thể không hoàn tất. Đăng nhập bằng email/mật khẩu vẫn hoạt động.',
        'error'
      );
    } else if (sessionLost) {
      showStatus(
        'Phiên đăng nhập không được giữ sau khi chuyển trang. Hãy thử lại — nếu vẫn lặp lại, kiểm tra chế độ ẩn danh hoặc extension chặn tracker.',
        'error'
      );
    }
  });
  }
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
