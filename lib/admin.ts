export function verifyAdmin(login: string, pin: string): boolean {
  const adminLogin = process.env.ADMIN_LOGIN;
  const adminPin = process.env.ADMIN_PIN;

  if (!adminLogin || !adminPin) {
    throw new Error("Brakuje ADMIN_LOGIN lub ADMIN_PIN");
  }

  return login === adminLogin && pin === adminPin;
}
