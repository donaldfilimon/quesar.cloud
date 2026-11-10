//! `quasar.getQuasarDefaultOrigin` (`src/lib/quasar/config.ts`): the deployment's
//! default Quasar service origin, or `null` when unset or malformed.

use crate::{NoInput, ServerFunction};

pub struct GetQuasarDefaultOrigin;
impl ServerFunction for GetQuasarDefaultOrigin {
    const NAME: &'static str = "quasar.getQuasarDefaultOrigin";
    type Input = NoInput;
    type Output = Option<String>;
}
