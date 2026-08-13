import AVFoundation
import Foundation

@MainActor
final class AudioPlaybackService: NSObject, ObservableObject, AVAudioPlayerDelegate {
    @Published private(set) var loadingSessionId: String?
    @Published private(set) var playingSessionId: String?

    private var player: AVAudioPlayer?

    func startLoading(sessionId: String) {
        stop()
        loadingSessionId = sessionId
    }

    func play(audioData: Data, sessionId: String) throws {
        stop()
        loadingSessionId = sessionId
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playback, mode: .spokenAudio)
        try audioSession.setActive(true)
        let player = try AVAudioPlayer(data: audioData)
        player.delegate = self
        player.prepareToPlay()
        self.player = player
        loadingSessionId = nil
        playingSessionId = sessionId
        player.play()
    }

    func stop() {
        player?.stop()
        player = nil
        loadingSessionId = nil
        playingSessionId = nil
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            self.player = nil
            self.playingSessionId = nil
            self.loadingSessionId = nil
        }
    }

    nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        Task { @MainActor in
            self.stop()
        }
    }
}
