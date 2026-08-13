import SwiftUI
import PhotosUI
import UIKit

struct EliteView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = EliteViewModel()

    var body: some View {
        PrimaPage {
            VStack(alignment: .leading, spacing: 22) {
                Eyebrow(text: "Elite Circle")
                EditorialTitle(text: "Welcome to the room.", size: 37)
                if appState.hasEliteAccess {
                    ConversationsPanel(viewModel: viewModel)
                } else {
                    EmptyState(text: "Elite Circle is available with an active Elite membership.")
                }

                if let error = viewModel.errorText {
                    Text(error)
                        .font(PrimaFont.small)
                        .foregroundStyle(PrimaColor.accent)
                }
            }
        }
        .sheet(item: $viewModel.selectedThreadDetail) { detail in
            EliteThreadDetailSheet(viewModel: viewModel, detail: detail)
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

private struct ConversationsPanel: View {
    @EnvironmentObject private var appState: AppState
    @ObservedObject var viewModel: EliteViewModel
    @State private var newThreadItems: [PhotosPickerItem] = []

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            EditorialTitle(text: "Latest conversations", size: 31)

            VStack(alignment: .leading, spacing: 12) {
                Text("Start a conversation")
                    .font(PrimaFont.cardTitle())
                    .foregroundStyle(PrimaColor.ink)
                FormField(title: "Title", text: $viewModel.newThreadTitle)
                FormField(title: "What should the room weigh in on?", text: $viewModel.newThreadBody, axis: .vertical)
                AttachmentPreviewStrip(images: viewModel.newThreadImages) { image in
                    viewModel.removeNewThreadImage(image)
                }
                PhotosPicker(selection: $newThreadItems, maxSelectionCount: 8, matching: .images) {
                    Label("Attach images", systemImage: "photo.on.rectangle")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(PrimaColor.accent)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(PrimaColor.softPink.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .accessibilityLabel("Attach images to conversation")
                .onChange(of: newThreadItems) { _, items in
                    Task { await viewModel.loadNewThreadImages(from: items) }
                }
                CapsuleButton(title: appState.saving ? "Posting..." : "Post", systemImage: "paperplane", isDisabled: appState.saving) {
                    Task { await viewModel.createThread(appState: appState) }
                }
            }
            .primaCard()

            if appState.data.eliteThreads.isEmpty {
                EmptyState(text: "No Elite conversations yet.")
            } else {
                ForEach(appState.data.eliteThreads) { thread in
                    EliteThreadCard(thread: thread, canDelete: thread.userId == appState.user?.id) {
                        Task { await viewModel.openThread(thread, appState: appState) }
                    } delete: {
                        Task { await viewModel.deleteThread(thread, appState: appState) }
                    }
                }
            }
        }
    }
}

private struct EliteThreadCard: View {
    let thread: EliteThread
    let canDelete: Bool
    let open: () -> Void
    let delete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            VStack(alignment: .leading, spacing: 6) {
                Text(thread.displayTitle)
                    .font(PrimaFont.cardTitle())
                    .foregroundStyle(PrimaColor.ink)
                Text("\(thread.authorName ?? "Member") - \(PrimaFormat.dateTime(thread.createdAt))")
                    .font(PrimaFont.small)
                    .foregroundStyle(PrimaColor.secondary)
            }

            Text(thread.body?.nilIfBlank ?? "")
                .font(.system(size: 18))
                .foregroundStyle(PrimaColor.secondary)
                .lineLimit(5)
                .fixedSize(horizontal: false, vertical: true)

            RemoteImageStrip(urls: thread.imageUrls ?? [])

            HStack {
                Text("\(thread.replyCount ?? 0) replies")
                    .font(PrimaFont.small)
                    .foregroundStyle(PrimaColor.secondary)
                Spacer()
                CapsuleButton(title: "Open", systemImage: "text.bubble") {
                    open()
                }
                .frame(width: 138)
                if canDelete {
                    Button(action: delete) {
                        Image(systemName: "trash")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(PrimaColor.ink)
                            .frame(width: 42, height: 42)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Delete conversation")
                }
            }
        }
        .primaCard()
    }
}

private struct EliteThreadDetailSheet: View {
    @EnvironmentObject private var appState: AppState
    @ObservedObject var viewModel: EliteViewModel
    let detail: EliteThreadDetail
    @State private var replyItems: [PhotosPickerItem] = []

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                let currentDetail = viewModel.selectedThreadDetail ?? detail
                EditorialTitle(text: currentDetail.thread.displayTitle, size: 31)
                VStack(alignment: .leading, spacing: 12) {
                    Text(currentDetail.thread.body?.nilIfBlank ?? "")
                        .font(PrimaFont.body)
                        .foregroundStyle(PrimaColor.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    RemoteImageStrip(urls: currentDetail.thread.imageUrls ?? [])
                    reportButton(
                        EliteReportTarget(
                            kind: .thread,
                            threadId: currentDetail.thread.id,
                            replyId: nil,
                            reportedTitle: currentDetail.thread.title,
                            reportedBody: currentDetail.thread.body,
                            reportedAuthor: currentDetail.thread.authorName
                        )
                    )
                }
                .primaCard()

                if !currentDetail.replies.isEmpty {
                    Text("Replies")
                        .font(PrimaFont.cardTitle())
                    ForEach(currentDetail.replies) { reply in
                        VStack(alignment: .leading, spacing: 10) {
                            Text(reply.authorName ?? "Member")
                                .font(.system(size: 15, weight: .bold))
                            Text(reply.body?.nilIfBlank ?? "")
                                .font(PrimaFont.body)
                                .foregroundStyle(PrimaColor.secondary)
                            RemoteImageStrip(urls: reply.imageUrls ?? [])
                            HStack(spacing: 16) {
                                reportButton(
                                    EliteReportTarget(
                                        kind: .reply,
                                        threadId: currentDetail.thread.id,
                                        replyId: reply.id,
                                        reportedTitle: currentDetail.thread.title,
                                        reportedBody: reply.body,
                                        reportedAuthor: reply.authorName
                                    )
                                )
                                if reply.userId == appState.user?.id {
                                    Button {
                                        Task { await viewModel.deleteReply(reply, appState: appState) }
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                            .font(PrimaFont.small)
                                            .foregroundStyle(PrimaColor.secondary)
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("Delete reply")
                                }
                            }
                        }
                        .primaCard(radius: 10, padding: 14)
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Reply")
                        .font(PrimaFont.cardTitle())
                    FormField(title: "Write a reply", text: $viewModel.replyBody, axis: .vertical)
                    AttachmentPreviewStrip(images: viewModel.replyImages) { image in
                        viewModel.removeReplyImage(image)
                    }
                    PhotosPicker(selection: $replyItems, maxSelectionCount: 8, matching: .images) {
                        Label("Attach images", systemImage: "photo.on.rectangle")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(PrimaColor.accent)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(PrimaColor.softPink.opacity(0.7))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .accessibilityLabel("Attach images to reply")
                    .onChange(of: replyItems) { _, items in
                        Task { await viewModel.loadReplyImages(from: items) }
                    }
                    CapsuleButton(title: appState.saving ? "Posting..." : "Post reply", systemImage: "paperplane", isDisabled: appState.saving) {
                        Task { await viewModel.reply(appState: appState) }
                    }
                }
                .primaCard()
            }
            .padding(24)
        }
        .background(PrimaColor.surface)
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .sheet(item: $viewModel.reportTarget) { target in
            EliteReportSheet(viewModel: viewModel, target: target)
                .environmentObject(appState)
        }
    }

    private func reportButton(_ target: EliteReportTarget) -> some View {
        Button {
            viewModel.beginReport(target)
        } label: {
            Label("Report", systemImage: "flag")
                .font(PrimaFont.small)
                .foregroundStyle(PrimaColor.secondary)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Report \(target.label)")
    }
}

private struct EliteReportSheet: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: EliteViewModel
    let target: EliteReportTarget

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    EditorialTitle(text: "Report \(target.label)", size: 32)
                    Text("Send this \(target.label) to the admin team for compliance review.")
                        .font(PrimaFont.body)
                        .foregroundStyle(PrimaColor.secondary)
                        .fixedSize(horizontal: false, vertical: true)

                    ChipRow(chips: viewModel.reportReasons, selection: $viewModel.reportReason)

                    FormField(title: "Details, optional", text: $viewModel.reportDetails, axis: .vertical)

                    CapsuleButton(
                        title: appState.saving ? "Sending..." : "Send report",
                        systemImage: "flag",
                        isPrimary: true,
                        isDisabled: appState.saving
                    ) {
                        Task {
                            await viewModel.submitReport(appState: appState)
                            if viewModel.reportTarget == nil {
                                dismiss()
                            }
                        }
                    }
                }
                .padding(24)
            }
            .background(PrimaColor.surface)
            .navigationTitle("Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") {
                        viewModel.reportTarget = nil
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

private struct AttachmentPreviewStrip: View {
    let images: [EliteImageAttachment]
    let remove: (EliteImageAttachment) -> Void

    var body: some View {
        if !images.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(images) { image in
                        ZStack(alignment: .topTrailing) {
                            if let uiImage = UIImage(data: image.data) {
                                Image(uiImage: uiImage)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 74, height: 74)
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            }
                            Button {
                                remove(image)
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(Color.white)
                                    .frame(width: 22, height: 22)
                                    .background(PrimaColor.ink.opacity(0.78))
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Remove image")
                        }
                    }
                }
            }
        }
    }
}

private struct RemoteImageStrip: View {
    let urls: [String]

    var body: some View {
        if !urls.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(urls, id: \.self) { rawURL in
                        if let url = URL(string: rawURL) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFill()
                                case .failure:
                                    Image(systemName: "photo")
                                        .foregroundStyle(PrimaColor.secondary)
                                case .empty:
                                    ProgressView()
                                        .tint(PrimaColor.accent)
                                @unknown default:
                                    EmptyView()
                                }
                            }
                            .frame(width: 86, height: 86)
                            .background(PrimaColor.softPink.opacity(0.6))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                    }
                }
            }
        }
    }
}
