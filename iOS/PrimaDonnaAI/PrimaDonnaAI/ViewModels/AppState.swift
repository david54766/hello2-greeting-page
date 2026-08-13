import Foundation
import SwiftUI
import UIKit
import UserNotifications

@MainActor
final class AppState: ObservableObject {
    @Published var session: AuthSession?
    @Published var user: AuthUser?
    @Published var data = DashboardData()
    @Published var loading = false
    @Published var saving = false
    @Published var requiresLegalAcceptance = false
    @Published var notice: Notice?

    let supabaseClient: SupabaseClient
    let mobileApiClient: MobileApiClient
    let audioPlayback: AudioPlaybackService
    let speechInput: SpeechInputService
    let downloadService: DownloadService
    let pushNotifications: PushNotificationService

    private let authStore: AuthStore
    private var didBootstrap = false

    init(
        supabaseClient: SupabaseClient = SupabaseClient(),
        mobileApiClient: MobileApiClient = MobileApiClient(),
        audioPlayback: AudioPlaybackService? = nil,
        speechInput: SpeechInputService? = nil,
        pushNotifications: PushNotificationService? = nil
    ) {
        self.supabaseClient = supabaseClient
        self.mobileApiClient = mobileApiClient
        self.audioPlayback = audioPlayback ?? AudioPlaybackService()
        self.speechInput = speechInput ?? SpeechInputService()
        self.downloadService = DownloadService(supabaseClient: supabaseClient)
        self.pushNotifications = pushNotifications ?? PushNotificationService()
        self.authStore = AuthStore(client: supabaseClient)
        self.pushNotifications.onTokenChange = { token in
            Task { @MainActor [weak self] in
                guard let self else { return }
                try? await self.persistPushToken(token)
            }
        }
    }

    var isAuthenticated: Bool {
        session != nil
    }

    var canEnterApplication: Bool {
        isAuthenticated && !requiresLegalAcceptance
    }

    var hasEliteAccess: Bool {
        data.subscription?.hasActiveEliteAccess == true
    }

    func bootstrap() async {
        guard !didBootstrap else { return }
        didBootstrap = true
        loading = true
        defer { loading = false }
        do {
            guard let stored = try authStore.storedSession() else { return }
            session = stored
            try await loadDataWithRefresh(stored)
        } catch {
            authStore.signOut()
            session = nil
            user = nil
            data = DashboardData()
            requiresLegalAcceptance = false
            notice = .error(readable(error))
        }
    }

    func signIn(email: String, password: String) async throws {
        loading = true
        defer { loading = false }
        let authSession = try await authStore.signIn(email: email, password: password)
        session = authSession
        try await loadData(using: authSession)
        notice = requiresLegalAcceptance ? .message("Review the current Terms and Privacy Policy to continue.") : .message("Welcome back.")
    }

    func requestPasswordReset(email: String) async throws {
        loading = true
        defer { loading = false }
        try await authStore.requestPasswordReset(email: email)
        notice = .message("Password reset email sent if that account exists.")
    }

    func handleAuthRedirect(_ url: URL) async {
        guard let result = authStore.session(fromAuthRedirect: url) else { return }
        if result.isRecovery {
            notice = .message("Open the web reset flow to finish setting your new password.")
            return
        }
        do {
            session = result.session
            try authStore.updateStoredSession(result.session)
            try await loadData(using: result.session)
        } catch {
            notice = .error(readable(error))
        }
    }

    func signOut() {
        let signOutSession = session
        let signOutUserId = user?.id
        let signOutToken = pushNotifications.deviceToken
        audioPlayback.stop()
        speechInput.stopRecording()
        if let signOutSession, let signOutUserId, let signOutToken {
            Task {
                try? await supabaseClient.disablePushToken(session: signOutSession, userId: signOutUserId, token: signOutToken)
            }
        }
        pushNotifications.clearRegistration()
        authStore.signOut()
        session = nil
        user = nil
        data = DashboardData()
        requiresLegalAcceptance = false
        notice = nil
    }

    func refresh() async {
        guard let session, !loading, canEnterApplication else { return }
        loading = true
        defer { loading = false }
        do {
            try await loadDataWithRefresh(session)
        } catch {
            notice = .error(readable(error))
        }
    }

    func acceptCurrentLegalTerms() async throws {
        guard let userId = user?.id else {
            throw AppError.message("Please sign in again before accepting the terms.")
        }
        saving = true
        defer { saving = false }
        let activeSession = try await withActiveSession { authSession in
            try await supabaseClient.recordLegalAcceptance(session: authSession, userId: userId)
            return authSession
        }
        requiresLegalAcceptance = false
        try await loadDataWithRefresh(activeSession)
        notice = .message("Terms accepted.")
    }

    func submitCoaching(mode: String, prompt: String) async throws -> CoachingSession {
        guard let cleanPrompt = prompt.nilIfBlank else {
            throw AppError.message("Enter a prompt before asking Raven.")
        }
        saving = true
        defer { saving = false }
        let session = try await withActiveSession { authSession in
            try await mobileApiClient.runCoaching(session: authSession, mode: mode, prompt: cleanPrompt)
        }
        try? await refreshAfterMutation()
        notice = .message("Strategy generated.")
        return session
    }

    func playRavenVoice(for coachingSession: CoachingSession) async {
        guard !coachingSession.ravenVoiceText.isEmpty else {
            notice = .error("This strategy does not have a response to play.")
            return
        }
        audioPlayback.startLoading(sessionId: coachingSession.id)
        do {
            let audio = try await withActiveSession { authSession in
                try await mobileApiClient.synthesizeRavenVoice(session: authSession, text: coachingSession.ravenVoiceText)
            }
            try audioPlayback.play(audioData: audio, sessionId: coachingSession.id)
        } catch {
            audioPlayback.stop()
            notice = .error(readable(error))
        }
    }

    func stopRavenVoice() {
        audioPlayback.stop()
    }

    func openVaultAsset(_ item: TemplateItem) async throws -> URL {
        try await withActiveSession { authSession in
            try await downloadService.protectedVaultURL(item: item, session: authSession)
        }
    }

    func openRavenVideo(_ video: RavenVideo) async throws -> URL {
        try await withActiveSession { authSession in
            if let remoteURL = try StoragePathValidator.remoteHTTPSURL(video.storagePath, label: "video") {
                return remoteURL
            }
            let path = try StoragePathValidator.normalized(video.storagePath, label: "video")
            return try await supabaseClient.signedStorageURL(session: authSession, bucket: "raven-videos", path: path)
        }
    }

    func createEliteThread(title: String, body: String, images: [EliteImageAttachment] = []) async throws {
        saving = true
        defer { saving = false }
        let imageUrls = try await uploadEliteImages(images)
        try await withActiveSession { authSession in
            try await mobileApiClient.createEliteThread(session: authSession, title: title, body: body, imageUrls: imageUrls)
        }
        try? await refreshAfterMutation()
        notice = .message("Conversation posted.")
    }

    func openEliteThread(_ threadId: String) async throws -> EliteThreadDetail {
        try await withActiveSession { authSession in
            try await mobileApiClient.getEliteThread(session: authSession, threadId: threadId)
        }
    }

    func replyEliteThread(threadId: String, body: String, images: [EliteImageAttachment] = []) async throws {
        saving = true
        defer { saving = false }
        let imageUrls = try await uploadEliteImages(images)
        try await withActiveSession { authSession in
            try await mobileApiClient.replyEliteThread(session: authSession, threadId: threadId, body: body, imageUrls: imageUrls)
        }
        try? await refreshAfterMutation()
        notice = .message("Reply posted.")
    }

    func deleteEliteThread(_ threadId: String) async throws {
        saving = true
        defer { saving = false }
        try await withActiveSession { authSession in
            try await mobileApiClient.deleteEliteThread(session: authSession, threadId: threadId)
        }
        try? await refreshAfterMutation()
        notice = .message("Conversation deleted.")
    }

    func deleteEliteReply(_ replyId: String) async throws {
        guard let userId = user?.id else { throw AppError.message("Please sign in again before deleting replies.") }
        saving = true
        defer { saving = false }
        try await withActiveSession { authSession in
            try await supabaseClient.deleteEliteReply(session: authSession, userId: userId, replyId: replyId)
        }
        try? await refreshAfterMutation()
        notice = .message("Reply deleted.")
    }

    func reportEliteContent(target: EliteReportTarget, reason: String, details: String) async throws {
        guard let userId = user?.id else { throw AppError.message("Please sign in again before reporting content.") }
        saving = true
        defer { saving = false }
        try await withActiveSession { authSession in
            try await supabaseClient.reportEliteContent(
                session: authSession,
                userId: userId,
                target: target,
                reason: reason,
                details: details
            )
        }
        notice = .message("Report sent for compliance review.")
    }

    func addCenter(_ draft: CenterDraft) async throws {
        guard let userId = user?.id else { throw AppError.message("Please sign in again before saving centers.") }
        saving = true
        defer { saving = false }
        try await withActiveSession { authSession in
            _ = try await supabaseClient.addCenter(session: authSession, userId: userId, draft: draft)
        }
        try? await refreshAfterMutation()
        notice = .message("Center added.")
    }

    func updateCenter(_ draft: CenterDraft) async throws {
        guard let userId = user?.id else { throw AppError.message("Please sign in again before saving centers.") }
        saving = true
        defer { saving = false }
        try await withActiveSession { authSession in
            _ = try await supabaseClient.updateCenter(session: authSession, userId: userId, draft: draft)
        }
        try? await refreshAfterMutation()
        notice = .message("Center updated.")
    }

    func deleteCenter(_ centerId: String) async throws {
        guard let userId = user?.id else { throw AppError.message("Please sign in again before deleting centers.") }
        saving = true
        defer { saving = false }
        try await withActiveSession { authSession in
            try await supabaseClient.deleteCenter(session: authSession, userId: userId, centerId: centerId)
        }
        try? await refreshAfterMutation()
        notice = .message("Center deleted.")
    }

    func updateProfile(fullName: String, businessName: String, state: String, timezone: String) async throws {
        guard let userId = user?.id else { throw AppError.message("Please sign in again before saving profile.") }
        saving = true
        defer { saving = false }
        try await withActiveSession { authSession in
            _ = try await supabaseClient.updateProfile(
                session: authSession,
                userId: userId,
                fullName: fullName,
                businessName: businessName,
                state: state,
                timezone: timezone
            )
        }
        try? await refreshAfterMutation()
        notice = .message("Profile saved.")
    }

    func updateNotificationPreferences(_ preferences: NotificationPreferences) async throws {
        saving = true
        defer { saving = false }
        let saved = try await withActiveSession { authSession in
            try await supabaseClient.upsertNotificationPreferences(session: authSession, preferences: preferences)
        }
        data.notificationPreferences = saved ?? preferences
        if preferences.pushAlerts {
            await registerPushNotificationsIfAllowed()
        } else {
            await disableCurrentPushToken()
        }
        notice = .message("Notification preferences saved.")
    }

    func registerPushNotificationsIfAllowed() async {
        guard data.notificationPreferences?.pushAlerts ?? false else { return }
        do {
            try await pushNotifications.requestAuthorizationAndRegister()
            if let token = pushNotifications.deviceToken {
                try await persistPushToken(token)
            }
        } catch {
            notice = .error(readable(error))
        }
    }

    func clearNotice() {
        notice = nil
    }

    private func loadDataWithRefresh(_ authSession: AuthSession) async throws {
        try await withRefreshRetry(authSession) { refreshed in
            try await loadData(using: refreshed)
        }
    }

    private func loadData(using authSession: AuthSession) async throws {
        let authUser: AuthUser
        if let existingUser = authSession.user {
            authUser = existingUser
        } else {
            authUser = try await supabaseClient.currentUser(session: authSession)
        }
        if let existingUserId = user?.id, existingUserId != authUser.id {
            audioPlayback.stop()
            data = DashboardData()
        }
        user = authUser
        let userId = authUser.id

        let hasLegalAcceptance = try await supabaseClient.hasCurrentLegalAcceptance(session: authSession, userId: userId)
        requiresLegalAcceptance = !hasLegalAcceptance
        guard hasLegalAcceptance else {
            data = DashboardData()
            return
        }

        async let profileTask = supabaseClient.profile(session: authSession, userId: userId)
        async let subscriptionTask = supabaseClient.subscription(session: authSession, userId: userId)
        async let centersTask = supabaseClient.centers(session: authSession, userId: userId)
        async let templatesTask = supabaseClient.templates(session: authSession)
        async let videosTask = supabaseClient.ravenVideos(session: authSession)
        async let sessionsTask = supabaseClient.coachingSessions(session: authSession, userId: userId)
        async let notificationPreferencesTask = supabaseClient.notificationPreferences(session: authSession, userId: userId)

        let profile = try await profileTask
        let subscription = try await subscriptionTask
        let centers = try await centersTask
        let templates = try await templatesTask
        let videos = try await videosTask
        let coachingSessions = try await sessionsTask
        var notificationPreferences = try await notificationPreferencesTask
        if notificationPreferences == nil {
            let timezone = profile?.timezone?.nilIfBlank ?? TimeZone.current.identifier
            let defaults = NotificationPreferences.defaults(userId: userId, timezone: timezone)
            notificationPreferences = try? await supabaseClient.upsertNotificationPreferences(session: authSession, preferences: defaults)
        }

        let eliteThreads = subscription?.hasActiveEliteAccess == true
            ? ((try? await mobileApiClient.listEliteThreads(session: authSession)) ?? [])
            : []
        let recommendation = await loadDailyRecommendation(authSession: authSession, userId: userId, videos: videos)

        data = DashboardData(
            profile: profile,
            subscription: subscription,
            centers: centers,
            templates: templates,
            videos: videos,
            coachingSessions: coachingSessions,
            eliteThreads: eliteThreads,
            dailyRecommendation: recommendation,
            notificationPreferences: notificationPreferences
        )

        // Notification permission is requested only after the user saves push preferences.
    }

    private func loadDailyRecommendation(authSession: AuthSession, userId: String, videos: [RavenVideo]) async -> DailyRecommendation? {
        if let recommendation = try? await supabaseClient.dailyRecommendation(session: authSession, userId: userId) {
            return recommendation
        }
        guard let video = videos.first(where: { $0.storagePath != nil }) else { return nil }
        return DailyRecommendation(title: video.title ?? "Raven daily brief", body: video.description ?? "Open the latest published Raven insight from your library.")
    }

    private func refreshAfterMutation() async throws {
        guard let session else { return }
        try await loadDataWithRefresh(session)
    }

    private func uploadEliteImages(_ images: [EliteImageAttachment]) async throws -> [String] {
        guard !images.isEmpty else { return [] }
        guard let userId = user?.id else {
            throw AppError.message("Please sign in again before uploading images.")
        }
        return try await withActiveSession { authSession in
            var urls: [String] = []
            for image in images {
                let url = try await supabaseClient.uploadEliteImage(session: authSession, userId: userId, attachment: image)
                urls.append(url.absoluteString)
            }
            return urls
        }
    }

    private func persistPushToken(_ token: String) async throws {
        guard let userId = user?.id, data.notificationPreferences?.pushAlerts == true else { return }
        try await withActiveSession { authSession in
            try await supabaseClient.upsertPushToken(session: authSession, userId: userId, token: token)
        }
    }

    private func disableCurrentPushToken() async {
        guard let token = pushNotifications.deviceToken, let userId = user?.id else { return }
        do {
            try await withActiveSession { authSession in
                try await supabaseClient.disablePushToken(session: authSession, userId: userId, token: token)
            }
        } catch {
            notice = .error(readable(error))
        }
    }

    private func withActiveSession<T>(_ block: (AuthSession) async throws -> T) async throws -> T {
        guard let session else {
            throw AppError.message("Please sign in again.")
        }
        return try await withRefreshRetry(session, block)
    }

    private func withRefreshRetry<T>(_ authSession: AuthSession, _ block: (AuthSession) async throws -> T) async throws -> T {
        do {
            return try await block(authSession)
        } catch {
            guard isExpiredSession(error), let refreshToken = authSession.refreshToken else {
                throw error
            }
            let refreshed = try await supabaseClient.refresh(refreshToken: refreshToken)
            try authStore.updateStoredSession(refreshed)
            session = refreshed
            return try await block(refreshed)
        }
    }

    private func isExpiredSession(_ error: Error) -> Bool {
        readable(error).lowercased().contains("jwt expired")
        || readable(error).lowercased().contains("token is expired")
        || readable(error).lowercased().contains("expired jwt")
        || readable(error).lowercased().contains("bad_jwt")
    }

    func readable(_ error: Error) -> String {
        error.localizedDescription
            .replacingOccurrences(of: "{", with: "")
            .replacingOccurrences(of: "}", with: "")
            .nilIfBlank
        ?? "Something went wrong."
    }
}

@MainActor
final class PushNotificationService: NSObject, ObservableObject {
    @Published private(set) var deviceToken: String?

    var onTokenChange: ((String) -> Void)?
    private var tokenObserver: NSObjectProtocol?

    override init() {
        super.init()
        tokenObserver = NotificationCenter.default.addObserver(
            forName: .primaDonnaAPNSToken,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let token = notification.object as? String else { return }
            Task { @MainActor [weak self] in
                self?.deviceToken = token
                self?.onTokenChange?(token)
            }
        }
    }

    deinit {
        if let tokenObserver {
            NotificationCenter.default.removeObserver(tokenObserver)
        }
    }

    func requestAuthorizationAndRegister() async throws {
        let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
        guard granted else {
            throw AppError.message("Push notifications are disabled. You can turn them on later in iOS Settings.")
        }
        UIApplication.shared.registerForRemoteNotifications()
    }

    func clearRegistration() {
        deviceToken = nil
        UIApplication.shared.unregisterForRemoteNotifications()
    }
}

extension Notification.Name {
    static let primaDonnaAPNSToken = Notification.Name("PrimaDonnaAI.didRegisterForRemoteNotifications")
}

struct Notice: Equatable, Identifiable {
    enum Kind {
        case message
        case error
    }

    let id = UUID()
    var kind: Kind
    var text: String

    static func message(_ text: String) -> Notice {
        Notice(kind: .message, text: text)
    }

    static func error(_ text: String) -> Notice {
        Notice(kind: .error, text: text)
    }
}
