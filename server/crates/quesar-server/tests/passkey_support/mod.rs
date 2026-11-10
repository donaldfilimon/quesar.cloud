//! A software "browser plus authenticator" for the passkey tests.
//!
//! `webauthn-authenticator-rs` with `softpasskey` signs real attestations and
//! assertions (ES256, `packed` self attestation) and builds the
//! `clientDataJSON` for the origin it is told it is on. It does not do
//! discoverable credentials: it needs `allowCredentials` and returns no user
//! handle. A real browser supplies both from the credential it picks, so this
//! helper does the same: it remembers the user handle each credential was
//! registered with, puts the credential into `allowCredentials` and sets
//! `response.userHandle` on the way out. Neither affects what the server
//! verifies (the signature covers the authenticator data and `clientDataJSON`).
#![allow(dead_code)]

use std::collections::HashMap;

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use serde_json::{Value, json};
use webauthn_authenticator_rs::WebauthnAuthenticator;
use webauthn_authenticator_rs::prelude::{
    CreationChallengeResponse, PublicKeyCredential, RegisterPublicKeyCredential,
    RequestChallengeResponse, Url,
};
use webauthn_authenticator_rs::softpasskey::SoftPasskey;

pub struct SoftBrowser {
    authenticator: WebauthnAuthenticator<SoftPasskey>,
    /// credential id (base64url) to the user handle it was registered with.
    handles: HashMap<String, String>,
}

impl Default for SoftBrowser {
    fn default() -> Self {
        Self::new()
    }
}

impl SoftBrowser {
    pub fn new() -> Self {
        Self {
            // `true`: report user verification, which the server requires.
            authenticator: WebauthnAuthenticator::new(SoftPasskey::new(true)),
            handles: HashMap::new(),
        }
    }

    /// `navigator.credentials.create()` on `origin` with the server's
    /// `options`; the JSON body's `credential`.
    pub fn create(&mut self, origin: &str, options: &Value) -> Value {
        let challenge: CreationChallengeResponse =
            serde_json::from_value(json!({ "publicKey": options })).expect("creation options");
        let credential = self
            .authenticator
            .do_registration(Url::parse(origin).unwrap(), challenge)
            .expect("soft authenticator registers");
        let credential = serde_json::to_value(&credential).unwrap();
        let id = credential["id"].as_str().unwrap().to_owned();
        self.handles
            .insert(id, options["user"]["id"].as_str().unwrap().to_owned());
        credential
    }

    /// `navigator.credentials.get()` on `origin`, picking the credential
    /// `credential_id` (base64url) as a browser would.
    pub fn get(&mut self, origin: &str, options: &Value, credential_id: &str) -> Value {
        let mut options = options.clone();
        options["allowCredentials"] = json!([{ "type": "public-key", "id": credential_id }]);
        let challenge: RequestChallengeResponse =
            serde_json::from_value(json!({ "publicKey": options })).expect("request options");
        let credential: PublicKeyCredential = self
            .authenticator
            .do_authentication(Url::parse(origin).unwrap(), challenge)
            .expect("soft authenticator signs");
        let mut credential = serde_json::to_value(&credential).unwrap();
        credential["response"]["userHandle"] = json!(self.handles[credential_id]);
        credential
    }
}

pub fn b64(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

pub fn unb64(text: &str) -> Vec<u8> {
    URL_SAFE_NO_PAD.decode(text).unwrap()
}

pub fn registered(credential: &Value) -> RegisterPublicKeyCredential {
    serde_json::from_value(credential.clone()).unwrap()
}
