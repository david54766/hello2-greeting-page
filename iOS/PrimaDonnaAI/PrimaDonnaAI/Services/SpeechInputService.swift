import Foundation
import AVFoundation
import Speech

@MainActor
final class SpeechInputService: ObservableObject {
    @Published private(set) var isRecording = false

    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var currentTranscript = ""

    func requestTranscript() async throws -> String {
        if isRecording {
            let transcript = currentTranscript
            stopRecording()
            return try transcriptOrError(transcript)
        }

        try await authorize()
        try startRecording()
        try await Task.sleep(nanoseconds: 6_000_000_000)
        let transcript = currentTranscript
        stopRecording()
        return try transcriptOrError(transcript)
    }

    func stopRecording() {
        if audioEngine.isRunning {
            audioEngine.inputNode.removeTap(onBus: 0)
            audioEngine.stop()
        }
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
        isRecording = false
    }

    private func authorize() async throws {
        let speechStatus = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { authStatus in
                continuation.resume(returning: authStatus)
            }
        }
        guard speechStatus == .authorized else {
            throw AppError.message("Speech input is not enabled. You can still type the prompt.")
        }

        let microphoneAllowed = await withCheckedContinuation { continuation in
            AVAudioApplication.requestRecordPermission { allowed in
                continuation.resume(returning: allowed)
            }
        }
        guard microphoneAllowed else {
            throw AppError.message("Microphone access is not enabled. You can still type the prompt.")
        }
    }

    private func startRecording() throws {
        stopRecording()
        currentTranscript = ""

        guard let recognizer = SFSpeechRecognizer(), recognizer.isAvailable else {
            throw AppError.message("Speech recognition is not available right now.")
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        recognitionRequest = request

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            Task { @MainActor in
                if let result {
                    self?.currentTranscript = result.bestTranscription.formattedString
                }
                if error != nil {
                    self?.stopRecording()
                }
            }
        }

        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()
        isRecording = true
    }

    private func transcriptOrError(_ transcript: String) throws -> String {
        guard let clean = transcript.nilIfBlank else {
            throw AppError.message("No speech was captured. Try again or type the prompt.")
        }
        return clean
    }
}
