import Foundation

@MainActor
final class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isSubmitting = false
    @Published var errorText: String?

    var canSubmit: Bool {
        email.contains("@") && !password.isEmpty && !isSubmitting
    }

    func signIn(appState: AppState) async {
        guard canSubmit else { return }
        await run {
            try await appState.signIn(email: email, password: password)
        }
    }

    func forgotPassword(appState: AppState) async {
        guard email.contains("@") else {
            errorText = "Enter your email first."
            return
        }
        await run {
            try await appState.requestPasswordReset(email: email)
        }
    }

    private func run(_ work: () async throws -> Void) async {
        isSubmitting = true
        errorText = nil
        defer { isSubmitting = false }
        do {
            try await work()
        } catch {
            errorText = readable(error)
        }
    }

    private func readable(_ error: Error) -> String {
        let text = error.localizedDescription
        let lowercased = text.lowercased()
        if lowercased.contains("invalid login credentials")
            || lowercased.contains("invalid credentials")
            || lowercased.contains("invalid password")
            || lowercased.contains("email not confirmed") {
            return "The email or password is incorrect. Check your password and try again."
        }
        return text
    }
}
