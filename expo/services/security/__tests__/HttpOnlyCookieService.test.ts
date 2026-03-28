import HttpOnlyCookieService from '@/services/security/HttpOnlyCookieService';

function expectTruthy(val: unknown) {
  if (!val) throw new Error('Expected truthy but got ' + String(val));
}

async function run() {
  const svc = HttpOnlyCookieService.getInstance();

  const okSet = await svc.setSecureCookie('t1', 'v1', { httpOnly: true, secure: true, sameSite: 'strict', encrypted: true, signed: true, maxAge: 2000 });
  expectTruthy(okSet);

  const got = await svc.getSecureCookie('t1');
  if (got !== 'v1') throw new Error('Expected v1 got ' + String(got));

  const jwtOk = await svc.setJWTAccessToken('jwt');
  expectTruthy(jwtOk);
  const jwt = await svc.getJWTAccessToken();
  if (jwt !== 'jwt') throw new Error('Expected jwt');

  const status = svc.getCookieSecurityStatus();
  if (!status.initialized) throw new Error('Service not initialized');

  await new Promise(r => setTimeout(r, 10));

  await svc.deleteCookie('t1');
  const afterDelete = await svc.getSecureCookie('t1');
  if (afterDelete !== null) throw new Error('Expected null after delete');

  await svc.clearAllCookies();

  return 'OK';
}

run().then((res) => console.log('HttpOnlyCookieService tests passed:', res)).catch((e) => {
  console.error('HttpOnlyCookieService tests failed:', e);
});
