import assert from 'node:assert/strict';
import {
  AUTH_MODE,
  MIN_PASSWORD_LENGTH,
  authErrorMessage,
  authModeCopy,
  authRedirectUrl,
  isPasswordLongEnough,
  requiresNewPasswordPolicy
} from '../flashday-auth.mjs';

assert.equal(authRedirectUrl('https://flashdayvn.vercel.app', '/app/'), 'https://flashdayvn.vercel.app/app/');
assert.equal(authRedirectUrl('http://localhost:5173/', '/?auth=recover'), 'http://localhost:5173/?auth=recover');
assert.equal(isPasswordLongEnough('x'.repeat(MIN_PASSWORD_LENGTH)), true);
assert.equal(isPasswordLongEnough('x'.repeat(MIN_PASSWORD_LENGTH - 1)), false);
assert.equal(requiresNewPasswordPolicy(AUTH_MODE.SIGN_IN), false);
assert.equal(requiresNewPasswordPolicy(AUTH_MODE.SIGN_UP), true);
assert.equal(requiresNewPasswordPolicy(AUTH_MODE.UPDATE_PASSWORD), true);
assert.equal(authErrorMessage({ message: 'Invalid login credentials' }), 'Email hoặc mật khẩu không đúng.');
assert.equal(authErrorMessage({ message: 'User already registered' }), 'Email này đã có tài khoản. Hãy đăng nhập, hoặc dùng “Quên mật khẩu?”.');
assert.equal(authErrorMessage({ message: 'Email not confirmed' }), 'Email chưa xác nhận — FlashDay vừa gửi lại link xác nhận. Kiểm tra cả spam.');
assert.equal(authErrorMessage({ message: 'Invalid email address' }), 'Địa chỉ email không hợp lệ.');
assert.equal(authErrorMessage({ message: 'Network request failed' }), 'Mất kết nối mạng. Kiểm tra internet rồi thử lại.');
assert.equal(authErrorMessage({ message: 'User account disabled' }), 'Tài khoản này đã bị vô hiệu hoá.');
assert.equal(authErrorMessage({ message: 'Requires recent login' }), 'Phiên đăng nhập đã cũ. Hãy đăng nhập lại rồi thử lại.');
assert.equal(authErrorMessage({ message: 'Action link expired' }), 'Liên kết đã hết hạn hoặc đã được sử dụng. Hãy yêu cầu gửi lại.');
assert.equal(authErrorMessage({ message: 'Continue url not authorized' }), 'Liên kết xác thực chưa được cấu hình tên miền.');
assert.equal(authErrorMessage({ message: 'FlashDay chưa nhận được phiên đăng nhập.' }), 'Đăng nhập đã hoàn tất nhưng FlashDay chưa nhận được phiên. Hãy thử lại.');
assert.equal(authModeCopy(AUTH_MODE.UPDATE_PASSWORD).passwordAutocomplete, 'new-password');
assert.equal(authModeCopy(AUTH_MODE.RECOVERY).passwordAutocomplete, null);

console.log('FlashDay auth contract: 19 checks passed');
