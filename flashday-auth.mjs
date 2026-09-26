export const MIN_PASSWORD_LENGTH = 8;

export const AUTH_MODE = Object.freeze({
  SIGN_UP: 'signup',
  SIGN_IN: 'signin',
  RECOVERY: 'recovery',
  UPDATE_PASSWORD: 'update-password'
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
  if (message.includes('invalid login credentials')) return 'Email hoặc mật khẩu không đúng.';
  if (message.includes('email not confirmed')) return 'Hãy xác nhận email trước khi đăng nhập.';
  if (message.includes('password should be at least')) return `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  if (message.includes('email rate limit exceeded') || message.includes('too many requests')) {
    return 'Bạn đã thử quá nhiều lần. Hãy đợi ít phút rồi thử lại.';
  }
  if (message.includes('provider is not enabled')) return 'Đăng nhập Google chưa được cấu hình cho FlashDay.';
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
        passwordAutocomplete: 'current-password'
      };
    case AUTH_MODE.RECOVERY:
      return {
        title: 'Đặt lại mật khẩu',
        submit: 'Gửi email đặt lại',
        passwordAutocomplete: null
      };
    case AUTH_MODE.UPDATE_PASSWORD:
      return {
        title: 'Tạo mật khẩu mới',
        submit: 'Lưu mật khẩu mới',
        passwordAutocomplete: 'new-password'
      };
    default:
      return {
        title: 'Khai mở trí nhớ dài hạn.',
        submit: 'Tạo tài khoản',
        passwordAutocomplete: 'new-password'
      };
  }
}
