import Foundation

final class DownloadService {
    private let supabaseClient: SupabaseClient

    init(supabaseClient: SupabaseClient) {
        self.supabaseClient = supabaseClient
    }

    func protectedVaultURL(item: TemplateItem, session: AuthSession) async throws -> URL {
        let path = try StoragePathValidator.normalized(item.storagePath, label: "Vault asset")
        return try await supabaseClient.signedStorageURL(session: session, bucket: "templates", path: path)
    }
}

enum StoragePathValidator {
    static func remoteHTTPSURL(_ rawPath: String?, label: String) throws -> URL? {
        guard let value = rawPath?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
            return nil
        }
        guard let url = URL(string: value), let scheme = url.scheme else {
            return nil
        }
        guard scheme == "https" else {
            throw AppError.message("\(label) URL must use HTTPS.")
        }
        return url
    }

    static func normalized(_ rawPath: String?, label: String) throws -> String {
        guard var path = rawPath?.trimmingCharacters(in: .whitespacesAndNewlines), !path.isEmpty else {
            throw AppError.message("\(label) is missing a storage path.")
        }
        while path.hasPrefix("/") {
            path.removeFirst()
        }
        guard !path.isEmpty else {
            throw AppError.message("\(label) has an invalid storage path.")
        }
        guard !path.contains(".."),
              !path.contains("\\"),
              !path.contains("?"),
              !path.contains("#"),
              !path.contains("//"),
              URL(string: path)?.scheme == nil
        else {
            throw AppError.message("\(label) has an invalid storage path.")
        }
        let invalidCharacters = CharacterSet.controlCharacters
        guard path.rangeOfCharacter(from: invalidCharacters) == nil else {
            throw AppError.message("\(label) has an invalid storage path.")
        }
        return path
    }
}
