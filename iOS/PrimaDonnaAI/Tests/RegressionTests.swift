import XCTest
import SwiftUI
@testable import PrimaDonnaAI

final class RegressionTests: XCTestCase {
    @MainActor
    func testHomeAndEliteLayoutSnapshots() async throws {
        let state = AppState()
        state.data.centers = try JSONDecoder().decode([Center].self, from: Data("""
        [{"id":"1","name":"North Center","city":"Atlanta","enrollmentSize":42,"capacity":60,"tuitionRange":"1000"},
         {"id":"2","name":"South Center"},{"id":"3","name":"East Center"},{"id":"4","name":"West Center"}]
        """.utf8))
        state.data.subscription = Subscription(id: "fixture", userId: "fixture", tier: "elite", status: "active")
        for width: CGFloat in [375, 430, 768] {
            for (name, view) in [("Home", AnyView(HomeView())), ("Elite", AnyView(EliteView()))] {
                let controller = UIHostingController(rootView: view
                    .environmentObject(state)
                    .environment(\.colorScheme, .light))
                let frame = CGRect(x: 0, y: 0, width: width, height: 900)
                let window = UIWindow(frame: frame)
                window.rootViewController = controller
                window.isHidden = false
                controller.view.frame = frame
                controller.view.setNeedsLayout()
                controller.view.layoutIfNeeded()
                try await Task.sleep(for: .milliseconds(300))
                let image = UIGraphicsImageRenderer(bounds: frame).image { context in
                    controller.view.layer.render(in: context.cgContext)
                }
                window.isHidden = true
                XCTAssertEqual(image.size.width, width)
                let pixels = try XCTUnwrap(image.cgImage?.dataProvider?.data) as Data
                XCTAssertGreaterThan(Set(pixels).count, 20, "Layout render must contain content, not a blank background")
                let attachment = XCTAttachment(image: image)
                attachment.name = "\(name)-\(Int(width))"
                attachment.lifetime = .keepAlways
                add(attachment)
            }
        }
    }

    @MainActor
    func testHomeKeepsEverySavedCenterInOrder() throws {
        let centers = try JSONDecoder().decode([Center].self, from: Data("""
        [{"id":"1","name":"North"},{"id":"2","name":"South"},{"id":"3","name":"East"},{"id":"4","name":"West"}]
        """.utf8))
        let result = HomeViewModel().snapshotCenters(from: DashboardData(centers: centers))
        XCTAssertEqual(result.map(\.id), ["1", "2", "3", "4"])
    }

    @MainActor
    func testHomeHasPlaceholderOnlyWhenNoCentersExist() {
        let result = HomeViewModel().snapshotCenters(from: DashboardData())
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result.first?.id, "placeholder-center")
    }

    func testVoiceAcceptsBackendAudio() async throws {
        let data = try await voiceResponse(#"{"ok":true,"mime_type":"audio/mpeg","audio_base64":"SUQz"}"#)
        XCTAssertEqual(data, Data("ID3".utf8))
    }

    func testVoicePreservesBackendError() async {
        await assertVoiceFailure(#"{"ok":false,"error":"Raven voice is temporarily unavailable."}"#,
                                 message: "Raven voice is temporarily unavailable.")
    }

    func testVoiceRejectsFailedPayloadEvenIfAudioExists() async {
        await assertVoiceFailure(#"{"ok":false,"audio_base64":"SUQz"}"#,
                                 message: "Voice did not return playable audio. Please try again.")
    }

    func testVoiceRejectsEmptyAndMalformedAudio() async {
        for audio in ["", "not-base64!"] {
            await assertVoiceFailure("{\"ok\":true,\"audio_base64\":\"\(audio)\"}",
                                     message: "Voice did not return playable audio. Please try again.")
        }
    }

    func testVoiceRejectsMissingAudio() async {
        await assertVoiceFailure(#"{"ok":true}"#,
                                 message: "Voice did not return playable audio. Please try again.")
    }

    @MainActor
    func testPlaybackFailureCanBeRetriedAndCleared() {
        let playback = AudioPlaybackService()
        playback.startLoading(sessionId: "one")
        playback.fail(message: "Unavailable", sessionId: "one")
        XCTAssertNil(playback.loadingSessionId)
        XCTAssertNil(playback.playingSessionId)
        XCTAssertEqual(playback.failedSessionId, "one")
        XCTAssertEqual(playback.errorMessage, "Unavailable")
        playback.startLoading(sessionId: "one")
        XCTAssertNil(playback.failedSessionId)
        XCTAssertNil(playback.errorMessage)
        playback.stop()
        XCTAssertNil(playback.loadingRequestID)
    }

    @MainActor
    func testCancelAndReplacementInvalidatePendingAudio() {
        let playback = AudioPlaybackService()
        let first = playback.startLoading(sessionId: "one")
        let second = playback.startLoading(sessionId: "one")
        XCTAssertNotEqual(first, second)
        XCTAssertEqual(playback.loadingRequestID, second)
        playback.stop()
        XCTAssertNil(playback.loadingRequestID)
        XCTAssertNil(playback.loadingSessionId)
    }

    private func assertVoiceFailure(_ json: String, message: String) async {
        do {
            _ = try await voiceResponse(json)
            XCTFail("Expected a voice error")
        } catch {
            XCTAssertEqual(error.localizedDescription, message)
        }
    }

    private func voiceResponse(_ json: String) async throws -> Data {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [VoiceStubProtocol.self]
        configuration.httpAdditionalHeaders = ["X-QA-Response": Data(json.utf8).base64EncodedString()]
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel() }
        let client = MobileApiClient(session: session)
        return try await client.synthesizeRavenVoice(session: AuthSession(accessToken: "qa-access-token"), text: "Voice check")
    }
}

private final class VoiceStubProtocol: URLProtocol {
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        XCTAssertEqual(request.url?.path, "/functions/v1/mobile-api")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer qa-access-token")
        XCTAssertFalse((request.value(forHTTPHeaderField: "apikey") ?? "").isEmpty)
        guard let encoded = request.value(forHTTPHeaderField: "X-QA-Response"),
              let body = Data(base64Encoded: encoded), let url = request.url,
              let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil,
                                             headerFields: ["Content-Type": "application/json"]) else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: body)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}
