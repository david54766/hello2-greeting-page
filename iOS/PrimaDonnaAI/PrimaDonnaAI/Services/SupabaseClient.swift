import Foundation

enum AppError: LocalizedError, Equatable {
    case missingConfiguration
    case message(String)

    var errorDescription: String? {
        switch self {
        case .missingConfiguration:
            "Add the Supabase URL and anon key to Secrets.xcconfig."
        case .message(let message):
            message
        }
    }
}

final class SupabaseClient {
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
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        return URLSession(configuration: configuration)
    }

    func signIn(email: String, password: String) async throws -> AuthSession {
        let body = ["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password]
        let request = try request(path: "/auth/v1/token", query: [URLQueryItem(name: "grant_type", value: "password")], method: "POST", body: body)
        return try await decode(AuthSession.self, from: request)
    }

    func requestPasswordReset(email: String, redirectTo: String) async throws {
        let query = redirectTo.isEmpty ? [] : [URLQueryItem(name: "redirect_to", value: redirectTo)]
        let request = try request(path: "/auth/v1/recover", query: query, method: "POST", body: ["email": email])
        _ = try await execute(request)
    }

    func refresh(refreshToken: String) async throws -> AuthSession {
        let request = try request(
            path: "/auth/v1/token",
            query: [URLQueryItem(name: "grant_type", value: "refresh_token")],
            method: "POST",
            body: ["refresh_token": refreshToken]
        )
        return try await decode(AuthSession.self, from: request)
    }

    func currentUser(session authSession: AuthSession) async throws -> AuthUser {
        let request = try request(path: "/auth/v1/user", method: "GET", authSession: authSession)
        return try await decode(AuthUser.self, from: request)
    }

    func profile(session authSession: AuthSession, userId: String) async throws -> UserProfile? {
        try await select("profiles", params: ["id": "eq.\(userId)"], limit: 1, session: authSession).first
    }

    func subscription(session authSession: AuthSession, userId: String) async throws -> Subscription? {
        try await select("subscriptions", params: ["user_id": "eq.\(userId)"], limit: 1, session: authSession).first
    }

    func centers(session authSession: AuthSession, userId: String) async throws -> [Center] {
        try await select("centers", params: ["user_id": "eq.\(userId)", "order": "created_at.desc"], session: authSession)
    }

    func templates(session authSession: AuthSession) async throws -> [TemplateItem] {
        try await select("templates", params: ["order": "category.asc,created_at.asc"], session: authSession)
    }

    func ravenVideos(session authSession: AuthSession) async throws -> [RavenVideo] {
        try await select(
            "raven_videos",
            select: "id,title,description,storage_path,thumbnail_path,duration_seconds,sort_order,category",
            params: ["published": "eq.true", "order": "category.asc,sort_order.asc"],
            session: authSession
        )
    }

    func dailyRecommendation(session authSession: AuthSession, userId: String) async throws -> DailyRecommendation? {
        let rows: [DailyRecommendationRow] = try await select(
            "daily_recommendations",
            select: "recommendation,created_at,for_date",
            params: [
                "user_id": "eq.\(userId)",
                "order": "for_date.desc,created_at.desc"
            ],
            limit: 1,
            session: authSession
        )
        return rows.first?.dailyRecommendation
    }

    func coachingSessions(session authSession: AuthSession, userId: String) async throws -> [CoachingSession] {
        try await select(
            "coaching_sessions",
            params: ["user_id": "eq.\(userId)", "order": "created_at.desc", "limit": "10"],
            session: authSession
        )
    }

    func hasCurrentLegalAcceptance(session authSession: AuthSession, userId: String) async throws -> Bool {
        let rows: [LegalAcceptance] = try await select(
            "legal_acceptances",
            params: [
                "user_id": "eq.\(userId)",
                "terms_version": "eq.\(AppConfig.termsVersion)",
                "privacy_version": "eq.\(AppConfig.privacyVersion)"
            ],
            limit: 1,
            session: authSession
        )
        return !rows.isEmpty
    }

    func recordLegalAcceptance(session authSession: AuthSession, userId: String) async throws {
        let body: [String: Any] = [
            "user_id": userId,
            "terms_version": AppConfig.termsVersion,
            "privacy_version": AppConfig.privacyVersion,
            "platform": "ios",
            "app_version": config.appVersionLabel,
            "user_agent": "PreschoolProAI iOS \(config.appVersionLabel)"
        ]
        let request = try request(
            path: "/rest/v1/legal_acceptances",
            query: [URLQueryItem(name: "on_conflict", value: "user_id,terms_version,privacy_version")],
            method: "POST",
            body: body,
            authSession: authSession,
            prefer: "resolution=ignore-duplicates,return=minimal"
        )
        _ = try await execute(request)
    }

    func notificationPreferences(session authSession: AuthSession, userId: String) async throws -> NotificationPreferences? {
        try await select("notification_preferences", params: ["user_id": "eq.\(userId)"], limit: 1, session: authSession).first
    }

    func upsertNotificationPreferences(session authSession: AuthSession, preferences: NotificationPreferences) async throws -> NotificationPreferences? {
        let request = try request(
            path: "/rest/v1/notification_preferences",
            query: [URLQueryItem(name: "on_conflict", value: "user_id")],
            method: "POST",
            body: preferences.payload,
            authSession: authSession,
            preferRepresentation: true,
            prefer: "resolution=merge-duplicates"
        )
        return try await decode([NotificationPreferences].self, from: request).first
    }

    func upsertPushToken(session authSession: AuthSession, userId: String, token: String) async throws {
        let body: [String: Any] = [
            "user_id": userId,
            "token": token,
            "platform": "ios",
            "device_label": "iOS Device",
            "device_model": "iOS",
            "app_version": config.appVersionLabel,
            "enabled": true
        ]
        let request = try request(
            path: "/rest/v1/push_tokens",
            query: [URLQueryItem(name: "on_conflict", value: "token")],
            method: "POST",
            body: body,
            authSession: authSession,
            prefer: "resolution=merge-duplicates"
        )
        _ = try await execute(request)
    }

    func disablePushToken(session authSession: AuthSession, userId: String, token: String) async throws {
        let request = try request(
            path: "/rest/v1/push_tokens",
            query: [
                URLQueryItem(name: "user_id", value: "eq.\(userId)"),
                URLQueryItem(name: "token", value: "eq.\(token)")
            ],
            method: "PATCH",
            body: ["enabled": false],
            authSession: authSession
        )
        _ = try await execute(request)
    }

    func signedStorageURL(session authSession: AuthSession, bucket: String, path: String, expiresIn: Int = 3600) async throws -> URL {
        let request = try request(
            path: "/storage/v1/object/sign/\(bucket)/\(path)",
            method: "POST",
            body: ["expiresIn": expiresIn],
            authSession: authSession
        )
        let payload = try await decode(StorageSignedURLPayload.self, from: request)
        guard let signedPath = payload.signedURL ?? payload.signedUrl, !signedPath.isEmpty else {
            throw AppError.message("No signed URL returned for this file.")
        }
        let cleanSignedPath = signedPath.trimmingCharacters(in: .whitespacesAndNewlines)
        if let absoluteURL = URL(string: cleanSignedPath), absoluteURL.scheme != nil {
            return absoluteURL
        }
        guard let baseURL = config.supabaseURL else {
            throw AppError.message("The Supabase URL is not configured.")
        }
        let relativePath: String
        if cleanSignedPath.hasPrefix("/storage/v1/") {
            relativePath = cleanSignedPath
        } else if cleanSignedPath.hasPrefix("/object/") {
            relativePath = "/storage/v1\(cleanSignedPath)"
        } else {
            relativePath = cleanSignedPath.hasPrefix("/") ? cleanSignedPath : "/\(cleanSignedPath)"
        }
        guard let url = URL(string: relativePath, relativeTo: baseURL)?.absoluteURL else {
            throw AppError.message("The signed URL could not be created.")
        }
        return url
    }

    func uploadEliteImage(session authSession: AuthSession, userId: String, attachment: EliteImageAttachment) async throws -> URL {
        let path = "\(userId)/\(UUID().uuidString).\(attachment.fileExtension)"
        var request = try request(
            path: "/storage/v1/object/elite-images/\(path)",
            method: "POST",
            authSession: authSession
        )
        request.setValue(attachment.contentType, forHTTPHeaderField: "Content-Type")
        request.setValue("false", forHTTPHeaderField: "x-upsert")
        request.httpBody = attachment.data
        _ = try await execute(request)
        return try publicStorageURL(bucket: "elite-images", path: path)
    }

    func updateProfile(session authSession: AuthSession, userId: String, fullName: String, businessName: String, state: String, timezone: String) async throws -> UserProfile? {
        let body: [String: Any] = [
            "full_name": fullName,
            "business_name": businessName,
            "state": state,
            "timezone": timezone
        ]
        let request = try request(
            path: "/rest/v1/profiles",
            query: [URLQueryItem(name: "id", value: "eq.\(userId)")],
            method: "PATCH",
            body: body,
            authSession: authSession,
            preferRepresentation: true
        )
        return try await decode([UserProfile].self, from: request).first
    }

    func addCenter(session authSession: AuthSession, userId: String, draft: CenterDraft) async throws -> Center? {
        var body = draft.payload
        body["user_id"] = userId
        let request = try request(path: "/rest/v1/centers", method: "POST", body: body, authSession: authSession, preferRepresentation: true)
        return try await decode([Center].self, from: request).first
    }

    func updateCenter(session authSession: AuthSession, userId: String, draft: CenterDraft) async throws -> Center? {
        guard let centerId = draft.id else { throw AppError.message("Choose a center to update.") }
        let request = try request(
            path: "/rest/v1/centers",
            query: [URLQueryItem(name: "id", value: "eq.\(centerId)"), URLQueryItem(name: "user_id", value: "eq.\(userId)")],
            method: "PATCH",
            body: draft.payload,
            authSession: authSession,
            preferRepresentation: true
        )
        return try await decode([Center].self, from: request).first
    }

    func deleteCenter(session authSession: AuthSession, userId: String, centerId: String) async throws {
        let request = try request(
            path: "/rest/v1/centers",
            query: [URLQueryItem(name: "id", value: "eq.\(centerId)"), URLQueryItem(name: "user_id", value: "eq.\(userId)")],
            method: "DELETE",
            authSession: authSession
        )
        _ = try await execute(request)
    }

    func deleteCoachingSession(session authSession: AuthSession, userId: String, sessionId: String) async throws {
        let request = try request(
            path: "/rest/v1/coaching_sessions",
            query: [URLQueryItem(name: "id", value: "eq.\(sessionId)"), URLQueryItem(name: "user_id", value: "eq.\(userId)")],
            method: "DELETE",
            authSession: authSession
        )
        _ = try await execute(request)
    }

    func deleteEliteReply(session authSession: AuthSession, userId: String, replyId: String) async throws {
        let request = try request(
            path: "/rest/v1/elite_thread_replies",
            query: [URLQueryItem(name: "id", value: "eq.\(replyId)"), URLQueryItem(name: "user_id", value: "eq.\(userId)")],
            method: "DELETE",
            authSession: authSession
        )
        _ = try await execute(request)
    }

    func reportEliteContent(
        session authSession: AuthSession,
        userId: String,
        target: EliteReportTarget,
        reason: String,
        details: String
    ) async throws {
        var metadata: [String: Any] = [
            "thread_id": target.threadId,
            "target": target.kind.rawValue,
            "reason": reason.trimmingCharacters(in: .whitespacesAndNewlines).prefixString(120),
            "details": details.trimmingCharacters(in: .whitespacesAndNewlines).prefixString(1600),
            "source": "ios"
        ]
        if let replyId = target.replyId?.nilIfBlank {
            metadata["reply_id"] = replyId
        }
        if let reportedTitle = target.reportedTitle?.nilIfBlank {
            metadata["reported_title"] = reportedTitle.prefixString(240)
        }
        if let reportedBody = target.reportedBody?.nilIfBlank {
            metadata["reported_body"] = reportedBody.prefixString(1600)
        }
        if let reportedAuthor = target.reportedAuthor?.nilIfBlank {
            metadata["reported_author"] = reportedAuthor.prefixString(160)
        }
        let body: [String: Any] = [
            "user_id": userId,
            "event_type": "elite_conversation_report",
            "metadata": metadata
        ]
        let request = try request(
            path: "/rest/v1/usage_events",
            method: "POST",
            body: body,
            authSession: authSession,
            prefer: "return=minimal"
        )
        _ = try await execute(request)
    }

    private func select<T: Decodable>(
        _ table: String,
        select: String = "*",
        params: [String: String] = [:],
        limit: Int? = nil,
        session authSession: AuthSession
    ) async throws -> [T] {
        var query = [URLQueryItem(name: "select", value: select)]
        query.append(contentsOf: params.map { URLQueryItem(name: $0.key, value: $0.value) })
        if let limit {
            query.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        let request = try request(path: "/rest/v1/\(table)", query: query, method: "GET", authSession: authSession)
        return try await decode([T].self, from: request)
    }

    func request(
        path: String,
        query: [URLQueryItem] = [],
        method: String,
        body: [String: Any]? = nil,
        authSession: AuthSession? = nil,
        preferRepresentation: Bool = false,
        prefer: String? = nil
    ) throws -> URLRequest {
        var components = try components(path: path)
        components?.queryItems = query.isEmpty ? nil : query
        guard let url = components?.url else {
            throw AppError.message("The request URL could not be created.")
        }
        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        request.httpMethod = method
        request.setValue(config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var preferValues: [String] = []
        if preferRepresentation {
            preferValues.append("return=representation")
        }
        if let prefer {
            preferValues.append(prefer)
        }
        if !preferValues.isEmpty {
            request.setValue(preferValues.joined(separator: ","), forHTTPHeaderField: "Prefer")
        }
        if let token = authSession?.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        return request
    }

    private func components(path: String) throws -> URLComponents? {
        guard let baseURL = config.supabaseURL, config.isSupabaseConfigured else {
            throw AppError.message(config.supabaseConfigurationError ?? AppError.missingConfiguration.localizedDescription)
        }
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        let basePath = components?.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) ?? ""
        let requestPath = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        components?.path = "/" + [basePath, requestPath]
            .filter { !$0.isEmpty }
            .joined(separator: "/")
        return components
    }

    private func publicStorageURL(bucket: String, path: String) throws -> URL {
        guard var components = try components(path: "/storage/v1/object/public/\(bucket)/\(path)") else {
            throw AppError.message("The image URL could not be created.")
        }
        components.queryItems = nil
        guard let url = components.url else {
            throw AppError.message("The image URL could not be created.")
        }
        return url
    }

    func decode<T: Decodable>(_ type: T.Type, from request: URLRequest) async throws -> T {
        let data = try await execute(request)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw AppError.message("The server response was not in the expected format.")
        }
    }

    func execute(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { return data }
        guard (200..<300).contains(http.statusCode) else {
            throw AppError.message(Self.readableError(from: data, statusCode: http.statusCode))
        }
        return data
    }

    static func readableError(from data: Data, statusCode: Int) -> String {
        if
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let message = (json["msg"] ?? json["message"] ?? json["error_description"] ?? json["error"]) as? String,
            !message.isEmpty
        {
            if message.caseInsensitiveCompare("Invalid API key") == .orderedSame {
                return "Invalid Supabase API key. Confirm SUPABASE_ANON_KEY belongs to project ihiqixkufsjeplnkwkao and is the complete publishable or anon key."
            }
            return message
        }
        if let text = String(data: data, encoding: .utf8), !text.isEmpty {
            return text
        }
        return "Request failed with status \(statusCode)."
    }
}

private struct StorageSignedURLPayload: Codable {
    var signedURL: String?
    var signedUrl: String?
}
