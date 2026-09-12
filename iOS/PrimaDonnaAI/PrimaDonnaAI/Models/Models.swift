import Foundation

struct AuthSession: Codable, Equatable {
    var accessToken: String
    var refreshToken: String?
    var expiresIn: Int?
    var tokenType: String?
    var user: AuthUser?
}

struct AuthUser: Codable, Equatable, Identifiable {
    var id: String
    var email: String?
}

enum MembershipTier: String, Codable, CaseIterable {
    case essentials
    case pro
    case elite

    var label: String {
        switch self {
        case .essentials:
            "Essentials"
        case .pro:
            "Pro"
        case .elite:
            "Elite"
        }
    }

    static func from(_ value: String?) -> MembershipTier {
        MembershipTier(rawValue: value?.lowercased() ?? "") ?? .essentials
    }
}

struct UserProfile: Codable, Equatable, Identifiable {
    var id: String
    var fullName: String?
    var businessName: String?
    var state: String?
    var timezone: String?
    var updatedAt: String?

    var displayName: String {
        fullName?.nilIfBlank ?? "Preschool Pro member"
    }
}

struct Subscription: Codable, Equatable, Identifiable {
    var id: String
    var userId: String
    var tier: String?
    var status: String?
    var currentPeriodEnd: String?

    var membershipTier: MembershipTier {
        MembershipTier.from(tier)
    }

    var planLabel: String {
        membershipTier.label
    }

    var statusLabel: String {
        guard let status = status?.capitalized.nilIfBlank else { return "Unknown" }
        return status
    }

    var hasActiveEliteAccess: Bool {
        membershipTier == .elite && (status?.lowercased() ?? "") == "active"
    }
}

struct LegalAcceptance: Codable, Equatable, Identifiable {
    var id: String
    var userId: String
    var termsVersion: String
    var privacyVersion: String
    var platform: String
    var appVersion: String?
    var userAgent: String?
    var acceptedAt: String?
}

struct Center: Codable, Equatable, Identifiable {
    var id: String
    var userId: String?
    var name: String?
    var city: String?
    var state: String?
    var agesServed: String?
    var enrollmentSize: Int?
    var capacity: Int?
    var tuitionRange: String?
    var staffCount: Int?
    var notes: String?
    var createdAt: String?

    var displayName: String {
        name?.nilIfBlank ?? "Your center"
    }

    var centerBadge: String {
        let parts = [displayName, city, state]
            .compactMap { $0?.nilIfBlank }
        return parts.joined(separator: " - ").uppercased()
    }

    var estimatedMonthlyRevenue: Decimal? {
        guard let enrollment = enrollmentSize, enrollment > 0 else { return nil }
        guard let midpoint = tuitionMidpoint else { return nil }
        return Decimal(enrollment) * midpoint
    }

    private var tuitionMidpoint: Decimal? {
        let matches = tuitionRange?.matches(for: #"\d+(?:\.\d+)?"#) ?? []
        let values = matches.compactMap { Decimal(string: $0) }
        guard !values.isEmpty else { return nil }
        return values.reduce(Decimal.zero, +) / Decimal(values.count)
    }
}

struct CenterDraft: Equatable {
    var id: String?
    var name = ""
    var city = ""
    var state = ""
    var agesServed = ""
    var enrollmentSize = ""
    var capacity = ""
    var tuitionRange = ""
    var staffCount = ""
    var notes = ""

    init() {}

    init(center: Center) {
        id = center.id
        name = center.name ?? ""
        city = center.city ?? ""
        state = center.state ?? ""
        agesServed = center.agesServed ?? ""
        enrollmentSize = center.enrollmentSize.map(String.init) ?? ""
        capacity = center.capacity.map(String.init) ?? ""
        tuitionRange = center.tuitionRange ?? ""
        staffCount = center.staffCount.map(String.init) ?? ""
        notes = center.notes ?? ""
    }

    var payload: [String: Any] {
        [
            "name": name,
            "city": city,
            "state": state,
            "ages_served": agesServed,
            "enrollment_size": Int(enrollmentSize) ?? 0,
            "capacity": Int(capacity) ?? 0,
            "tuition_range": tuitionRange,
            "staff_count": Int(staffCount) ?? 0,
            "notes": notes
        ]
    }
}

struct TemplateItem: Codable, Equatable, Identifiable {
    var id: String
    var title: String?
    var description: String?
    var category: String?
    var tierRequired: String?
    var storagePath: String?
    var isElite: Bool?

    var displayTitle: String {
        title?.nilIfBlank ?? "Vault resource"
    }

    var summary: String {
        description?.nilIfBlank ?? "A Preschool Pro AI operating resource."
    }

    var categoryLabel: String {
        category?.nilIfBlank?.uppercased() ?? "RESOURCE"
    }

    var tier: MembershipTier {
        if isElite == true { return .elite }
        return MembershipTier.from(tierRequired)
    }
}

struct RavenVideo: Codable, Equatable, Identifiable {
    var id: String
    var title: String?
    var description: String?
    var storagePath: String?
    var thumbnailPath: String?
    var durationSeconds: Int?
    var category: String?
    var sortOrder: Int?
}

struct CoachingSession: Codable, Equatable, Identifiable {
    var id: String
    var userId: String?
    var mode: String?
    var prompt: String?
    var response: StrategyResponse?
    var createdAt: String?

    var modeLabel: String {
        switch mode?.lowercased() {
        case "revenue":
            "Revenue"
        case "marketing":
            "Marketing"
        case "compliance":
            "Compliance"
        case "systems":
            "Systems"
        default:
            "CEO"
        }
    }

    var title: String {
        response?.strategicMove?.nilIfBlank ?? "Strategy ready."
    }

    var ravenVoiceText: String {
        var parts = [
            response?.diagnosis,
            response?.impact,
            response?.strategicMove,
            response?.elevation
        ].compactMap { $0?.nilIfBlank }
        if let steps = response?.actionSteps, !steps.isEmpty {
            parts.append("Here is where to start. " + steps.joined(separator: " Then, "))
        }
        return parts.joined(separator: " ").prefixString(5000)
    }
}

struct StrategyResponse: Codable, Equatable {
    var diagnosis: String?
    var impact: String?
    var strategicMove: String?
    var elevation: String?
    var actionSteps: [String]?

    var summary: String {
        strategicMove?.nilIfBlank
        ?? diagnosis?.nilIfBlank
        ?? impact?.nilIfBlank
        ?? "Raven prepared a strategic response."
    }
}

struct EliteThread: Codable, Equatable, Identifiable {
    var id: String
    var userId: String?
    var title: String?
    var body: String?
    var imageUrls: [String]?
    var pinned: Bool?
    var authorName: String?
    var replyCount: Int?
    var createdAt: String?
    var updatedAt: String?

    var displayTitle: String {
        title?.nilIfBlank ?? "Elite conversation"
    }
}

struct EliteReply: Codable, Equatable, Identifiable {
    var id: String
    var threadId: String?
    var userId: String?
    var body: String?
    var imageUrls: [String]?
    var authorName: String?
    var createdAt: String?
}

struct EliteThreadDetail: Codable, Equatable, Identifiable {
    var thread: EliteThread
    var replies: [EliteReply]

    var id: String { thread.id }
}

struct EliteBlock: Codable, Equatable, Identifiable {
    var id: String
    var blockedUserId: String
    var blockedUserName: String?
    var createdAt: String?
}

struct DailyRecommendation: Codable, Equatable {
    var title: String? = nil
    var body: String? = nil
    var createdAt: String? = nil
    var forDate: String? = nil
}

struct DailyRecommendationRow: Codable, Equatable {
    var recommendation: String?
    var createdAt: String?
    var forDate: String?

    var dailyRecommendation: DailyRecommendation {
        DailyRecommendation(
            title: "Raven daily brief",
            body: recommendation,
            createdAt: createdAt,
            forDate: forDate
        )
    }
}

struct EliteReportTarget: Equatable, Identifiable {
    enum ContentKind: String, Equatable {
        case thread
        case reply
    }

    var kind: ContentKind
    var threadId: String
    var replyId: String?
    var reportedTitle: String?
    var reportedBody: String?
    var reportedAuthor: String?

    var id: String {
        replyId ?? threadId
    }

    var label: String {
        kind == .thread ? "conversation" : "reply"
    }
}

struct EliteBlockTarget: Equatable, Identifiable {
    var userId: String
    var displayName: String

    var id: String { userId }
}

struct NotificationPreferences: Codable, Equatable, Identifiable {
    var userId: String
    var dailyBrief: Bool
    var coachingReplies: Bool
    var eliteActivity: Bool
    var marketing: Bool
    var quietHoursStart: Int?
    var quietHoursEnd: Int?
    var timezone: String
    var emailBrief: Bool
    var eliteReminders: Bool
    var aiProductUpdates: Bool
    var pushAlerts: Bool
    var createdAt: String?
    var updatedAt: String?

    var id: String { userId }

    static func defaults(userId: String, timezone: String = TimeZone.current.identifier) -> NotificationPreferences {
        NotificationPreferences(
            userId: userId,
            dailyBrief: true,
            coachingReplies: true,
            eliteActivity: true,
            marketing: false,
            quietHoursStart: nil,
            quietHoursEnd: nil,
            timezone: timezone,
            emailBrief: true,
            eliteReminders: true,
            aiProductUpdates: false,
            pushAlerts: true,
            createdAt: nil,
            updatedAt: nil
        )
    }

    var payload: [String: Any] {
        [
            "user_id": userId,
            "daily_brief": dailyBrief,
            "coaching_replies": coachingReplies,
            "elite_activity": eliteActivity,
            "marketing": marketing,
            "quiet_hours_start": quietHoursStart.map { $0 as Any } ?? NSNull(),
            "quiet_hours_end": quietHoursEnd.map { $0 as Any } ?? NSNull(),
            "timezone": timezone,
            "email_brief": emailBrief,
            "elite_reminders": eliteReminders,
            "ai_product_updates": aiProductUpdates,
            "push_alerts": pushAlerts
        ]
    }
}

struct EliteImageAttachment: Identifiable, Equatable {
    let id = UUID()
    var data: Data
    var fileExtension: String
    var contentType: String
}

struct DashboardData: Equatable {
    var profile: UserProfile?
    var subscription: Subscription?
    var centers: [Center] = []
    var templates: [TemplateItem] = []
    var videos: [RavenVideo] = []
    var coachingSessions: [CoachingSession] = []
    var eliteThreads: [EliteThread] = []
    var dailyRecommendation: DailyRecommendation?
    var notificationPreferences: NotificationPreferences?
}

extension String {
    var nilIfBlank: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    func matches(for pattern: String) -> [String] {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        let range = NSRange(startIndex..., in: self)
        return regex.matches(in: self, range: range).compactMap { match in
            Range(match.range, in: self).map { String(self[$0]) }
        }
    }

    func prefixString(_ count: Int) -> String {
        String(prefix(count))
    }
}
