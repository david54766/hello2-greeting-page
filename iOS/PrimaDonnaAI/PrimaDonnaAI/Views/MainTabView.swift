import SwiftUI

enum PrimaTab: String, CaseIterable, Identifiable {
    case home = "Home"
    case coach = "Coach"
    case vault = "Vault"
    case elite = "Elite"
    case settings = "Settings"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .home:
            "house"
        case .coach:
            "text.bubble"
        case .vault:
            "folder"
        case .elite:
            "crown"
        case .settings:
            "gearshape"
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject private var appState: AppState
    @State private var selectedTab: PrimaTab = .home

    var body: some View {
        VStack(spacing: 0) {
            PrimaTopBar()
            ZStack {
                switch selectedTab {
                case .home:
                    HomeView()
                case .coach:
                    CoachView()
                case .vault:
                    VaultView()
                case .elite:
                    EliteView()
                case .settings:
                    SettingsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(PrimaColor.surface)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            PrimaTabBar(selectedTab: $selectedTab)
        }
        .overlay(alignment: .top) {
            if let notice = appState.notice {
                NoticeBanner(notice: notice) {
                    appState.clearNotice()
                }
                .padding(.horizontal, 24)
                .padding(.top, 64)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
    }
}

private struct PrimaTabBar: View {
    @Binding var selectedTab: PrimaTab

    var body: some View {
        HStack(spacing: 0) {
            ForEach(PrimaTab.allCases) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    VStack(spacing: 4) {
                        ZStack {
                            if selectedTab == tab {
                                Capsule()
                                    .fill(PrimaColor.selectedNav)
                                    .frame(width: tab == .elite ? 70 : 64, height: 45)
                            }
                            Image(systemName: tab.icon)
                                .font(.system(size: 23, weight: .semibold))
                                .foregroundStyle(PrimaColor.secondary)
                        }
                        .overlay {
                            if tab == .elite && selectedTab == .elite {
                                Circle()
                                    .stroke(PrimaColor.accent.opacity(0.45), lineWidth: 2)
                                    .frame(width: 47, height: 47)
                            }
                        }

                        Text(selectedTab == tab ? tab.rawValue : "")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(PrimaColor.ink)
                            .frame(height: 14)
                    }
                    .frame(maxWidth: .infinity)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.rawValue)
            }
        }
        .padding(.horizontal, 14)
        .padding(.top, 12)
        .padding(.bottom, 10)
        .background(PrimaColor.softPink)
    }
}
