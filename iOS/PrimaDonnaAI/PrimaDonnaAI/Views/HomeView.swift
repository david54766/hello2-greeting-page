import AVFoundation
import AVKit
import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = HomeViewModel()
    @State private var showDailyBrief = false

    var body: some View {
        PrimaPage {
            let recommendation = viewModel.recommendation(from: appState.data)
            let video = viewModel.primaryVideo(from: appState.data)
            HStack(alignment: .firstTextBaseline) {
                EditorialTitle(text: "Center snapshot", size: 34)
                Spacer(minLength: 14)
                if viewModel.shouldShowTierBadge(appState.data) {
                    MetaBadge(text: viewModel.tierLabel(from: appState.data), tone: .gold)
                        .padding(.top, 14)
                }
            }

            TabView {
                ForEach(viewModel.snapshotCenters(from: appState.data)) { center in
                    CenterSnapshotView(center: center)
                        .padding(.horizontal, 2)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .automatic))
            .frame(height: 310)

            VStack(alignment: .leading, spacing: 18) {
                EditorialTitle(text: "Today's strategic\nrecommendation", size: 31)
                Button {
                    showDailyBrief = true
                } label: {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(recommendation.title?.nilIfBlank ?? "Raven daily brief")
                            .font(PrimaFont.cardTitle(18))
                            .foregroundStyle(PrimaColor.ink)
                        Text(recommendation.body?.nilIfBlank ?? "Open the latest published Raven insight from your library.")
                            .font(PrimaFont.body)
                            .foregroundStyle(PrimaColor.secondary)
                            .lineLimit(3)
                            .fixedSize(horizontal: false, vertical: true)
                        HStack {
                            Text(video?.storagePath?.nilIfBlank == nil ? "Open daily brief" : "Open brief and video")
                                .font(.system(size: 15, weight: .semibold))
                            Spacer()
                            Image(systemName: "arrow.right")
                                .font(.system(size: 14, weight: .bold))
                        }
                        .foregroundStyle(PrimaColor.accent)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .primaCard()
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Open Raven daily brief")
            }
        }
        .refreshable {
            await appState.refresh()
        }
        .task {
            await appState.refresh()
        }
        .fullScreenCover(isPresented: $showDailyBrief) {
            RavenDailyBriefDetailView(recommendation: viewModel.recommendation(from: appState.data), video: viewModel.primaryVideo(from: appState.data))
                .environmentObject(appState)
        }
    }
}

private struct CenterSnapshotView: View {
    let center: Center

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            MetaBadge(text: center.centerBadge)
                .lineLimit(1)

            SnapshotStatCard(label: "Enrollment", value: center.enrollmentSize.map(String.init) ?? "Add enrollment")
            SnapshotStatCard(label: "Est. monthly revenue", value: PrimaFormat.currency(center.estimatedMonthlyRevenue))
            SnapshotStatCard(label: "Facility goal", value: center.capacity.map(String.init) ?? "-")
        }
    }
}

private struct RavenDailyBriefDetailView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    let recommendation: DailyRecommendation
    let video: RavenVideo?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 22) {
                HStack(spacing: 10) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(PrimaColor.ink)
                            .frame(width: 42, height: 42)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Back to Home")

                    Eyebrow(text: "Daily brief")
                }

                EditorialTitle(text: "Raven daily brief", size: 36)

                VStack(alignment: .leading, spacing: 12) {
                    Text(recommendation.body?.nilIfBlank ?? "Open the latest published Raven insight from your library.")
                        .font(PrimaFont.body)
                        .foregroundStyle(PrimaColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    if let forDate = recommendation.forDate?.nilIfBlank {
                        Text(forDate)
                            .font(PrimaFont.small)
                            .foregroundStyle(PrimaColor.secondary)
                    }
                }
                .primaCard()

                if let video {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(video.title?.nilIfBlank ?? "Raven insight")
                            .font(PrimaFont.cardTitle(20))
                            .foregroundStyle(PrimaColor.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        let metadata = [video.category?.nilIfBlank, video.durationSeconds.map(PrimaFormat.duration)]
                            .compactMap { $0 }
                            .joined(separator: " - ")
                        if !metadata.isEmpty {
                            Text(metadata)
                                .font(PrimaFont.small)
                                .foregroundStyle(PrimaColor.secondary)
                        }
                        RavenVideoPlayer(video: video)
                            .environmentObject(appState)
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 22)
            .padding(.bottom, 44)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(PrimaColor.surface.ignoresSafeArea())
    }
}

private struct RavenVideoPlayer: View {
    @EnvironmentObject private var appState: AppState
    let video: RavenVideo

    @State private var player: AVPlayer?
    @State private var aspectRatio: CGFloat = 16.0 / 9.0
    @State private var isLoading = false
    @State private var errorText: String?
    @State private var failureObserver: NSObjectProtocol?

    var body: some View {
        ZStack {
            Color.black
            if let player {
                VideoPlayer(player: player)
                    .accessibilityLabel("Raven recommendation video")
            } else if isLoading {
                ProgressView()
                    .tint(.white)
                    .accessibilityLabel("Loading video")
            } else {
                VStack(spacing: 14) {
                    Image(systemName: "video.slash")
                        .font(.system(size: 28, weight: .semibold))
                    Text(errorText ?? "This video is temporarily unavailable.")
                        .font(PrimaFont.small)
                        .multilineTextAlignment(.center)
                    Button {
                        Task { await load() }
                    } label: {
                        Label("Retry", systemImage: "arrow.clockwise")
                            .font(.system(size: 15, weight: .semibold))
                    }
                    .buttonStyle(.bordered)
                }
                .foregroundStyle(Color.white)
                .padding(20)
            }
        }
        .aspectRatio(aspectRatio, contentMode: .fit)
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .task(id: video.storagePath) {
            await load()
        }
        .onDisappear {
            stop()
        }
    }

    @MainActor
    private func load() async {
        stop()
        guard video.storagePath?.nilIfBlank != nil else {
            errorText = "This Raven video is missing a storage path."
            return
        }
        isLoading = true
        errorText = nil
        do {
            let url = try await appState.openRavenVideo(video)
            let asset = AVURLAsset(url: url)
            do {
                if let track = try await asset.loadTracks(withMediaType: .video).first {
                    let naturalSize = try await track.load(.naturalSize)
                    let transform = try await track.load(.preferredTransform)
                    let rect = CGRect(origin: .zero, size: naturalSize).applying(transform)
                    let width = abs(rect.width)
                    let height = abs(rect.height)
                    if width > 0, height > 0 {
                        aspectRatio = width / height
                    }
                }
            } catch {
                aspectRatio = 16.0 / 9.0
            }
            let item = AVPlayerItem(asset: asset)
            failureObserver = NotificationCenter.default.addObserver(
                forName: .AVPlayerItemFailedToPlayToEndTime,
                object: item,
                queue: .main
            ) { notification in
                let message = (notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error)?.localizedDescription
                Task { @MainActor in
                    self.errorText = message ?? "The video could not finish playing."
                    self.player = nil
                }
            }
            player = AVPlayer(playerItem: item)
            isLoading = false
        } catch {
            isLoading = false
            errorText = error.localizedDescription
        }
    }

    @MainActor
    private func stop() {
        player?.pause()
        player = nil
        if let failureObserver {
            NotificationCenter.default.removeObserver(failureObserver)
            self.failureObserver = nil
        }
    }
}

private struct SnapshotStatCard: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(label.uppercased())
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(PrimaColor.secondary)
            Text(value)
                .font(.system(size: 29, weight: .regular, design: .serif))
                .foregroundStyle(PrimaColor.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.74)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .primaCard(radius: 10, padding: 18)
    }
}
