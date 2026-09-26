import { createClient } from '../firebase-client.js';
import { detectStorageBlocking } from '../cloud-compat.mjs';
import { authErrorMessage } from '../flashday-auth.mjs';

const $ = (id) => document.getElementById(id);
const client = __FLASHDAY_FIREBASE_CONFIG__?.apiKey
  ? createClient(__FLASHDAY_FIREBASE_CONFIG__)
  : null;

// The redirect round-trip preserves the full URL — the '#return' hash is set
// right before leaving for Google so a partitioned browser (which loses the
// sessionStorage marker AND the redirect state) lands back here distinguishable
// from a fresh arrival, and we show an error instead of looping to Google.
const RETURN_HASH = '#return';
const isReturn = window.location.hash === RETURN_HASH;
const wantsStart =
  new URLSearchParams(window.location.search).get('flow') === 'redirect';

function status(message, tone = 'info') {
  const node = $('auth-status');
  node.textContent = message;
  node.dataset.tone = tone;
}

function fail(message) {
  $('auth-spin').style.display = 'none';
  $('auth-retry').hidden = false;
  status(message, 'error');
}

function enter(session) {
  status('Đăng nhập thành công. Đang mở FlashDay…', 'success');
  window.location.replace('/app/');
}

async function run() {
  if (!client) {
    fail('Đăng nhập chưa được cấu hình. Hãy thử lại sau.');
    return;
  }

  // Warm the app + Firestore while the auth round-trip is in flight.
  import('firebase/firestore');

  // resolve() settles the pending signInWithRedirect if this load is the
  // return leg; otherwise it yields no credential.
  const { data, error } = await client.auth.getRedirectResult();
  if (error) {
    fail(authErrorMessage(error));
    return;
  }
  if (data?.user) {
    enter(data);
    return;
  }

  // A persisted session also counts — the learner may have signed in on
  // another tab while the popup was open.
  const existing = await client.auth.getSession();
  if (existing?.data?.session?.user) {
    enter(existing.data.session);
    return;
  }

  if (isReturn) {
    // Came back from Google but no credential materialised — the browser
    // partitioned/blocked the redirect state. Do NOT start another redirect.
    const storage = await detectStorageBlocking();
    fail(
      storage.blocked
        ? 'Trình duyệt đang chặn lưu trữ phiên nên Google không giao được phiên về. Tắt ẩn danh/extension chặn tracker cho trang này, hoặc đăng nhập bằng email/mật khẩu.'
        : 'Google đã trả về nhưng phiên chưa được tạo. Hãy thử lại, hoặc đăng nhập bằng email/mật khẩu.'
    );
    return;
  }

  if (wantsStart) {
    // First leg: mark this URL so the post-Google return is recognisable even
    // if sessionStorage is partitioned away, then leave for Google.
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search + RETURN_HASH
    );
    const { error: redirectError } =
      await client.auth.startOAuthRedirect('google');
    if (redirectError) fail(authErrorMessage(redirectError));
    return; // page navigates away on success
  }

  // Stray visit — nobody should land here manually.
  window.location.replace('/login/#signin');
}

run();
