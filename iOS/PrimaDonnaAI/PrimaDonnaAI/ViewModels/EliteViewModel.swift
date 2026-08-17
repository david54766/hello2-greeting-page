import Foundation
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

@MainActor
final class EliteViewModel: ObservableObject {
    @Published var selectedThreadDetail: EliteThreadDetail?
    @Published var newThreadTitle = ""
    @Published var newThreadBody = ""
    @Published var newThreadImages: [EliteImageAttachment] = []
    @Published var replyBody = ""
    @Published var replyImages: [EliteImageAttachment] = []
    @Published var reportTarget: EliteReportTarget?
    @Published var reportReason = "Compliance concern"
    @Published var reportDetails = ""
    @Published var blockTarget: EliteBlockTarget?
    @Published var blockedUsers: [EliteBlock] = []
    @Published var loadingBlockedUsers = false
    @Published var errorText: String?

    let reportReasons = ["Compliance concern", "Privacy concern", "Inappropriate content", "Spam", "Other"]

    private let maxImageCount = 8
    private let maxImageBytes = 5 * 1024 * 1024

    func openThread(_ thread: EliteThread, appState: AppState) async {
        do {
            selectedThreadDetail = try await appState.openEliteThread(thread.id)
        } catch {
            errorText = error.localizedDescription
        }
    }

    func createThread(appState: AppState) async {
        errorText = nil
        guard newThreadTitle.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3 else {
            errorText = "Add a title before posting."
            return
        }
        guard newThreadBody.trimmingCharacters(in: .whitespacesAndNewlines).count >= 1 else {
            errorText = "Add a note before posting."
            return
        }
        do {
            try await appState.createEliteThread(title: newThreadTitle, body: newThreadBody, images: newThreadImages)
            newThreadTitle = ""
            newThreadBody = ""
            newThreadImages = []
        } catch {
            errorText = error.localizedDescription
        }
    }

    func reply(appState: AppState) async {
        errorText = nil
        guard let threadId = selectedThreadDetail?.thread.id else { return }
        guard replyBody.trimmingCharacters(in: .whitespacesAndNewlines).count >= 1 else {
            errorText = "Add a reply before posting."
            return
        }
        do {
            try await appState.replyEliteThread(threadId: threadId, body: replyBody, images: replyImages)
            selectedThreadDetail = try await appState.openEliteThread(threadId)
            replyBody = ""
            replyImages = []
        } catch {
            errorText = error.localizedDescription
        }
    }

    func deleteThread(_ thread: EliteThread, appState: AppState) async {
        do {
            try await appState.deleteEliteThread(thread.id)
            if selectedThreadDetail?.thread.id == thread.id {
                selectedThreadDetail = nil
            }
        } catch {
            errorText = error.localizedDescription
        }
    }

    func deleteReply(_ reply: EliteReply, appState: AppState) async {
        do {
            try await appState.deleteEliteReply(reply.id)
            if let threadId = selectedThreadDetail?.thread.id {
                selectedThreadDetail = try await appState.openEliteThread(threadId)
            }
        } catch {
            errorText = error.localizedDescription
        }
    }

    func beginReport(_ target: EliteReportTarget) {
        reportTarget = target
        reportReason = reportReasons.first ?? "Other"
        reportDetails = ""
    }

    func submitReport(appState: AppState) async {
        guard let reportTarget else { return }
        do {
            try await appState.reportEliteContent(target: reportTarget, reason: reportReason, details: reportDetails)
            self.reportTarget = nil
            reportDetails = ""
        } catch {
            errorText = error.localizedDescription
        }
    }

    func beginBlock(_ target: EliteBlockTarget) {
        blockTarget = target
    }

    func confirmBlock(appState: AppState) async {
        guard let blockTarget else { return }
        do {
            try await appState.blockEliteUser(blockTarget.userId)
            self.blockTarget = nil
            if selectedThreadDetail?.thread.userId == blockTarget.userId {
                selectedThreadDetail = nil
            } else if let threadId = selectedThreadDetail?.thread.id {
                selectedThreadDetail = try? await appState.openEliteThread(threadId)
            }
            await loadBlockedUsers(appState: appState)
        } catch {
            errorText = error.localizedDescription
        }
    }

    func loadBlockedUsers(appState: AppState) async {
        loadingBlockedUsers = true
        defer { loadingBlockedUsers = false }
        do {
            blockedUsers = try await appState.listEliteBlocks()
        } catch {
            errorText = error.localizedDescription
        }
    }

    func unblock(_ block: EliteBlock, appState: AppState) async {
        do {
            try await appState.unblockEliteUser(block.blockedUserId)
            await loadBlockedUsers(appState: appState)
        } catch {
            errorText = error.localizedDescription
        }
    }

    func loadNewThreadImages(from items: [PhotosPickerItem]) async {
        newThreadImages = await attachments(from: items)
    }

    func loadReplyImages(from items: [PhotosPickerItem]) async {
        replyImages = await attachments(from: items)
    }

    func removeNewThreadImage(_ image: EliteImageAttachment) {
        newThreadImages.removeAll { $0.id == image.id }
    }

    func removeReplyImage(_ image: EliteImageAttachment) {
        replyImages.removeAll { $0.id == image.id }
    }

    private func attachments(from items: [PhotosPickerItem]) async -> [EliteImageAttachment] {
        errorText = nil
        var attachments: [EliteImageAttachment] = []
        for item in items.prefix(maxImageCount) {
            guard let data = try? await item.loadTransferable(type: Data.self), !data.isEmpty else { continue }
            guard data.count <= maxImageBytes else {
                errorText = "Images must be 5 MB or smaller."
                continue
            }
            let type = item.supportedContentTypes.first(where: { $0.conforms(to: UTType.image) }) ?? UTType.jpeg
            let fileExtension = type.preferredFilenameExtension ?? "jpg"
            let contentType = type.preferredMIMEType ?? "image/jpeg"
            attachments.append(EliteImageAttachment(data: data, fileExtension: fileExtension, contentType: contentType))
        }
        return attachments
    }
}
