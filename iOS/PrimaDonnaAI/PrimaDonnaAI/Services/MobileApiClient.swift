import Foundation

final class MobileApiClient {
    private let config: AppConfig
    private let session: URLSession
    private let decoder: JSONDecoder

    init(config: AppConfig = .shared, session: URLSession? = nil) {
        self.config = config
        self.session = session ?? Self.defaultSession()
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder = decoder
    }

    private static func defaultSession() -> URLSession {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 45
        configuration.timeoutIntervalForResource = 90
        return URLSession(configuration: configuration)
    }

    func runCoaching(session authSession: AuthSession, mode: String, prompt: String) async throws -> CoachingSession {
        let payload = try await call(
            action: "run_coaching",
            data: ["mode": mode.lowercased(), "prompt": prompt],
            session: authSession,
            decodeAs: RunCoachingPayload.self
        )
        if let error = payload.error ?? payload.message {
            throw AppError.message(error)
        }
        guard payload.ok != false, let coachingSession = payload.session else {
            throw AppError.message("Raven could not prepare a strategy right now.")
        }
        return coachingSession
    }

    func synthesizeRavenVoice(session authSession: AuthSession, text: String) async throws -> Data {
        let payload = try await call(
            action: "synthesize_raven_voice",
            data: ["text": text.prefixString(5000)],
            session: authSession,
            decodeAs: RavenVoicePayload.self
        )
        if let error = payload.error ?? payload.message {
            throw AppError.message(error)
        }
        guard let base64 = payload.audioBase64, let data = Data(base64Encoded: base64) else {
            throw AppError.message("Raven voice did not return playable audio.")
        }
        return data
    }

    func generateDailyRecommendation(session authSession: AuthSession, centerId: String) async throws -> DailyRecommendation {
        let payload = try await call(
            action: "generate_daily_recommendation",
            data: ["center_id": centerId],
            session: authSession,
            decodeAs: DailyRecommendationPayload.self
        )
        if let recommendation = payload.recommendation {
            return recommendation
        }
        return DailyRecommendation(title: payload.title, body: payload.body)
    }

    func secureVaultAssetURL(session authSession: AuthSession, vaultItemId: String) async throws -> URL {
        let payload = try await call(
            action: "get_secure_vault_asset",
            data: ["vault_item_id": vaultItemId],
            session: authSession,
            decodeAs: SecureAssetPayload.self
        )
        if let error = payload.error ?? payload.message {
            throw AppError.message(error)
        }
        let rawURL = payload.signedDownloadURL ?? payload.signedUrl ?? payload.openURL ?? payload.url
        guard let rawURL, let url = URL(string: rawURL) else {
            throw AppError.message("This Vault asset is not available for download yet.")
        }
        return url
    }

    func listEliteThreads(session authSession: AuthSession) async throws -> [EliteThread] {
        try await call(action: "list_elite_threads", session: authSession, decodeAs: EliteThreadsPayload.self).threads ?? []
    }

    func createEliteThread(session authSession: AuthSession, title: String, body: String, imageUrls: [String] = []) async throws {
        let payload = try await call(
            action: "create_elite_thread",
            data: ["title": title, "body": body, "image_urls": imageUrls],
            session: authSession,
            decodeAs: BasicMobilePayload.self
        )
        try payload.throwIfFailed(defaultMessage: "Conversation could not be posted.")
    }

    func getEliteThread(session authSession: AuthSession, threadId: String) async throws -> EliteThreadDetail {
        try await call(action: "get_elite_thread", data: ["id": threadId], session: authSession, decodeAs: EliteThreadDetail.self)
    }

    func replyEliteThread(session authSession: AuthSession, threadId: String, body: String, imageUrls: [String] = []) async throws {
        let payload = try await call(
            action: "reply_elite_thread",
            data: ["thread_id": threadId, "body": body, "image_urls": imageUrls],
            session: authSession,
            decodeAs: BasicMobilePayload.self
        )
        try payload.throwIfFailed(defaultMessage: "Reply could not be posted.")
    }

    func deleteEliteThread(session authSession: AuthSession, threadId: String) async throws {
        let payload = try await call(action: "delete_elite_thread", data: ["id": threadId], session: authSession, decodeAs: BasicMobilePayload.self)
        try payload.throwIfFailed(defaultMessage: "Conversation could not be deleted.")
    }

    func reportEliteContent(session authSession: AuthSession, target: EliteReportTarget, reason: String, details: String) async throws {
        let contentId = target.replyId?.nilIfBlank ?? target.threadId
        let payload = try await call(
            action: "report_elite_content",
            data: [
                "content_type": target.kind.rawValue,
                "content_id": contentId,
                "reason": reason.trimmingCharacters(in: .whitespacesAndNewlines),
                "details": details.trimmingCharacters(in: .whitespacesAndNewlines),
                "platform": "ios"
            ],
            session: authSession,
            decodeAs: BasicMobilePayload.self
        )
        try payload.throwIfFailed(defaultMessage: "Report could not be sent.")
    }

    func blockEliteUser(session authSession: AuthSession, userId: String) async throws {
        let payload = try await call(
            action: "block_elite_user",
            data: ["blocked_user_id": userId],
            session: authSession,
            decodeAs: BasicMobilePayload.self
        )
        try payload.throwIfFailed(defaultMessage: "Member could not be blocked.")
    }

    func unblockEliteUser(session authSession: AuthSession, userId: String) async throws {
        let payload = try await call(
            action: "unblock_elite_user",
            data: ["blocked_user_id": userId],
            session: authSession,
            decodeAs: BasicMobilePayload.self
        )
        try payload.throwIfFailed(defaultMessage: "Member could not be unblocked.")
    }

    func listEliteBlocks(session authSession: AuthSession) async throws -> [EliteBlock] {
        try await call(action: "list_elite_blocks", session: authSession, decodeAs: EliteBlocksPayload.self).blocks ?? []
    }

    private func call<T: Decodable>(
        action: String,
        data: [String: Any]? = nil,
        session authSession: AuthSession,
        decodeAs type: T.Type
    ) async throws -> T {
        guard let baseURL = config.supabaseURL, config.isSupabaseConfigured else {
            throw AppError.message(config.supabaseConfigurationError ?? AppError.missingConfiguration.localizedDescription)
        }
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        let basePath = components?.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) ?? ""
        components?.path = "/" + [basePath, "functions/v1/mobile-api"]
            .filter { !$0.isEmpty }
            .joined(separator: "/")
        guard let url = components?.url else {
            throw AppError.message("The mobile API URL could not be created.")
        }
        var request = URLRequest(url: url)
        request.timeoutInterval = 45
        request.httpMethod = "POST"
        request.setValue(config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(authSession.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var body: [String: Any] = ["action": action]
        if let data { body["data"] = data }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (payload, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw AppError.message(SupabaseClient.readableError(from: payload, statusCode: http.statusCode))
        }
        do {
            return try decoder.decode(T.self, from: payload)
        } catch {
            throw AppError.message("The mobile API response was not in the expected format.")
        }
    }
}

private struct BasicMobilePayload: Codable {
    var ok: Bool?
    var error: String?
    var message: String?

    func throwIfFailed(defaultMessage: String) throws {
        if let error = error ?? message {
            throw AppError.message(error)
        }
        if ok == false {
            throw AppError.message(defaultMessage)
        }
    }
}

private struct RunCoachingPayload: Codable {
    var ok: Bool?
    var error: String?
    var message: String?
    var response: StrategyResponse?
    var session: CoachingSession?
}

private struct RavenVoicePayload: Codable {
    var ok: Bool?
    var error: String?
    var message: String?
    var mimeType: String?
    var audioBase64: String?
}

private struct DailyRecommendationPayload: Codable {
    var ok: Bool?
    var error: String?
    var message: String?
    var title: String?
    var body: String?
    var recommendation: DailyRecommendation?
}

private struct SecureAssetPayload: Codable {
    var ok: Bool?
    var error: String?
    var message: String?
    var signedDownloadURL: String?
    var signedUrl: String?
    var openURL: String?
    var url: String?
}

private struct EliteThreadsPayload: Codable {
    var threads: [EliteThread]?
}

private struct EliteBlocksPayload: Codable {
    var blocks: [EliteBlock]?
}
