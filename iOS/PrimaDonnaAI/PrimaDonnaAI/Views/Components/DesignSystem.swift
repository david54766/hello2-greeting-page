import SwiftUI

enum PrimaColor {
    static let surface = Color(hex: 0xFFF7FA)
    static let card = Color.white
    static let accent = Color(hex: 0xE90092)
    static let selectedChip = Color(hex: 0xEFE2FF)
    static let selectedNav = Color(hex: 0xFFD7EE)
    static let softPink = Color(hex: 0xFFEEF6)
    static let goldFill = Color(hex: 0xF8F0E3)
    static let goldText = Color(hex: 0xB58B44)
    static let border = Color(hex: 0xE6DDE2)
    static let ink = Color(hex: 0x161316)
    static let secondary = Color(hex: 0x5F5860)
    static let disabled = Color(hex: 0xE7E3E5)
}

enum PrimaFont {
    static func title(_ size: CGFloat = 38) -> Font {
        .system(size: size, weight: .regular, design: .serif)
    }

    static func cardTitle(_ size: CGFloat = 18) -> Font {
        .system(size: size, weight: .semibold, design: .default)
    }

    static let eyebrow = Font.system(size: 13, weight: .bold, design: .default)
    static let body = Font.system(size: 16, weight: .regular, design: .default)
    static let small = Font.system(size: 13, weight: .regular, design: .default)
}

extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255.0,
            green: Double((hex >> 8) & 0xff) / 255.0,
            blue: Double(hex & 0xff) / 255.0,
            opacity: alpha
        )
    }
}

extension View {
    func primaCard(radius: CGFloat = 12, padding: CGFloat = 18) -> some View {
        self
            .padding(padding)
            .background(PrimaColor.card)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(PrimaColor.border, lineWidth: 1)
            )
    }

    func fieldShell() -> some View {
        self
            .padding(.horizontal, 16)
            .frame(minHeight: 54)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 17, style: .continuous)
                    .stroke(PrimaColor.border, lineWidth: 1)
            )
    }
}

enum PrimaFormat {
    static let currency: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 2
        return formatter
    }()

    static func currency(_ value: Decimal?) -> String {
        guard let value else { return "-" }
        return currency.string(from: value as NSDecimalNumber) ?? "-"
    }

    static func dateTime(_ isoString: String?) -> String {
        guard let isoString else { return "" }
        let date = ISO8601DateFormatter.flexible.date(from: isoString)
        guard let date else { return isoString }
        return DateFormatter.shortDateTime.string(from: date)
    }

    static func dateRange(start: String?, end: String?) -> String {
        guard let startDate = ISO8601DateFormatter.flexible.date(from: start ?? "") else {
            return "Raven session"
        }
        let startText = DateFormatter.shortSlot.string(from: startDate)
        guard let endDate = ISO8601DateFormatter.flexible.date(from: end ?? "") else {
            return startText
        }
        return "\(startText) - \(DateFormatter.shortTime.string(from: endDate))"
    }

    static func duration(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let remainingSeconds = seconds % 60
        return "\(minutes):\(String(format: "%02d", remainingSeconds))"
    }
}

extension ISO8601DateFormatter {
    static let flexible: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}

private extension DateFormatter {
    static let shortDateTime: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    static let shortSlot: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        return formatter
    }()

    static let shortTime: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter
    }()
}
