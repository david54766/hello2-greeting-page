import SwiftUI

struct VaultView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @StateObject private var viewModel = VaultViewModel()

    var body: some View {
        PrimaPage {
            VStack(alignment: .leading, spacing: 22) {
                Eyebrow(text: "Template Vault")
                EditorialTitle(text: "The systems behind the\nstrategy.", size: 37)
                ChipRow(chips: viewModel.categories(from: appState.data.templates), selection: $viewModel.selectedCategory)

                let items = viewModel.visibleItems(from: appState.data.templates)
                if items.isEmpty {
                    EmptyState(text: "The Vault is being curated.")
                } else {
                    ForEach(items) { item in
                        VaultCard(item: item) {
                            viewModel.selectedItem = item
                        } download: {
                            Task { await viewModel.openDownload(for: item, appState: appState, openURL: openURL) }
                        }
                    }
                }

                if let error = viewModel.errorText {
                    Text(error)
                        .font(PrimaFont.small)
                        .foregroundStyle(PrimaColor.accent)
                }
            }
        }
        .sheet(item: $viewModel.selectedItem) { item in
            VaultDetailSheet(item: item) {
                Task { await viewModel.openDownload(for: item, appState: appState, openURL: openURL) }
            }
        }
        .refreshable {
            await appState.refresh()
        }
        .task {
            await appState.refresh()
        }
    }
}

private struct VaultCard: View {
    let item: TemplateItem
    let details: () -> Void
    let download: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                MetaBadge(text: item.categoryLabel, tone: .pink)
                MetaBadge(text: item.tier.label, tone: item.tier == .essentials ? .gold : .gold)
                Spacer()
            }

            VStack(alignment: .leading, spacing: 10) {
                Text(item.displayTitle)
                    .font(PrimaFont.cardTitle(18))
                    .foregroundStyle(PrimaColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(item.summary)
                    .font(.system(size: 18))
                    .foregroundStyle(PrimaColor.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 16) {
                CapsuleButton(title: "Details") {
                    details()
                }
                Button(action: download) {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.down.to.line")
                        Text("Download")
                            .font(.system(size: 16, weight: .bold))
                    }
                    .foregroundStyle(PrimaColor.accent)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                }
                .buttonStyle(.plain)
            }
        }
        .primaCard()
    }
}

private struct VaultDetailSheet: View {
    let item: TemplateItem
    let download: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    MetaBadge(text: item.categoryLabel, tone: .pink)
                    MetaBadge(text: item.tier.label, tone: .gold)
                }
                EditorialTitle(text: item.displayTitle, size: 32)
                Text(item.summary)
                    .font(PrimaFont.body)
                    .foregroundStyle(PrimaColor.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .primaCard()
                CapsuleButton(title: "Download", systemImage: "arrow.down.to.line") {
                    download()
                }
            }
            .padding(24)
        }
        .background(PrimaColor.surface)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}
