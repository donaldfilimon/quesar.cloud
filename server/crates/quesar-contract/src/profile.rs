//! The public fields of the caller's own profile.

use serde::Serialize;
use ts_rs::TS;

use crate::{NoInput, ServerFunction};

#[derive(Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ProfileRecord {
    pub name: Option<String>,
    pub email: Option<String>,
    pub image: Option<String>,
    pub email_verified: bool,
    pub providers: Vec<String>,
}

pub struct GetProfile;

impl ServerFunction for GetProfile {
    const NAME: &'static str = "profile.getProfile";
    type Input = NoInput;
    type Output = Option<ProfileRecord>;
}
