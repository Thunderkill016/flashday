import { createClient } from './firebase-client.js';

export const MIN_PASSWORD_LENGTH = 8;

// One place that knows how to turn the vite-injected config into a usable
// client — every auth entrypoint (/login/, /auth/) shares this.
export function createFlashdayClient(config) {
  return config?.apiKey && config?.projectId ? createClient(config) : null;
}

// Every path that ends in "open the app" funnels through this so the handoff
// always shows a success state before navigating — the browser keeps the old
// page painted until /app/ renders, and a silent form looks like a crash.
export function enterApp(session, statusEl, { fresh = true, replace = false } = {}) {
  if (!session?.user?.id) {
    throw new Error('FlashDay chưa nhận được phiên đăng nhập.');
  }
  if (statusEl) {
    statusEl.textContent = fresh
      ? 'Đăng nhập thành công. Đang mở FlashDay…'
      : 'Đang mở FlashDay…';
    statusEl.dataset.tone = 'success';
    statusEl.classList.remove('hidden');
  }
  // replace() for transition surfaces (/auth/) so Back never lands on a dead
  // spinner; assign() keeps /login/ reachable from history elsewhere.
  if (replace) window.location.replace(appUrl());
  else window.location.assign(appUrl());
}

export function appUrl() {
  return authRedirectUrl(window.location.origin, '/app/');
}

export const AUTH_MODE = Object.freeze({
  SIGN_UP: 'signup',
  SIGN_IN: 'signin',
  RECOVERY: 'recovery',
  UPDATE_PASSWORD: 'update-password',
});

export function authRedirectUrl(origin, path = '/app/') {
  return new URL(path, origin).toString();
}

export function isPasswordLongEnough(password) {
  return String(password || '').length >= MIN_PASSWORD_LENGTH;
}

// Signing in must accept the password policy that applied when the account was
// created. Only creation and password replacement enforce FlashDay's current
// minimum length.
export function requiresNewPasswordPolicy(mode) {
  return mode === AUTH_MODE.SIGN_UP || mode === AUTH_MODE.UPDATE_PASSWORD;
}

export function authErrorMessage(error) {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('invalid login credentials'))
    return 'Email hoặc mật khẩu không đúng.';
  if (message.includes('user already registered'))
    return 'Email này đã có tài khoản. Hãy đăng nhập, hoặc dùng “Quên mật khẩu?”.';
  if (message.includes('email not confirmed'))
    return 'Email chưa xác nhận — kiểm tra inbox/spam cho link xác nhận (FlashDay gửi lại nếu cần).';
  if (message.includes('invalid email address'))
    return 'Địa chỉ email không hợp lệ.';
  if (message.includes('password should be at least'))
    return `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  if (
    message.includes('email rate limit exceeded') ||
    message.includes('too many requests')
  ) {
    return 'Bạn đã thử quá nhiều lần. Hãy đợi ít phút rồi thử lại.';
  }
  if (message.includes('network request failed'))
    return 'Mất kết nối mạng. Kiểm tra internet rồi thử lại.';
  if (message.includes('user account disabled'))
    return 'Tài khoản này đã bị vô hiệu hoá.';
  if (message.includes('requires recent login'))
    return 'Phiên đăng nhập đã cũ. Hãy đăng nhập lại rồi thử lại.';
  if (message.includes('action link expired'))
    return 'Liên kết đã hết hạn hoặc đã được sử dụng. Hãy yêu cầu gửi lại.';
  if (message.includes('continue url not authorized'))
    return 'Liên kết xác thực chưa được cấu hình tên miền.';
  if (message.includes('web storage unsupported'))
    return 'Trình duyệt đang chặn lưu trữ (cookies/storage). Tắt ẩn danh/chặn tracker rồi thử lại.';
  if (message.includes('sign-in popup'))
    return 'Cửa sổ đăng nhập Google bị chặn hoặc đã đóng. Hãy thử lại.';
  if (message.includes('provider is not enabled'))
    return 'Đăng nhập Google chưa được cấu hình cho FlashDay.';
  if (message.includes('chưa nhận được phiên đăng nhập')) {
    return 'Đăng nhập đã hoàn tất nhưng FlashDay chưa nhận được phiên. Hãy thử lại.';
  }
  return 'Không thể xác thực lúc này. Hãy thử lại sau.';
}

export function authModeCopy(mode) {
  switch (mode) {
    case AUTH_MODE.SIGN_IN:
      return {
        title: 'Chào mừng trở lại.',
        submit: 'Đăng nhập',
        passwordAutocomplete: 'current-password',
      };
    case AUTH_MODE.RECOVERY:
      return {
        title: 'Đặt lại mật khẩu',
        submit: 'Gửi email đặt lại',
        passwordAutocomplete: null,
      };
    case AUTH_MODE.UPDATE_PASSWORD:
      return {
        title: 'Tạo mật khẩu mới',
        submit: 'Lưu mật khẩu mới',
        passwordAutocomplete: 'new-password',
      };
    default:
      return {
        title: 'Khai mở trí nhớ dài hạn.',
        submit: 'Tạo tài khoản',
        passwordAutocomplete: 'new-password',
      };
  }
}
