//! String helpers that behave as ECMAScript does, for the places the
//! TypeScript measures with `.length` (UTF-16 code units) or cuts with
//! `.trim()` and regex `\s`.

/// ECMAScript `WhiteSpace` and `LineTerminator`: tab, line feed, vertical tab,
/// form feed, carriage return, space, no-break space, U+1680, U+2000 to
/// U+200A, U+2028, U+2029, U+202F, U+205F, U+3000 and the byte order mark
/// U+FEFF. Unlike [`char::is_whitespace`] it includes U+FEFF and excludes
/// U+0085.
pub fn is_js_whitespace(c: char) -> bool {
    matches!(
        c,
        '\u{9}'..='\u{D}'
            | '\u{20}'
            | '\u{A0}'
            | '\u{1680}'
            | '\u{2000}'..='\u{200A}'
            | '\u{2028}'
            | '\u{2029}'
            | '\u{202F}'
            | '\u{205F}'
            | '\u{3000}'
            | '\u{FEFF}'
    )
}

/// `String.prototype.trim`.
pub fn js_trim(text: &str) -> &str {
    text.trim_matches(is_js_whitespace)
}

/// `String.prototype.length`: the number of UTF-16 code units.
pub fn utf16_len(text: &str) -> usize {
    text.chars().map(char::len_utf16).sum()
}

/// The longest prefix of at most `units` UTF-16 code units that ends on a
/// character boundary. A character that would straddle the limit (a
/// supplementary-plane character at an odd boundary) is left out whole, where
/// `String.prototype.slice` would keep half of it.
pub fn utf16_prefix(text: &str, units: usize) -> &str {
    let mut used = 0;
    for (index, c) in text.char_indices() {
        used += c.len_utf16();
        if used > units {
            return &text[..index];
        }
    }
    text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn length_counts_utf16_units() {
        assert_eq!(utf16_len(""), 0);
        assert_eq!(utf16_len("abc"), 3);
        assert_eq!(utf16_len("é"), 1);
        assert_eq!(utf16_len("€"), 1);
        // One supplementary-plane character is a surrogate pair.
        assert_eq!(utf16_len("😀"), 2);
        assert_eq!(utf16_len("a😀b"), 4);
    }

    #[test]
    fn trim_uses_the_ecmascript_whitespace_set() {
        assert_eq!(js_trim("  a b \t\r\n"), "a b");
        // Included by ECMAScript, not by `str::trim`.
        assert_eq!(js_trim("\u{FEFF}a\u{FEFF}"), "a");
        // Excluded by ECMAScript, trimmed by `str::trim`.
        assert_eq!(js_trim("\u{85}a\u{85}"), "\u{85}a\u{85}");
        assert_eq!(
            js_trim("\u{A0}\u{1680}\u{2000}\u{200A}\u{2028}\u{2029}\u{202F}\u{205F}\u{3000}x"),
            "x"
        );
        // Zero-width space is not whitespace to ECMAScript.
        assert_eq!(js_trim("\u{200B}a"), "\u{200B}a");
        assert_eq!(js_trim(" \u{FEFF} "), "");
        assert_eq!(js_trim(""), "");
    }

    #[test]
    fn prefix_never_exceeds_the_limit_or_splits_a_character() {
        assert_eq!(utf16_prefix("abcdef", 3), "abc");
        assert_eq!(utf16_prefix("abc", 3), "abc");
        assert_eq!(utf16_prefix("abc", 10), "abc");
        assert_eq!(utf16_prefix("abc", 0), "");
        assert_eq!(utf16_prefix("😀😀", 2), "😀");
        // Three units would cut the second pair in half.
        assert_eq!(utf16_prefix("😀😀", 3), "😀");
        assert_eq!(utf16_prefix("😀😀", 4), "😀😀");
        assert_eq!(utf16_prefix("a😀", 2), "a");
        assert_eq!(utf16_prefix("€€€", 2), "€€");
        for units in 0..12 {
            let cut = utf16_prefix("a😀é€😀z", units);
            assert!(utf16_len(cut) <= units);
        }
    }
}
