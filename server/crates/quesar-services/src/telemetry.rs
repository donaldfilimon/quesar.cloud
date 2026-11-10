//! The telemetry sink's allowlists: event names and page paths.
//!
//! Port of `src/lib/server/telemetry-path.ts` and the event set of
//! `telemetry.server.ts`. `telemetry_events` holds an allowlisted event, an
//! allowlisted pathname and a timestamp, nothing else. The path arrives from an
//! anonymous body, so it is matched against the real route set; anything else
//! is stored as `""` (the request is not rejected).
//!
//! The route set is the sorted `routeFiles()` of the TypeScript tree, committed
//! as `server/contract/telemetry-routes.json` and embedded at build time.
//! `src/lib/server/public-contract.test.ts` fails when a route file is added
//! without regenerating it.

use std::collections::HashSet;
use std::sync::OnceLock;

use serde_json::Value;

use crate::text::utf16_len;

/// The events the sink stores (`TELEMETRY_EVENTS`).
pub const EVENTS: [&str; 5] = [
    "page_view",
    "inquiry_open",
    "inquiry_submit",
    "inquiry_success",
    "inquiry_close",
];

/// No real route is longer; a rejection bound, never a truncation
/// (`MAX_PATH_LENGTH`, in UTF-16 code units).
const MAX_PATH_LENGTH: usize = 128;

/// The file the Rust server embeds.
const ROUTES_JSON: &str = include_str!("../../../contract/telemetry-routes.json");

/// One segment of a dynamic route.
#[derive(Debug, Clone, PartialEq, Eq)]
enum Segment {
    Literal(String),
    /// A `$param`: one slug.
    Slug,
}

/// The routes a path may name.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RoutePatterns {
    static_paths: HashSet<String>,
    dynamic: Vec<Vec<Segment>>,
}

/// `SLUG = [a-z0-9]+(?:-[a-z0-9]+)*`, whole-string: lowercase ASCII letters
/// and digits in runs separated by single hyphens.
fn is_slug(text: &str) -> bool {
    !text.is_empty()
        && text.split('-').all(|run| {
            !run.is_empty()
                && run
                    .bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit())
        })
}

/// `/^\(.*\)$/`: `.` does not match a line terminator.
fn is_group(segment: &str) -> bool {
    segment.len() >= 2
        && segment.starts_with('(')
        && segment.ends_with(')')
        && !segment[1..segment.len() - 1].contains(['\n', '\r', '\u{2028}', '\u{2029}'])
}

/// The route-relative name: everything up to the first `src/routes/` is cut,
/// then leading slashes and one `.tsx`/`.ts`/`.jsx`/`.js` extension.
fn route_name(file: &str) -> &str {
    let rel = file
        .find("src/routes/")
        .map_or(file, |at| &file[at + "src/routes/".len()..]);
    let rel = rel.trim_start_matches('/');
    for extension in [".tsx", ".ts", ".jsx", ".js"] {
        if let Some(stripped) = rel.strip_suffix(extension) {
            return stripped;
        }
    }
    rel
}

impl RoutePatterns {
    /// `routePatternsFromFiles`: TanStack file-route names to matchers. Flat
    /// (`a.b.tsx`) and directory (`a/b.tsx`) forms, `index`, `route`, `$param`,
    /// pathless `_layout` segments, `(group)` folders and trailing-underscore
    /// escapes. Skips `__root`, `-`-prefixed (ignored) files, splats (`$`) and
    /// `api/*`.
    pub fn from_files<I, S>(files: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        let mut patterns = Self::default();
        for file in files {
            patterns.add(route_name(file.as_ref()));
        }
        patterns
    }

    fn add(&mut self, name: &str) {
        let raw: Vec<&str> = name.split(['/', '.']).collect();
        if raw
            .iter()
            .any(|segment| *segment == "__root" || segment.starts_with('-'))
        {
            return;
        }
        if raw.first() == Some(&"api") {
            return;
        }

        let mut segments: Vec<&str> = Vec::new();
        for mut segment in raw {
            if segment.is_empty() || segment == "index" || segment == "route" {
                continue;
            }
            if is_group(segment) || segment.starts_with('_') {
                continue;
            }
            if let Some(stripped) = segment.strip_suffix('_') {
                segment = stripped;
            }
            if segment == "$" {
                return; // a splat
            }
            segments.push(segment);
        }

        if segments.iter().any(|segment| segment.starts_with('$')) {
            self.dynamic.push(
                segments
                    .iter()
                    .map(|segment| {
                        if segment.starts_with('$') {
                            Segment::Slug
                        } else {
                            Segment::Literal((*segment).to_owned())
                        }
                    })
                    .collect(),
            );
        } else {
            self.static_paths.insert(format!("/{}", segments.join("/")));
        }
    }

    fn matches(&self, path: &str) -> bool {
        if self.static_paths.contains(path) {
            return true;
        }
        let Some(rest) = path.strip_prefix('/') else {
            return false;
        };
        let parts: Vec<&str> = rest.split('/').collect();
        self.dynamic.iter().any(|pattern| {
            pattern.len() == parts.len()
                && pattern
                    .iter()
                    .zip(&parts)
                    .all(|(segment, part)| match segment {
                        Segment::Literal(text) => text == part,
                        Segment::Slug => is_slug(part),
                    })
        })
    }
}

/// `normalizeTelemetryPath`: a client-supplied `path` mapped onto a known
/// route, or `""`. A query or fragment is discarded outright (that is where
/// identifiers hide); one trailing slash is tolerated; what survives still
/// has to be a route.
pub fn normalize_path(value: &Value, patterns: &RoutePatterns) -> String {
    let Value::String(text) = value else {
        return String::new();
    };
    let mut path = text.split(['?', '#']).next().unwrap_or("");
    if path.len() > 1 && path.ends_with('/') {
        path = &path[..path.len() - 1];
    }
    if path.is_empty() || utf16_len(path) > MAX_PATH_LENGTH {
        return String::new();
    }
    if patterns.matches(path) {
        path.to_owned()
    } else {
        String::new()
    }
}

/// The patterns of the embedded route list, built on first use.
///
/// If the embedded file were unreadable the set is empty and every path
/// normalizes to `""`: the sink stores less, never more. A test pins the file.
pub fn app_route_patterns() -> &'static RoutePatterns {
    static PATTERNS: OnceLock<RoutePatterns> = OnceLock::new();
    PATTERNS.get_or_init(|| route_patterns_from_json(ROUTES_JSON))
}

fn route_patterns_from_json(json: &str) -> RoutePatterns {
    let files = serde_json::from_str::<Value>(json)
        .ok()
        .and_then(|value| match value.get("files") {
            Some(Value::Array(files)) => Some(files.clone()),
            _ => None,
        })
        .unwrap_or_default();
    RoutePatterns::from_files(files.iter().filter_map(Value::as_str))
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    /// The fixture of `telemetry.server.test.ts`, mirroring this app's naming.
    fn fixture() -> RoutePatterns {
        RoutePatterns::from_files([
            "/src/routes/__root.tsx",
            "/src/routes/index.tsx",
            "/src/routes/about.tsx",
            "/src/routes/console.tsx",
            "/src/routes/console.workspace.tsx",
            "/src/routes/showcase.film.tsx",
            "/src/routes/blog.$slug.tsx",
            "/src/routes/research.$slug.tsx",
            "/src/routes/research.implementations.$slug.tsx",
            "/src/routes/team.$slug.tsx",
            "/src/routes/products.$slug.tsx",
            "/src/routes/api/auth/$.ts",
            "/src/routes/_layout.settings.tsx",
            "/src/routes/(marketing)/pricing.tsx",
            "/src/routes/quasar/index.tsx",
            "/src/routes/quasar/sites.$id.tsx",
            "/src/routes/-components/card.tsx",
            "/src/routes/files.$.tsx",
        ])
    }

    fn norm(value: Value) -> String {
        normalize_path(&value, &fixture())
    }

    fn text(path: &str) -> String {
        norm(Value::String(path.to_owned()))
    }

    #[test]
    fn file_route_names_become_static_paths() {
        let patterns = fixture();
        let mut got: Vec<&str> = patterns.static_paths.iter().map(String::as_str).collect();
        got.sort_unstable();
        // The eight paths the TypeScript test names.
        assert_eq!(
            got,
            [
                "/",
                "/about",
                "/console",
                "/console/workspace",
                "/pricing",
                "/quasar",
                "/settings",
                "/showcase/film",
            ]
        );
    }

    #[test]
    fn root_api_ignored_files_and_splats_are_skipped() {
        for path in [
            "/__root",
            "/api/auth/anything",
            "/components/card",
            "/files/anything",
        ] {
            assert_eq!(text(path), "", "{path}");
        }
    }

    #[test]
    fn param_segments_match_one_slug() {
        assert_eq!(
            text("/research/implementations/abi-core"),
            "/research/implementations/abi-core"
        );
        assert_eq!(text("/quasar/sites/site-42"), "/quasar/sites/site-42");
    }

    #[test]
    fn a_trailing_underscore_un_nests_a_segment() {
        let patterns = RoutePatterns::from_files([
            "src/routes/posts_.$id.edit.tsx",
            "src/routes/docs_.tsx",
            "src/routes/_pathless/route.tsx",
        ]);
        let norm = |p: &str| normalize_path(&json!(p), &patterns);
        assert_eq!(norm("/posts/abc/edit"), "/posts/abc/edit");
        assert_eq!(norm("/docs"), "/docs");
        // `_pathless/route.tsx` is the layout itself: the root.
        assert_eq!(norm("/"), "/");
    }

    #[test]
    fn route_files_are_read_with_or_without_the_routes_prefix() {
        let patterns = RoutePatterns::from_files([
            "a/b/src/routes/one.ts",
            "two.jsx",
            "///three.js",
            "/src/routes/four.tsx",
        ]);
        for path in ["/one", "/two", "/three", "/four"] {
            assert_eq!(normalize_path(&json!(path), &patterns), path);
        }
    }

    #[test]
    fn the_first_routes_prefix_is_the_one_cut() {
        // The TypeScript's lazy `^.*?src\/routes\/`.
        let patterns = RoutePatterns::from_files(["/src/routes/src/routes/x.tsx"]);
        assert_eq!(
            normalize_path(&json!("/src/routes/x"), &patterns),
            "/src/routes/x"
        );
        assert_eq!(normalize_path(&json!("/x"), &patterns), "");
    }

    #[test]
    fn a_group_needs_both_parentheses() {
        let patterns = RoutePatterns::from_files([
            "src/routes/(a).x.tsx",
            "src/routes/(b.y.tsx",
            "src/routes/c).z.tsx",
        ]);
        let norm = |p: &str| normalize_path(&json!(p), &patterns);
        assert_eq!(norm("/x"), "/x");
        assert_eq!(norm("/(b/y"), "/(b/y");
        assert_eq!(norm("/c)/z"), "/c)/z");
    }

    #[test]
    fn literal_segments_of_a_dynamic_route_must_match_exactly() {
        assert_eq!(text("/research/implementations/Abi"), "");
        assert_eq!(text("/research/other/abi"), "");
        assert_eq!(text("/research//abi"), "");
    }

    #[test]
    fn known_static_routes_pass_through_unchanged() {
        for path in ["/", "/about", "/showcase/film", "/console"] {
            assert_eq!(text(path), path);
        }
    }

    #[test]
    fn each_dynamic_slug_family_passes_through() {
        for path in [
            "/blog/wdbx-v2-release",
            "/research/neural-backtracking",
            "/team/donald-filimon",
            "/products/abi",
            "/blog/zig-016-migration",
        ] {
            assert_eq!(text(path), path);
        }
    }

    #[test]
    fn an_identifier_smuggled_in_as_a_path_is_dropped() {
        for path in [
            "/u/victim@example.com",
            "/blog/victim@example.com",
            "/team/user 12345 said something",
        ] {
            assert_eq!(text(path), "", "{path}");
        }
    }

    #[test]
    fn a_query_or_fragment_is_discarded() {
        assert_eq!(text("/about?utm_source=x&email=a@b.co"), "/about");
        assert_eq!(text("/about#section"), "/about");
        assert_eq!(text("/u/victim?token=abc"), "");
    }

    #[test]
    fn an_over_long_path_is_dropped_not_truncated() {
        assert_eq!(text(&format!("/blog/{}", "a".repeat(200))), "");
        // 128 units is the longest kept; 129 is dropped.
        let kept = format!("/blog/{}", "a".repeat(122));
        assert_eq!(text(&kept), kept);
        assert_eq!(text(&format!("/blog/{}", "a".repeat(123))), "");
    }

    #[test]
    fn the_length_bound_counts_utf16_units() {
        let grin = "\u{1F600}";
        let patterns = RoutePatterns::from_files([
            format!("src/routes/{}.tsx", grin.repeat(64)),
            format!("src/routes/{}.tsx", grin.repeat(63)),
        ]);
        // 127 units: kept. 129 units, though only 65 chars: dropped.
        let short = format!("/{}", grin.repeat(63));
        assert_eq!(normalize_path(&json!(short), &patterns), short);
        assert_eq!(
            normalize_path(&json!(format!("/{}", grin.repeat(64))), &patterns),
            ""
        );
    }

    #[test]
    fn anything_that_is_not_a_route_shaped_string_is_dropped() {
        for path in ["not-a-route", "/nope", "https://evil.test/about", ""] {
            assert_eq!(text(path), "", "{path}");
        }
        for value in [
            Value::Null,
            json!(42),
            json!(true),
            json!({ "toString": "/about" }),
            json!(["/about"]),
            json!([]),
        ] {
            assert_eq!(norm(value.clone()), "", "{value}");
        }
    }

    #[test]
    fn inherited_object_property_names_are_not_routes() {
        for path in ["constructor", "__proto__", "toString"] {
            assert_eq!(text(path), "", "{path}");
        }
    }

    #[test]
    fn one_trailing_slash_is_tolerated() {
        assert_eq!(text("/about/"), "/about");
        assert_eq!(text("/blog/wdbx-v2-release/"), "/blog/wdbx-v2-release");
        assert_eq!(text("/about//"), "");
        // The root keeps its slash; a doubled one reads as the root, as in the TypeScript.
        assert_eq!(text("/"), "/");
        assert_eq!(text("//"), "/");
    }

    #[test]
    fn a_deeper_path_under_a_dynamic_family_is_rejected() {
        assert_eq!(text("/blog/wdbx-v2-release/extra"), "");
        assert_eq!(text("/blog"), "");
    }

    #[test]
    fn a_slug_is_lowercase_runs_joined_by_single_hyphens() {
        for good in ["a", "0", "abc-def", "a1-b2-c3", "zig-016"] {
            assert!(is_slug(good), "{good}");
        }
        for bad in [
            "", "-", "-a", "a-", "a--b", "A", "a_b", "a.b", "é", "a b", "a\n", "\u{661}",
        ] {
            assert!(!is_slug(bad), "{bad:?}");
        }
    }

    #[test]
    fn the_event_set_is_the_typescript_set() {
        assert_eq!(
            EVENTS,
            [
                "page_view",
                "inquiry_open",
                "inquiry_submit",
                "inquiry_success",
                "inquiry_close"
            ]
        );
    }

    #[test]
    fn the_embedded_route_list_is_the_real_one() {
        let patterns = app_route_patterns();
        assert!(
            patterns.static_paths.len() > 40,
            "{}",
            patterns.static_paths.len()
        );
        assert!(!patterns.dynamic.is_empty());
        for path in [
            "/",
            "/contact",
            "/showcase/film",
            "/blog/wdbx-v2-release",
            "/quasar/site/site-42",
        ] {
            assert_eq!(normalize_path(&json!(path), patterns), path);
        }
        for path in ["/api/telemetry", "/u/victim@example.com", "/-auth-entry"] {
            assert_eq!(normalize_path(&json!(path), patterns), "");
        }
    }

    #[test]
    fn an_unreadable_route_list_allows_nothing() {
        for broken in ["", "{", "[]", r#"{"files":"x"}"#, r#"{"files":[1,2]}"#] {
            let patterns = route_patterns_from_json(broken);
            assert_eq!(normalize_path(&json!("/"), &patterns), "", "{broken}");
        }
    }
}
