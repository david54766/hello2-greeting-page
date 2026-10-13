import AVFoundation
import Foundation

@MainActor
final class AudioPlaybackService: NSObject, ObservableObject, AVAudioPlayerDelegate {
    @Published private(set) var loadingSessionId: String?
    @Published private(set) var playingSessionId: String?
    @Published private(set) var failedSessionId: String?
    @Published private(set) var errorMessage: String?
    private(set) var loadingRequestID: UUID?

    private var player: AVAudioPlayer?

    @discardableResult
    func startLoading(sessionId: String) -> UUID {
        stop()
        let requestID = UUID()
        loadingRequestID = requestID
        loadingSessionId = sessionId
        return requestID
    }

    func play(audioData: Data, sessionId: String) throws {
        let requestID = loadingRequestID
        stop()
        loadingRequestID = requestID
        loadingSessionId = sessionId
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playback, mode: .spokenAudio)
        try audioSession.setActive(true)
        let player = try AVAudioPlayer(data: audioData)
        player.delegate = self
        guard player.prepareToPlay() else {
            throw AppError.message("The voice audio could not be prepared. Please try again.")
        }
        self.player = player
        guard player.play() else {
            throw AppError.message("Voice playback could not start. Check your audio output and try again.")
        }
        loadingSessionId = nil
        loadingRequestID = nil
        playingSessionId = sessionId
    }

    func stop() {
        player?.stop()
        player = nil
        loadingSessionId = nil
        playingSessionId = nil
        loadingRequestID = nil
        failedSessionId = nil
        errorMessage = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    func fail(message: String, sessionId: String) {
        stop()
        failedSessionId = sessionId
        errorMessage = message
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            guard self.player === player else { return }
            if !flag, let sessionId = self.playingSessionId {
                self.fail(message: "Voice playback was interrupted. Please try again.", sessionId: sessionId)
            } else {
                self.stop()
            }
        }
    }

    nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        Task { @MainActor in
            guard self.player === player, let sessionId = self.playingSessionId else { return }
            self.fail(message: "The voice audio could not be played. Please try again.", sessionId: sessionId)
        }
    }
}
