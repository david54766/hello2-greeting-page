import Foundation
import SwiftUI

@MainActor
final class VaultViewModel: ObservableObject {
    @Published var selectedCategory = "All"
    @Published var selectedItem: TemplateItem?
    @Published var errorText: String?

    func categories(from items: [TemplateItem]) -> [String] {
        let categories = items
            .compactMap { $0.category?.nilIfBlank }
            .map { $0.capitalized }
            .uniqued()
        return ["All"] + categories
    }

    func visibleItems(from items: [TemplateItem]) -> [TemplateItem] {
        guard selectedCategory != "All" else { return items }
        return items.filter { $0.category?.caseInsensitiveCompare(selectedCategory) == .orderedSame }
    }

    func openDownload(for item: TemplateItem, appState: AppState, openURL: OpenURLAction) async {
        do {
            let url = try await appState.openVaultAsset(item)
            openURL(url)
        } catch {
            errorText = error.localizedDescription
        }
    }
}

private extension Array where Element: Hashable {
    func uniqued() -> [Element] {
        var seen = Set<Element>()
        return filter { seen.insert($0).inserted }
    }
}

