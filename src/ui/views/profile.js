// Hồ sơ — account info, sign-out, and the device-local data wipe.
import { dbKey } from '../../core/namespace.js';

export function mount(root, ctx) {
  const email = ctx.user?.email || null;
  const section = document.createElement('section');
  section.className = 'view-section';
  section.innerHTML = `
    <h1>Hồ sơ</h1>
    <p class="profile-email">${email || (ctx.preview ? 'Đang xem thử — chưa đăng nhập' : 'Chưa đăng nhập')}</p>
    <div class="profile-actions">
      ${email ? '<button type="button" class="btn-secondary" id="signOutBtn">Đăng xuất</button>' : '<a class="btn-secondary" href="/login/#signin">Đăng nhập</a>'}
      <button type="button" class="btn-danger" id="wipeBtn">Xóa dữ liệu học trên thiết bị</button>
    </div>
    <p class="view-placeholder" id="profileStatus" role="status" aria-live="polite"></p>`;
  root.appendChild(section);

  const status = section.querySelector('#profileStatus');

  section.querySelector('#signOutBtn')?.addEventListener('click', async () => {
    if (!ctx.client) return;
    await ctx.client.auth.signOut();
    // The SIGNED_OUT listener in product-bootstrap routes back to /login/.
  });

  section.querySelector('#wipeBtn').addEventListener('click', () => {
    if (!window.confirm('Xóa toàn bộ dữ liệu học lưu trên thiết bị này? Không thể hoàn tác.')) return;
    const key = dbKey(ctx.storage);
    try { ctx.storage.removeItem(`${key}:lesson-session`); } catch (_error) {}
    ctx.session.load();
    ctx.store.reset();
    status.textContent = 'Đã xóa dữ liệu học trên thiết bị.';
  });
}

export function unmount() {}
