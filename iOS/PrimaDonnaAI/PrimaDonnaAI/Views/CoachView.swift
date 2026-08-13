import SwiftUI

struct CoachView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = CoachViewModel()

    var body: some View {
        PrimaPage {
            VStack(alignment: .leading, spacing: 22) {
                Eyebrow(text: "Coaching Engine")
                EditorialTitle(text: "Open a strategic\nsession.", size: 38)
                ChipRow(chips: viewModel.modes, selection: $viewModel.selectedMode)
                Text(viewModel.selectedSubtitle)
                    .font(.system(size: 18))
                    .foregroundStyle(PrimaColor.secondary)

                ZStack(alignment: .topLeading) {
                    TextEditor(text: $viewModel.prompt)
                        .scrollContentBackground(.hidden)
                        .font(.system(size: 18))
                        .foregroundStyle(PrimaColor.ink)
                        .padding(12)
                        .frame(minHeight: 214)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(PrimaColor.border, lineWidth: 1)
                        )

                    if viewModel.prompt.isEmpty {
                        Text("What's the situation?")
                            .font(.system(size: 18))
                            .foregroundStyle(PrimaColor.secondary)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 20)
                    }
                }

                HStack(spacing: 12) {
                    CapsuleButton(
                        title: viewModel.isListening ? "Listening..." : "Speak",
                        systemImage: viewModel.isListening ? "waveform" : "mic",
                        isDisabled: viewModel.isListening
                    ) {
                        Task { await viewModel.requestSpeech(appState: appState) }
                    }
                    CapsuleButton(
                        title: appState.saving ? "Moving..." : "Move",
                        systemImage: "paperplane",
                        isDisabled: !viewModel.canMove || appState.saving
                    ) {
                        Task { await viewModel.submit(appState: appState) }
                    }
                }

                CapsuleButton(title: "Previous strategies", systemImage: "text.bubble") {
                    viewModel.showHistory = true
                }
                .padding(.horizontal, 30)

                if let error = viewModel.errorText {
                    Text(error)
                        .font(PrimaFont.small)
                        .foregroundStyle(PrimaColor.accent)
                }
            }
        }
        .sheet(isPresented: $viewModel.showHistory) {
            CoachingHistorySheet(viewModel: viewModel)
                .environmentObject(appState)
        }
        .sheet(item: $viewModel.resultSession) { session in
            StrategyResultSheet(session: session)
                .environmentObject(appState)
        }
        .refreshable {
            await appState.refresh()
        }
        .task {
            await appState.refresh()
        }
    }
}

private struct CoachingHistorySheet: View {
    @EnvironmentObject private var appState: AppState
    @ObservedObject var viewModel: CoachViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if appState.data.coachingSessions.isEmpty {
                        EmptyState(text: "No previous strategies yet.")
                    } else {
                        ForEach(appState.data.coachingSessions) { session in
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    MetaBadge(text: session.modeLabel, tone: .pink)
                                    Spacer()
                                    Text(PrimaFormat.dateTime(session.createdAt))
                                        .font(PrimaFont.small)
                                        .foregroundStyle(PrimaColor.secondary)
                                }
                                Text(session.title)
                                    .font(PrimaFont.cardTitle())
                                    .foregroundStyle(PrimaColor.ink)
                                Text(session.response?.summary ?? session.prompt ?? "")
                                    .font(PrimaFont.body)
                                    .foregroundStyle(PrimaColor.secondary)
                                    .lineLimit(4)
                                HStack(spacing: 12) {
                                    CapsuleButton(title: "Details") {
                                        viewModel.resultSession = session
                                        dismiss()
                                    }
                                    CapsuleButton(
                                        title: voiceButtonTitle(for: session),
                                        systemImage: appState.audioPlayback.playingSessionId == session.id ? "stop.fill" : "play.fill",
                                        isDisabled: appState.audioPlayback.loadingSessionId == session.id
                                    ) {
                                        if appState.audioPlayback.playingSessionId == session.id {
                                            appState.stopRavenVoice()
                                        } else {
                                            Task { await viewModel.play(session, appState: appState) }
                                        }
                                    }
                                }
                            }
                            .primaCard()
                        }
                    }
                }
                .padding(24)
            }
            .background(PrimaColor.surface)
            .navigationTitle("Previous strategies")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func voiceButtonTitle(for session: CoachingSession) -> String {
        if appState.audioPlayback.loadingSessionId == session.id {
            return "Loading..."
        }
        return appState.audioPlayback.playingSessionId == session.id ? "Stop" : "Play"
    }
}

private struct StrategyResultSheet: View {
    @EnvironmentObject private var appState: AppState
    let session: CoachingSession

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                MetaBadge(text: session.modeLabel, tone: .pink)
                EditorialTitle(text: "Strategy ready.", size: 34)
                Text(PrimaFormat.dateTime(session.createdAt))
                    .font(PrimaFont.small)
                    .foregroundStyle(PrimaColor.secondary)

                StrategySection(title: "Diagnosis", text: session.response?.diagnosis)
                StrategySection(title: "Impact", text: session.response?.impact)
                StrategySection(title: "Strategic move", text: session.response?.strategicMove)
                StrategySection(title: "Elevation", text: session.response?.elevation)

                if let steps = session.response?.actionSteps, !steps.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Action steps")
                            .font(PrimaFont.cardTitle())
                        ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                            Text("\(index + 1). \(step)")
                                .font(PrimaFont.body)
                                .foregroundStyle(PrimaColor.secondary)
                        }
                    }
                    .primaCard()
                }

                CapsuleButton(
                    title: voiceButtonTitle,
                    systemImage: appState.audioPlayback.playingSessionId == session.id ? "stop.fill" : "play.fill",
                    isDisabled: appState.audioPlayback.loadingSessionId == session.id
                ) {
                    if appState.audioPlayback.playingSessionId == session.id {
                        appState.stopRavenVoice()
                    } else {
                        Task { await appState.playRavenVoice(for: session) }
                    }
                }
            }
            .padding(24)
        }
        .background(PrimaColor.surface)
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var voiceButtonTitle: String {
        if appState.audioPlayback.loadingSessionId == session.id {
            return "Loading Raven voice..."
        }
        return appState.audioPlayback.playingSessionId == session.id ? "Stop Raven voice" : "Play Raven voice"
    }
}

private struct StrategySection: View {
    let title: String
    let text: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(title)
                .font(PrimaFont.cardTitle())
                .foregroundStyle(PrimaColor.ink)
            Text(text?.nilIfBlank ?? "Raven did not include this section.")
                .font(PrimaFont.body)
                .foregroundStyle(PrimaColor.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .primaCard()
    }
}
