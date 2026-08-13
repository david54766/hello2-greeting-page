import Foundation

@MainActor
final class CoachViewModel: ObservableObject {
    let modes = ["CEO", "Revenue", "Marketing", "Compliance", "Systems"]
    let subtitles = [
        "CEO": "Vision - Leadership - Decisions",
        "Revenue": "Pricing - Enrollment - Unit economics",
        "Marketing": "Positioning - Tours - Reputation",
        "Compliance": "Licensing - Safety - Documentation",
        "Systems": "SOPs - Hiring - Daily rhythm"
    ]

    @Published var selectedMode = "CEO"
    @Published var prompt = ""
    @Published var showHistory = false
    @Published var resultSession: CoachingSession?
    @Published var errorText: String?
    @Published var isListening = false

    var canMove: Bool {
        prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
    }

    var selectedSubtitle: String {
        subtitles[selectedMode] ?? ""
    }

    func submit(appState: AppState) async {
        guard canMove else { return }
        do {
            errorText = nil
            resultSession = try await appState.submitCoaching(mode: selectedMode, prompt: prompt)
            prompt = ""
        } catch {
            errorText = error.localizedDescription
        }
    }

    func requestSpeech(appState: AppState) async {
        isListening = true
        errorText = nil
        defer { isListening = false }
        do {
            let transcript = try await appState.speechInput.requestTranscript()
            if !transcript.isEmpty { prompt = transcript }
        } catch {
            errorText = error.localizedDescription
        }
    }

    func play(_ session: CoachingSession, appState: AppState) async {
        await appState.playRavenVoice(for: session)
    }
}
