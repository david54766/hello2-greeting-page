import FirebaseCore
import FirebaseMessaging
import SwiftUI
import UIKit

@main
struct PrimaDonnaAIApp: App {
    @UIApplicationDelegateAdaptor(PrimaDonnaAppDelegate.self) private var appDelegate
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .task {
                    await appState.bootstrap()
                }
                .onOpenURL { url in
                    Task {
                        await appState.handleAuthRedirect(url)
                    }
                }
        }
    }
}

private struct RootView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ZStack {
            PrimaColor.surface.ignoresSafeArea()
            if appState.canEnterApplication {
                MainTabView()
            } else if appState.isAuthenticated {
                LegalConsentView()
            } else {
                LoginView()
            }

            if appState.loading {
                LoadingOverlay()
            }
        }
        .animation(.easeInOut(duration: 0.18), value: appState.canEnterApplication)
    }
}

private struct LegalConsentView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @State private var accepted = false
    @State private var errorText: String?

    private let config = AppConfig.shared

    var body: some View {
        ZStack {
            PrimaColor.surface.ignoresSafeArea()
            ScrollView(showsIndicators: false) {
                VStack(spacing: 30) {
                    Spacer(minLength: 24)
                    PrimaLogoView()

                    VStack(alignment: .leading, spacing: 22) {
                        Eyebrow(text: "Legal consent")
                        EditorialTitle(text: "Review the current\nterms.", size: 38)

                        Text("To enter Prima Donna AI, accept the current Terms of Service and Privacy Policy.")
                            .font(PrimaFont.body)
                            .foregroundStyle(PrimaColor.secondary)
                            .fixedSize(horizontal: false, vertical: true)

                        VStack(alignment: .leading, spacing: 12) {
                            legalLink(title: "Terms of Service", url: config.termsURL)
                            legalLink(title: "Privacy Policy", url: config.privacyURL)
                            legalLink(title: "Cookie Information", url: config.cookiesURL)
                        }

                        Toggle(isOn: $accepted) {
                            Text("I agree to the Terms of Service and acknowledge the Privacy Policy.")
                                .font(PrimaFont.body)
                                .foregroundStyle(PrimaColor.ink)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .tint(PrimaColor.accent)

                        CapsuleButton(
                            title: appState.saving ? "Saving..." : "Agree and continue",
                            isPrimary: true,
                            isDisabled: !accepted || appState.saving
                        ) {
                            Task { await accept() }
                        }

                        Button {
                            appState.signOut()
                        } label: {
                            Text("Decline and sign out")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(PrimaColor.secondary)
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.plain)

                        if let errorText {
                            Text(errorText)
                                .font(PrimaFont.small)
                                .foregroundStyle(PrimaColor.accent)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .padding(30)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).stroke(PrimaColor.border, lineWidth: 1))
                    .padding(.horizontal, 28)
                    Spacer(minLength: 40)
                }
            }
        }
    }

    private func legalLink(title: String, url: URL?) -> some View {
        Button {
            if let url {
                openURL(url)
            }
        } label: {
            HStack {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 14, weight: .bold))
            }
            .foregroundStyle(PrimaColor.accent)
            .padding(14)
            .background(PrimaColor.softPink.opacity(0.55))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(url == nil)
    }

    private func accept() async {
        guard accepted else { return }
        errorText = nil
        do {
            try await appState.acceptCurrentLegalTerms()
        } catch {
            errorText = error.localizedDescription
        }
    }
}

final class PrimaDonnaAppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }
}

extension PrimaDonnaAppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else { return }
        NotificationCenter.default.post(name: .primaDonnaFCMToken, object: fcmToken)
    }
}
