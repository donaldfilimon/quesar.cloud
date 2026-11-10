// Regenerates registration-response.json and authentication-response.json.
//
//   node server/contract/passkey/generate.mjs   (from the repo root)
//
// The two files are what `@simplewebauthn/browser` itself returns from
// `startRegistration()` and `startAuthentication()`. A stub for
// `navigator.credentials` plays the authenticator (a software ES256 key, a
// synced passkey: backup eligible and backed up), so the responses are not
// from a physical device, but every field name, encoding and omission is the
// browser library's own. `@simplewebauthn/server` verifies both before they
// are written, so they are valid responses by a second implementation's
// standard. They are FAKE: the key is generated here and trusted by nothing.
//
// `server/crates/quesar-auth/tests/passkey_fixtures.rs` feeds them to the Rust
// server's registration and sign-in code: that is the checked contract for M7.
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL, isoCBOR, isoUint8Array } from "@simplewebauthn/server/helpers";

const here = dirname(fileURLToPath(import.meta.url));
const RP_ID = "quesar.cloud";
const ORIGIN = "https://quesar.cloud";
const FLAGS = { up: 0x01, uv: 0x04, be: 0x08, bs: 0x10, at: 0x40 };

const sha256 = (data) => createHash("sha256").update(data).digest();
const toArrayBuffer = (bytes) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const u32 = (n) => Uint8Array.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const jwk = publicKey.export({ format: "jwk" });
const x = Buffer.from(jwk.x, "base64url");
const y = Buffer.from(jwk.y, "base64url");
const spki = publicKey.export({ format: "der", type: "spki" });
const credentialId = randomBytes(32);
const userHandle = randomBytes(16);

const cose = isoCBOR.encode(
  new Map([
    [1, 2], // kty: EC2
    [3, -7], // alg: ES256
    [-1, 1], // crv: P-256
    [-2, x],
    [-3, y],
  ]),
);

function clientData(type, challenge) {
  return new TextEncoder().encode(
    JSON.stringify({ type, challenge, origin: ORIGIN, crossOrigin: false }),
  );
}

// --- registration ---------------------------------------------------------
const registrationOptions = await generateRegistrationOptions({
  rpName: "Quesar",
  rpID: RP_ID,
  userName: "fixture@example.com",
  userID: userHandle,
  attestationType: "none",
  authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
});

const registrationAuthData = isoUint8Array.concat([
  sha256(RP_ID),
  Uint8Array.of(FLAGS.up | FLAGS.uv | FLAGS.be | FLAGS.bs | FLAGS.at),
  u32(0),
  new Uint8Array(16), // aaguid: none
  Uint8Array.of(credentialId.length >> 8, credentialId.length & 255),
  credentialId,
  cose,
]);

const createdCredential = {
  id: isoBase64URL.fromBuffer(credentialId),
  rawId: toArrayBuffer(credentialId),
  type: "public-key",
  authenticatorAttachment: "platform",
  getClientExtensionResults: () => ({ credProps: { rk: true } }),
  response: {
    clientDataJSON: toArrayBuffer(clientData("webauthn.create", registrationOptions.challenge)),
    attestationObject: toArrayBuffer(
      isoCBOR.encode(
        new Map([
          ["fmt", "none"],
          ["attStmt", new Map()],
          ["authData", registrationAuthData],
        ]),
      ),
    ),
    getTransports: () => ["internal", "hybrid"],
    getPublicKeyAlgorithm: () => -7,
    getPublicKey: () => toArrayBuffer(spki),
    getAuthenticatorData: () => toArrayBuffer(registrationAuthData),
  },
};

// --- authentication -------------------------------------------------------
const authenticationOptions = await generateAuthenticationOptions({
  rpID: RP_ID,
  userVerification: "required",
});

const counter = 5;
const authenticationAuthData = isoUint8Array.concat([
  sha256(RP_ID),
  Uint8Array.of(FLAGS.up | FLAGS.uv | FLAGS.be | FLAGS.bs),
  u32(counter),
]);
const assertionClientData = clientData("webauthn.get", authenticationOptions.challenge);
const signature = sign(
  "sha256",
  Buffer.concat([authenticationAuthData, sha256(assertionClientData)]),
  privateKey,
);

const assertion = {
  id: isoBase64URL.fromBuffer(credentialId),
  rawId: toArrayBuffer(credentialId),
  type: "public-key",
  authenticatorAttachment: "platform",
  getClientExtensionResults: () => ({}),
  response: {
    clientDataJSON: toArrayBuffer(assertionClientData),
    authenticatorData: toArrayBuffer(authenticationAuthData),
    signature: toArrayBuffer(signature),
    userHandle: toArrayBuffer(userHandle),
  },
};

// --- the browser library, with a stubbed authenticator ---------------------
globalThis.PublicKeyCredential = function PublicKeyCredential() {};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    credentials: {
      create: async () => createdCredential,
      get: async () => assertion,
    },
  },
});

const registrationResponse = await startRegistration({ optionsJSON: registrationOptions });
const authenticationResponse = await startAuthentication({ optionsJSON: authenticationOptions });

// --- a second implementation must accept both ------------------------------
const verifiedRegistration = await verifyRegistrationResponse({
  response: registrationResponse,
  expectedChallenge: registrationOptions.challenge,
  expectedOrigin: ORIGIN,
  expectedRPID: RP_ID,
  requireUserVerification: true,
});
if (!verifiedRegistration.verified) throw new Error("registration fixture does not verify");
const verifiedAuthentication = await verifyAuthenticationResponse({
  response: authenticationResponse,
  expectedChallenge: authenticationOptions.challenge,
  expectedOrigin: ORIGIN,
  expectedRPID: RP_ID,
  requireUserVerification: true,
  credential: {
    id: registrationResponse.id,
    publicKey: verifiedRegistration.registrationInfo.credential.publicKey,
    counter: 0,
  },
});
if (!verifiedAuthentication.verified) throw new Error("authentication fixture does not verify");

const write = (name, value) =>
  writeFileSync(
    join(here, name),
    JSON.stringify(
      {
        _comment:
          "FAKE: produced by server/contract/passkey/generate.mjs; the key is generated there and trusted by nothing.",
        challenge: value.challenge,
        response: value.response,
      },
      null,
      2,
    ) + "\n",
  );
write("registration-response.json", {
  challenge: registrationOptions.challenge,
  response: registrationResponse,
});
write("authentication-response.json", {
  challenge: authenticationOptions.challenge,
  response: authenticationResponse,
});
console.log("wrote registration-response.json and authentication-response.json");
