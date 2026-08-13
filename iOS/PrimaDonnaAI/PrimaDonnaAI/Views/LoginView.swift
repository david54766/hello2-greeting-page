import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = LoginViewModel()
    @State private var showsPassword = false

    var body: some View {
        ZStack {
            PrimaColor.surface.ignoresSafeArea()
            VStack(spacing: 0) {
                Spacer(minLength: 42)
                PrimaLogoView()
                    .padding(.bottom, 54)

                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 14) {
                        EditorialTitle(text: "Sign in", size: 43)
                        Text("Access your private AI command center.")
                            .font(.system(size: 20))
                            .foregroundStyle(PrimaColor.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    VStack(spacing: 18) {
                        TextField("Email", text: $viewModel.email)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                            .font(.system(size: 18))
                            .fieldShell()

                        HStack(spacing: 8) {
                            Group {
                                if showsPassword {
                                    TextField("Password", text: $viewModel.password)
                                } else {
                                    SecureField("Password", text: $viewModel.password)
                                }
                            }
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .font(.system(size: 18))

                            Button {
                                showsPassword.toggle()
                            } label: {
                                Image(systemName: showsPassword ? "eye.slash" : "eye")
                                    .font(.system(size: 19, weight: .semibold))
                                    .foregroundStyle(PrimaColor.secondary)
                                    .frame(width: 34, height: 34)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(showsPassword ? "Hide password" : "Show password")
                        }
                        .fieldShell()
                    }

                    Button {
                        Task { await viewModel.forgotPassword(appState: appState) }
                    } label: {
                        Text("Forgot password?")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(PrimaColor.accent)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }

                    CapsuleButton(
                        title: viewModel.isSubmitting ? "Entering..." : "Enter Command Center",
                        isPrimary: true,
                        isDisabled: !viewModel.canSubmit
                    ) {
                        Task { await viewModel.signIn(appState: appState) }
                    }

                    if let error = viewModel.errorText {
                        Text(error)
                            .font(PrimaFont.small)
                            .foregroundStyle(PrimaColor.accent)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(30)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 31, style: .continuous))
                .shadow(color: PrimaColor.ink.opacity(0.16), radius: 24, x: 0, y: 18)
                .padding(.horizontal, 34)

                Text("Prima Donna AI")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(PrimaColor.secondary)
                    .padding(.top, 28)

                Spacer(minLength: 58)
            }
        }
    }
}
