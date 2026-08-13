import Foundation

@MainActor
final class SettingsViewModel: ObservableObject {
    @Published var fullName = ""
    @Published var businessName = ""
    @Published var state = ""
    @Published var timezone = TimeZone.current.identifier
    @Published var centerDraft = CenterDraft()
    @Published var editingCenterId: String?
    @Published var errorText: String?
    @Published var dailyBrief = true
    @Published var coachingReplies = true
    @Published var eliteActivity = true
    @Published var emailBrief = true
    @Published var eliteReminders = true
    @Published var pushAlerts = true
    @Published var aiProductUpdates = false

    func sync(from data: DashboardData) {
        fullName = data.profile?.fullName ?? ""
        businessName = data.profile?.businessName ?? ""
        state = data.profile?.state ?? ""
        timezone = data.profile?.timezone ?? TimeZone.current.identifier
        if let preferences = data.notificationPreferences {
            dailyBrief = preferences.dailyBrief
            coachingReplies = preferences.coachingReplies
            eliteActivity = preferences.eliteActivity
            emailBrief = preferences.emailBrief
            eliteReminders = preferences.eliteReminders
            pushAlerts = preferences.pushAlerts
            aiProductUpdates = preferences.aiProductUpdates
        }
    }

    func beginAddCenter() {
        editingCenterId = nil
        centerDraft = CenterDraft()
    }

    func beginEdit(_ center: Center) {
        editingCenterId = center.id
        centerDraft = CenterDraft(center: center)
    }

    func saveProfile(appState: AppState) async {
        do {
            try await appState.updateProfile(fullName: fullName, businessName: businessName, state: state, timezone: timezone)
        } catch {
            errorText = error.localizedDescription
        }
    }

    func saveCenter(appState: AppState) async {
        do {
            if centerDraft.id == nil {
                try await appState.addCenter(centerDraft)
            } else {
                try await appState.updateCenter(centerDraft)
            }
            beginAddCenter()
        } catch {
            errorText = error.localizedDescription
        }
    }

    func deleteCenter(_ center: Center, appState: AppState) async {
        do {
            try await appState.deleteCenter(center.id)
            beginAddCenter()
        } catch {
            errorText = error.localizedDescription
        }
    }

    func saveNotificationPreferences(appState: AppState) async {
        guard let userId = appState.user?.id else {
            errorText = "Please sign in again before saving notification preferences."
            return
        }
        var preferences = appState.data.notificationPreferences ?? NotificationPreferences.defaults(userId: userId, timezone: timezone)
        preferences.dailyBrief = dailyBrief
        preferences.coachingReplies = coachingReplies
        preferences.eliteActivity = eliteActivity
        preferences.emailBrief = emailBrief
        preferences.eliteReminders = eliteReminders
        preferences.pushAlerts = pushAlerts
        preferences.aiProductUpdates = aiProductUpdates
        preferences.timezone = timezone.nilIfBlank ?? TimeZone.current.identifier
        do {
            try await appState.updateNotificationPreferences(preferences)
        } catch {
            errorText = error.localizedDescription
        }
    }
}
