import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @StateObject private var viewModel = SettingsViewModel()

    var body: some View {
        PrimaPage {
            VStack(alignment: .leading, spacing: 22) {
                Eyebrow(text: "Settings")
                EditorialTitle(text: "Account and centers.", size: 36)

                PlanCard(subscription: appState.data.subscription)

                VStack(alignment: .leading, spacing: 14) {
                    Text("Profile")
                        .font(PrimaFont.cardTitle())
                    FormField(title: "Name", text: $viewModel.fullName)
                    FormField(title: "Business name", text: $viewModel.businessName)
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: 12) {
                            FormField(title: "State", text: $viewModel.state)
                            FormField(title: "Timezone", text: $viewModel.timezone)
                        }
                        VStack(spacing: 12) {
                            FormField(title: "State", text: $viewModel.state)
                            FormField(title: "Timezone", text: $viewModel.timezone)
                        }
                    }
                    CapsuleButton(title: appState.saving ? "Saving..." : "Save profile", isDisabled: appState.saving) {
                        Task { await viewModel.saveProfile(appState: appState) }
                    }
                }
                .primaCard()

                NotificationPreferencesCard(viewModel: viewModel)
                    .environmentObject(appState)

                LegalPrivacyCard(openURL: openURL)

                AccountDeletionCard(openURL: openURL)

                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Text("Centers")
                            .font(PrimaFont.cardTitle())
                        Spacer()
                        Button {
                            viewModel.beginAddCenter()
                        } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(PrimaColor.accent)
                                .frame(width: 36, height: 36)
                        }
                    }

                    if appState.data.centers.isEmpty {
                        Text("Add your first center so Raven can ground strategy in real numbers.")
                            .font(PrimaFont.body)
                            .foregroundStyle(PrimaColor.secondary)
                    } else {
                        ForEach(appState.data.centers) { center in
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(center.displayName)
                                        .font(.system(size: 16, weight: .semibold))
                                    Text(center.centerBadge)
                                        .font(PrimaFont.small)
                                        .foregroundStyle(PrimaColor.secondary)
                                        .lineLimit(1)
                                }
                                Spacer()
                                Button {
                                    viewModel.beginEdit(center)
                                } label: {
                                    Image(systemName: "pencil")
                                        .foregroundStyle(PrimaColor.secondary)
                                        .frame(width: 36, height: 36)
                                }
                                Button {
                                    Task { await viewModel.deleteCenter(center, appState: appState) }
                                } label: {
                                    Image(systemName: "trash")
                                        .foregroundStyle(PrimaColor.secondary)
                                        .frame(width: 36, height: 36)
                                }
                            }
                            .padding(12)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).stroke(PrimaColor.border, lineWidth: 1))
                        }
                    }
                }
                .primaCard()

                CenterForm(viewModel: viewModel)
                    .environmentObject(appState)

                if let error = viewModel.errorText {
                    Text(error)
                        .font(PrimaFont.small)
                        .foregroundStyle(PrimaColor.accent)
                }
            }
        }
        .task {
            viewModel.sync(from: appState.data)
            await appState.refresh()
        }
        .onChange(of: appState.data.profile) { _, _ in
            viewModel.sync(from: appState.data)
        }
        .onChange(of: appState.data.notificationPreferences) { _, _ in
            viewModel.sync(from: appState.data)
        }
    }
}

private struct LegalPrivacyCard: View {
    let openURL: OpenURLAction
    private let config = AppConfig.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Legal and privacy")
                .font(PrimaFont.cardTitle())
            Text("Terms \(AppConfig.termsVersion) - Privacy \(AppConfig.privacyVersion)")
                .font(PrimaFont.body)
                .foregroundStyle(PrimaColor.secondary)
            legalButton("Terms of Service", url: config.termsURL)
            legalButton("Privacy Policy", url: config.privacyURL)
            legalButton("Cookie Information", url: config.cookiesURL)
            Text("Support and privacy contact: \(AppConfig.supportEmail)")
                .font(PrimaFont.small)
                .foregroundStyle(PrimaColor.secondary)
        }
        .primaCard()
    }

    private func legalButton(_ title: String, url: URL?) -> some View {
        Button {
            if let url { openURL(url) }
        } label: {
            HStack {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 14, weight: .bold))
            }
            .foregroundStyle(PrimaColor.accent)
            .frame(minHeight: 38)
        }
        .buttonStyle(.plain)
        .disabled(url == nil)
        .accessibilityLabel(title)
    }
}

private struct AccountDeletionCard: View {
    let openURL: OpenURLAction
    private let config = AppConfig.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Account deletion")
                .font(PrimaFont.cardTitle())
            Text("Start an account deletion request with Classroom Panda LLC. Support may verify ownership before deletion is completed.")
                .font(PrimaFont.body)
                .foregroundStyle(PrimaColor.secondary)
                .fixedSize(horizontal: false, vertical: true)
            CapsuleButton(title: "Request account deletion", systemImage: "envelope") {
                if let url = config.accountDeletionURL {
                    openURL(url)
                }
            }
        }
        .primaCard()
    }
}

private struct PlanCard: View {
    let subscription: Subscription?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Current plan")
                    .font(PrimaFont.cardTitle())
                Spacer()
                MetaBadge(text: subscription?.planLabel ?? "Essentials", tone: .gold)
            }
            Text(subscription?.statusLabel ?? "Plan status will appear after sign in data loads.")
                .font(PrimaFont.body)
                .foregroundStyle(PrimaColor.secondary)
        }
        .primaCard()
    }
}

private struct NotificationPreferencesCard: View {
    @EnvironmentObject private var appState: AppState
    @ObservedObject var viewModel: SettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Notifications")
                .font(PrimaFont.cardTitle())
            preferenceToggle("Daily brief", isOn: $viewModel.dailyBrief)
            preferenceToggle("Coaching replies", isOn: $viewModel.coachingReplies)
            preferenceToggle("Elite activity", isOn: $viewModel.eliteActivity)
            preferenceToggle("Elite reminders", isOn: $viewModel.eliteReminders)
            preferenceToggle("Email brief", isOn: $viewModel.emailBrief)
            preferenceToggle("Push alerts", isOn: $viewModel.pushAlerts)
            preferenceToggle("AI product updates", isOn: $viewModel.aiProductUpdates)
            CapsuleButton(title: appState.saving ? "Saving..." : "Save notifications", isDisabled: appState.saving) {
                Task { await viewModel.saveNotificationPreferences(appState: appState) }
            }
        }
        .primaCard()
    }

    private func preferenceToggle(_ title: String, isOn: Binding<Bool>) -> some View {
        Toggle(title, isOn: isOn)
            .font(PrimaFont.body)
            .foregroundStyle(PrimaColor.ink)
            .tint(PrimaColor.accent)
            .accessibilityLabel(title)
    }
}

private struct CenterForm: View {
    @EnvironmentObject private var appState: AppState
    @ObservedObject var viewModel: SettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(viewModel.centerDraft.id == nil ? "Add center" : "Edit center")
                .font(PrimaFont.cardTitle())
            FormField(title: "Center name", text: $viewModel.centerDraft.name)
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 12) {
                    FormField(title: "City", text: $viewModel.centerDraft.city)
                    FormField(title: "State", text: $viewModel.centerDraft.state)
                }
                VStack(spacing: 12) {
                    FormField(title: "City", text: $viewModel.centerDraft.city)
                    FormField(title: "State", text: $viewModel.centerDraft.state)
                }
            }
            FormField(title: "Ages served", text: $viewModel.centerDraft.agesServed)
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 12) {
                    FormField(title: "Enrollment", text: $viewModel.centerDraft.enrollmentSize, keyboardType: .numberPad)
                    FormField(title: "Capacity", text: $viewModel.centerDraft.capacity, keyboardType: .numberPad)
                }
                VStack(spacing: 12) {
                    FormField(title: "Enrollment", text: $viewModel.centerDraft.enrollmentSize, keyboardType: .numberPad)
                    FormField(title: "Capacity", text: $viewModel.centerDraft.capacity, keyboardType: .numberPad)
                }
            }
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 12) {
                    FormField(title: "Tuition range", text: $viewModel.centerDraft.tuitionRange)
                    FormField(title: "Staff", text: $viewModel.centerDraft.staffCount, keyboardType: .numberPad)
                }
                VStack(spacing: 12) {
                    FormField(title: "Tuition range", text: $viewModel.centerDraft.tuitionRange)
                    FormField(title: "Staff", text: $viewModel.centerDraft.staffCount, keyboardType: .numberPad)
                }
            }
            FormField(title: "Notes/context for AI", text: $viewModel.centerDraft.notes, axis: .vertical)
            CapsuleButton(title: appState.saving ? "Saving..." : "Save center", isDisabled: appState.saving) {
                Task { await viewModel.saveCenter(appState: appState) }
            }
        }
        .primaCard()
    }
}
