import Foundation

struct AppConfig {
    static let shared = AppConfig()
    static let termsVersion = "2026-07-21.v1"
    static let privacyVersion = "2026-07-21.v1"
    static let supportEmail = "info@classroompanda.com"

    let supabaseURL: URL?
    let supabaseAnonKey: String
    let webAppURL: URL?
    let authRedirectURL: String
    private let rawSupabaseURL: String
    private let rawSupabaseAnonKey: String

    var isSupabaseConfigured: Bool {
        supabaseConfigurationError == nil
    }

    var supabaseConfigurationError: String? {
        if let issue = Self.validateRequiredValue(rawSupabaseURL, label: "SUPABASE_URL") {
            return issue
        }
        guard let supabaseURL else {
            return "SUPABASE_URL must be a valid URL."
        }
        guard supabaseURL.scheme == "https", supabaseURL.host == "ihiqixkufsjeplnkwkao.supabase.co" else {
            return "SUPABASE_URL must be https://ihiqixkufsjeplnkwkao.supabase.co."
        }

        if let issue = Self.validateRequiredValue(rawSupabaseAnonKey, label: "SUPABASE_ANON_KEY") {
            return issue
        }
        guard supabaseAnonKey.count >= 40 else {
            return "SUPABASE_ANON_KEY looks truncated. Add the complete publishable or anon key."
        }
        guard supabaseAnonKey.hasPrefix("sb_publishable_") || supabaseAnonKey.hasPrefix("eyJ") else {
            return "SUPABASE_ANON_KEY must be a Supabase publishable or anon key."
        }
        return nil
    }

    var termsURL: URL? {
        documentURL(path: "terms")
    }

    var privacyURL: URL? {
        documentURL(path: "privacy")
    }

    var cookiesURL: URL? {
        documentURL(path: "cookies")
    }

    var accountDeletionURL: URL? {
        mailURL(
            subject: "Preschool Pro AI account deletion request",
            body: "Please start deletion for my Preschool Pro AI account. I understand Classroom Panda LLC may need to verify account ownership before completing this request."
        )
    }

    var appVersionLabel: String {
        let version = Self.stringValue("CFBundleShortVersionString", bundle: .main, fallback: "1.0")
        let build = Self.stringValue("CFBundleVersion", bundle: .main)
        return build.isEmpty ? version : "\(version) (\(build))"
    }

    private init(bundle: Bundle = .main) {
        rawSupabaseURL = Self.rawString("SUPABASE_URL", bundle: bundle)
        rawSupabaseAnonKey = Self.rawString("SUPABASE_ANON_KEY", bundle: bundle)
        supabaseURL = Self.urlValue("SUPABASE_URL", bundle: bundle)
        supabaseAnonKey = Self.stringValue("SUPABASE_ANON_KEY", bundle: bundle)
        webAppURL = Self.urlValue("WEB_APP_URL", bundle: bundle)
        authRedirectURL = Self.stringValue("AUTH_REDIRECT_URL", bundle: bundle, fallback: "preschoolprimadonna://auth-callback")
    }

    private func documentURL(path: String) -> URL? {
        (webAppURL ?? URL(string: "https://app.thepreschoolprimadonna.com"))?
            .appendingPathComponent(path)
    }

    private func mailURL(subject: String, body: String) -> URL? {
        var components = URLComponents()
        components.scheme = "mailto"
        components.path = Self.supportEmail
        components.queryItems = [
            URLQueryItem(name: "subject", value: subject),
            URLQueryItem(name: "body", value: body)
        ]
        return components.url
    }

    private static func urlValue(_ key: String, bundle: Bundle) -> URL? {
        let value = stringValue(key, bundle: bundle)
        return URL(string: value)
    }

    private static func rawString(_ key: String, bundle: Bundle) -> String {
        (bundle.object(forInfoDictionaryKey: key) as? String) ?? ""
    }

    private static func stringValue(_ key: String, bundle: Bundle, fallback: String = "") -> String {
        guard let raw = bundle.object(forInfoDictionaryKey: key) as? String else { return fallback }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty || (trimmed.hasPrefix("$(") && trimmed.hasSuffix(")")) {
            return fallback
        }
        return trimmed
    }

    private static func validateRequiredValue(_ raw: String, label: String) -> String? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty || (trimmed.hasPrefix("$(") && trimmed.hasSuffix(")")) {
            return "\(label) is missing. Add it to Secrets.xcconfig."
        }
        if trimmed.hasPrefix("<") && trimmed.hasSuffix(">") {
            return "\(label) is still a placeholder. Add the real mobile-safe value."
        }
        if trimmed != raw {
            return "\(label) contains leading or trailing whitespace. Remove the extra spaces."
        }
        if (trimmed.hasPrefix("\"") && trimmed.hasSuffix("\"")) || (trimmed.hasPrefix("'") && trimmed.hasSuffix("'")) {
            return "\(label) must not be wrapped in quote marks."
        }
        return nil
    }
}
