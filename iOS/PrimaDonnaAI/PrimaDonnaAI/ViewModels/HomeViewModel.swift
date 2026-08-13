import Foundation

@MainActor
final class HomeViewModel: ObservableObject {
    func snapshotCenters(from data: DashboardData) -> [Center] {
        if !data.centers.isEmpty { return data.centers }
        return [
            Center(
                id: "placeholder-center",
                userId: nil,
                name: data.profile?.businessName ?? "Your center",
                city: nil,
                state: data.profile?.state,
                agesServed: nil,
                enrollmentSize: nil,
                capacity: nil,
                tuitionRange: nil,
                staffCount: nil,
                notes: nil,
                createdAt: nil
            )
        ]
    }

    func tierLabel(from data: DashboardData) -> String {
        data.subscription?.membershipTier.label ?? "Essentials"
    }

    func shouldShowTierBadge(_ data: DashboardData) -> Bool {
        let tier = data.subscription?.membershipTier
        return tier == .pro || tier == .elite
    }

    func recommendation(from data: DashboardData) -> DailyRecommendation {
        data.dailyRecommendation ?? DailyRecommendation(
            title: "Raven daily brief",
            body: "Open the latest published Raven insight from your library."
        )
    }

    func primaryVideo(from data: DashboardData) -> RavenVideo? {
        data.videos.first { $0.storagePath?.nilIfBlank != nil }
    }
}
