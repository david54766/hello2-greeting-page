import Foundation

final class AuthStore {
    private let client: SupabaseClient
    private let keychain: KeychainSessionStore
    private let config: AppConfig

    init(
        client: SupabaseClient,
        keychain: KeychainSessionStore = KeychainSessionStore(),
        config: AppConfig = .shared
    ) {
        self.client = client
        self.keychain = keychain
        self.config = config
    }

    func storedSession() throws -> AuthSession? {
        try keychain.read()
    }

    func signIn(email: String, password: String) async throws -> AuthSession {
        let session = try await client.signIn(email: email, password: password)
        try keychain.save(session)
        return session
    }

    func requestPasswordReset(email: String) async throws {
        try await client.requestPasswordReset(email: email, redirectTo: config.authRedirectURL)
    }

    func updateStoredSession(_ session: AuthSession) throws {
        try keychain.save(session)
    }

    func signOut() {
        keychain.clear()
    }

    func session(fromAuthRedirect url: URL) -> (session: AuthSession, isRecovery: Bool)? {
        let values = url.authParameters
        guard let accessToken = values["access_token"] else { return nil }
        let session = AuthSession(
            accessToken: accessToken,
            refreshToken: values["refresh_token"],
            expiresIn: values["expires_in"].flatMap(Int.init),
            tokenType: values["token_type"] ?? "bearer",
            user: nil
        )
        return (session, values["type"] == "recovery")
    }
}

private extension URL {
    var authParameters: [String: String] {
        var result: [String: String] = [:]
        URLComponents(url: self, resolvingAgainstBaseURL: false)?
            .queryItems?
            .forEach { item in
                if let value = item.value { result[item.name] = value }
            }
        fragment?
            .split(separator: "&")
            .forEach { pair in
                let parts = pair.split(separator: "=", maxSplits: 1).map(String.init)
                guard let key = parts.first?.removingPercentEncoding else { return }
                let value = parts.dropFirst().first?.removingPercentEncoding ?? ""
                result[key] = value
            }
        return result
    }
}
