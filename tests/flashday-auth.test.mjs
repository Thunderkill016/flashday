import assert from 'node:assert/strict';
import {
  AUTH_MODE,
  MIN_PASSWORD_LENGTH,
  authErrorMessage,
  authModeCopy,
  authRedirectUrl,
  createFlashdayClient,
  enterApp,
  isPasswordLongEnough,
  requiresNewPasswordPolicy,
} from '../flashday-auth.mjs';

assert.equal(
  authRedirectUrl('https://flashday.web.app', '/app/'),
  'https://flashday.web.app/app/'
);
assert.equal(
  authRedirectUrl('http://localhost:5173/', '/?auth=recover'),
  'http://localhost:5173/?auth=recover'
);
assert.equal(isPasswordLongEnough('x'.repeat(MIN_PASSWORD_LENGTH)), true);
assert.equal(isPasswordLongEnough('x'.repeat(MIN_PASSWORD_LENGTH - 1)), false);
assert.equal(requiresNewPasswordPolicy(AUTH_MODE.SIGN_IN), false);
assert.equal(requiresNewPasswordPolicy(AUTH_MODE.SIGN_UP), true);
assert.equal(requiresNewPasswordPolicy(AUTH_MODE.UPDATE_PASSWORD), true);
assert.equal(
  authErrorMessage({ message: 'Invalid login credentials' }),
  'Email hoặc mật khẩu không đúng.'
);
assert.equal(
  authErrorMessage({ message: 'User already registered' }),
  'Email này đã có tài khoản. Hãy đăng nhập, hoặc dùng “Quên mật khẩu?”.'
);
assert.equal(
  authErrorMessage({ message: 'Email not confirmed' }),
  'Email chưa xác nhận — kiểm tra inbox/spam cho link xác nhận (FlashDay gửi lại nếu cần).'
);
assert.equal(
  authErrorMessage({ message: 'Invalid email address' }),
  'Địa chỉ email không hợp lệ.'
);
assert.equal(
  authErrorMessage({ message: 'Network request failed' }),
  'Mất kết nối mạng. Kiểm tra internet rồi thử lại.'
);
assert.equal(
  authErrorMessage({ message: 'User account disabled' }),
  'Tài khoản này đã bị vô hiệu hoá.'
);
assert.equal(
  authErrorMessage({ message: 'Requires recent login' }),
  'Phiên đăng nhập đã cũ. Hãy đăng nhập lại rồi thử lại.'
);
assert.equal(
  authErrorMessage({ message: 'Action link expired' }),
  'Liên kết đã hết hạn hoặc đã được sử dụng. Hãy yêu cầu gửi lại.'
);
assert.equal(
  authErrorMessage({ message: 'Continue url not authorized' }),
  'Liên kết xác thực chưa được cấu hình tên miền.'
);
assert.equal(
  authErrorMessage({ message: 'FlashDay chưa nhận được phiên đăng nhập.' }),
  'Đăng nhập đã hoàn tất nhưng FlashDay chưa nhận được phiên. Hãy thử lại.'
);
assert.equal(
  authModeCopy(AUTH_MODE.UPDATE_PASSWORD).passwordAutocomplete,
  'new-password'
);
assert.equal(authModeCopy(AUTH_MODE.RECOVERY).passwordAutocomplete, null);

// createFlashdayClient: the only factory entrypoints may use — a missing
// or partial config must yield null (never a half-configured client).
assert.equal(createFlashdayClient(undefined), null);
assert.equal(createFlashdayClient({}), null);
assert.equal(createFlashdayClient({ apiKey: 'k' }), null);
assert.ok(
  createFlashdayClient({ apiKey: 'k', projectId: 'p', appId: 'a' }),
  'full config must yield a client'
);

// enterApp refuses to navigate without a real session — this guards the
// redirect-result path, whose UserCredential shape (user.uid) differs from
// a session shape (user.id).
assert.throws(() => enterApp(null), /chưa nhận được phiên/);
assert.throws(() => enterApp({ user: {} }), /chưa nhận được phiên/);
assert.throws(() => enterApp({ user: { uid: 'x' } }), /chưa nhận được phiên/);

console.log('FlashDay auth contract: 26 checks passed');
