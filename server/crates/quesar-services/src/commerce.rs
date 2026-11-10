//! `commerce.getCommerceReadiness` (`commerceReadiness` in
//! `src/lib/server/commerce.server.ts`): environment-only, no secrets.

use std::path::Path;

use crate::text::js_trim;

/// What readiness reads. The WDBX values are exactly as the process has them,
/// not trimmed (`wdbxOptions` reads `process.env` directly), so a value with
/// a stray space is not an absolute path; `database_url` is judged after
/// trimming, as the TypeScript does.
#[derive(Debug, Clone, Default)]
pub struct CommerceInputs {
    pub wdbx_binary: Option<String>,
    pub wdbx_directory: Option<String>,
    pub wdbx_config: Option<String>,
    pub wdbx_host_key: Option<String>,
    pub database_url: Option<String>,
    /// A configured public origin (`PUBLIC_ORIGIN`, or `BETTER_AUTH_URL` until
    /// that name is retired), already trimmed by the caller.
    pub public_origin: Option<String>,
    /// Whether a usable `APP_ENCRYPTION_KEY` is set
    /// ([`SealingKeys::configured`](crate::crypto::SealingKeys::configured)).
    pub encryption_configured: bool,
}

fn absolute(value: &Option<String>) -> bool {
    value
        .as_deref()
        .is_some_and(|value| !value.is_empty() && Path::new(value).is_absolute())
}

fn present(value: &Option<String>) -> bool {
    value
        .as_deref()
        .is_some_and(|value| !js_trim(value).is_empty())
}

/// Whether invoicing could run: all four WDBX paths absolute, a database, a
/// public origin and a sealing key. `functions_available` is false until the
/// invoice functions exist, and forces the answer to `false` so the server
/// never reports invoicing ready while it cannot create an invoice.
pub fn readiness(inputs: &CommerceInputs, functions_available: bool) -> bool {
    functions_available
        && absolute(&inputs.wdbx_binary)
        && absolute(&inputs.wdbx_directory)
        && absolute(&inputs.wdbx_config)
        && absolute(&inputs.wdbx_host_key)
        && present(&inputs.database_url)
        && present(&inputs.public_origin)
        && inputs.encryption_configured
}

#[cfg(test)]
mod tests {
    use super::*;

    fn complete() -> CommerceInputs {
        CommerceInputs {
            wdbx_binary: Some("/opt/wdbx/bin/wdbx".into()),
            wdbx_directory: Some("/var/lib/wdbx".into()),
            wdbx_config: Some("/etc/wdbx/config".into()),
            wdbx_host_key: Some("/etc/wdbx/host-key".into()),
            database_url: Some("postgres://u@h/db".into()),
            public_origin: Some("https://quesar.cloud".into()),
            encryption_configured: true,
        }
    }

    #[test]
    fn a_complete_environment_is_false_until_the_functions_exist() {
        assert!(!readiness(&complete(), false));
        assert!(readiness(&complete(), true));
    }

    #[test]
    fn each_missing_input_alone_turns_it_false() {
        type Edit = fn(&mut CommerceInputs);
        let cases: [(&str, Edit); 10] = [
            ("binary unset", |i| i.wdbx_binary = None),
            ("binary relative", |i| i.wdbx_binary = Some("wdbx".into())),
            ("binary empty", |i| i.wdbx_binary = Some(String::new())),
            ("directory unset", |i| i.wdbx_directory = None),
            ("config relative", |i| {
                i.wdbx_config = Some("./config".into())
            }),
            ("host key unset", |i| i.wdbx_host_key = None),
            ("database whitespace", |i| {
                i.database_url = Some("  \t".into())
            }),
            ("database unset", |i| i.database_url = None),
            ("origin unset", |i| i.public_origin = None),
            ("no sealing key", |i| i.encryption_configured = false),
        ];
        for (name, edit) in cases {
            let mut inputs = complete();
            edit(&mut inputs);
            assert!(!readiness(&inputs, true), "{name}");
        }
    }

    #[test]
    fn wdbx_values_are_not_trimmed() {
        let mut inputs = complete();
        inputs.wdbx_binary = Some(" /opt/wdbx/bin/wdbx".into());
        assert!(!readiness(&inputs, true));
    }
}
