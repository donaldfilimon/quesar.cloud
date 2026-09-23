import { createPrivateKey, sign } from "node:crypto";

/**
 * Sign in with Apple takes a short-lived ES256 JWT as its OAuth client secret,
 * minted from the Services ID's private key. Apple caps its lifetime at six
 * months; minting it per server instance keeps every instance well inside that.
 *
 * https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret
 */
export interface AppleKey {
  /** The Services ID (the OAuth client id), e.g. `cloud.quesar.signin`. */
  clientId: string;
  teamId: string;
  keyId: string;
  /** The `.p8` key contents (PKCS#8 PEM). `\n` escapes are accepted for env vars. */
  privateKey: string;
}

/** 180 days, just under Apple's 15777000-second ceiling. */
export const APPLE_SECRET_TTL_SECONDS = 180 * 24 * 60 * 60;

const base64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

export function appleClientSecret(
  key: AppleKey,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const header = { alg: "ES256", kid: key.keyId };
  const payload = {
    iss: key.teamId,
    iat: nowSeconds,
    exp: nowSeconds + APPLE_SECRET_TTL_SECONDS,
    aud: "https://appleid.apple.com",
    sub: key.clientId,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const pem = key.privateKey.includes("\\n")
    ? key.privateKey.replace(/\\n/g, "\n")
    : key.privateKey;
  // JOSE wants the raw r||s signature, not DER.
  const signature = sign("sha256", Buffer.from(signingInput), {
    key: createPrivateKey(pem),
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${base64url(signature)}`;
}
