import SwiftUI

struct PrimaPage<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 24) {
                content
            }
            .padding(.horizontal, 24)
            .padding(.top, 18)
            .padding(.bottom, 110)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(PrimaColor.surface)
    }
}

struct PrimaTopBar: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ZStack {
            HStack {
                Button {
                    Task { await appState.refresh() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(PrimaColor.secondary)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Refresh")

                Spacer()

                Button {
                    appState.signOut()
                } label: {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 21, weight: .medium))
                        .foregroundStyle(PrimaColor.secondary)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Sign out")
            }

            PrimaLogoView(compact: true)
        }
        .padding(.horizontal, 20)
        .frame(height: 64)
        .background(PrimaColor.surface)
    }
}

struct PrimaLogoView: View {
    var compact = false

    var body: some View {
        HStack(spacing: compact ? 8 : 12) {
            Image("PrimaDonnaLogo")
                .resizable()
                .scaledToFit()
                .frame(width: compact ? 168 : 232, height: compact ? 52 : 74)
                .clipShape(Rectangle())
            Text("AI")
                .font(.system(size: compact ? 17 : 21, weight: .bold))
                .foregroundStyle(PrimaColor.accent)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Prima Donna AI")
    }
}

struct Eyebrow: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(PrimaFont.eyebrow)
            .foregroundStyle(PrimaColor.accent)
    }
}

struct EditorialTitle: View {
    let text: String
    var size: CGFloat = 38

    var body: some View {
        Text(text)
            .font(PrimaFont.title(size))
            .foregroundStyle(PrimaColor.ink)
            .fixedSize(horizontal: false, vertical: true)
            .lineSpacing(2)
    }
}

struct ChipRow: View {
    let chips: [String]
    @Binding var selection: String

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(chips, id: \.self) { chip in
                    Button {
                        selection = chip
                    } label: {
                        Text(chip)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(PrimaColor.ink)
                            .padding(.horizontal, 22)
                            .frame(height: 54)
                            .background(selection == chip ? PrimaColor.selectedChip : Color.clear)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(selection == chip ? Color.clear : PrimaColor.border, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

struct SegmentChips<Selection: Hashable & RawRepresentable & CaseIterable>: View where Selection.RawValue == String, Selection.AllCases: RandomAccessCollection {
    @Binding var selection: Selection

    var body: some View {
        HStack(spacing: 10) {
            ForEach(Array(Selection.allCases), id: \.self) { item in
                Button {
                    selection = item
                } label: {
                    Text(item.rawValue)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(PrimaColor.ink)
                        .padding(.horizontal, 20)
                        .frame(height: 54)
                        .background(selection == item ? PrimaColor.selectedChip : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(selection == item ? Color.clear : PrimaColor.border, lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct MetaBadge: View {
    enum Tone {
        case neutral
        case gold
        case pink
    }

    let text: String
    var tone: Tone = .neutral

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(foreground)
            .padding(.horizontal, 13)
            .frame(height: 32)
            .background(background)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(border, lineWidth: 1))
    }

    private var background: Color {
        switch tone {
        case .neutral:
            PrimaColor.softPink.opacity(0.55)
        case .gold:
            PrimaColor.goldFill
        case .pink:
            PrimaColor.accent.opacity(0.08)
        }
    }

    private var foreground: Color {
        switch tone {
        case .gold:
            PrimaColor.goldText
        case .pink:
            PrimaColor.accent
        case .neutral:
            PrimaColor.secondary
        }
    }

    private var border: Color {
        switch tone {
        case .gold:
            PrimaColor.goldText.opacity(0.24)
        case .pink:
            PrimaColor.accent.opacity(0.25)
        case .neutral:
            PrimaColor.border
        }
    }
}

struct CapsuleButton: View {
    let title: String
    var systemImage: String?
    var isPrimary = false
    var isDisabled = false
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 17, weight: .semibold))
                }
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.84)
            }
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity)
            .frame(height: 58)
            .background(background)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(border, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
    }

    private var background: Color {
        if isDisabled { return PrimaColor.disabled }
        return isPrimary ? PrimaColor.ink : Color.white
    }

    private var foreground: Color {
        if isDisabled { return PrimaColor.secondary.opacity(0.45) }
        return isPrimary ? Color.white : PrimaColor.secondary
    }

    private var border: Color {
        isPrimary || isDisabled ? Color.clear : PrimaColor.secondary.opacity(0.35)
    }
}

struct NoticeBanner: View {
    let notice: Notice
    let dismiss: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: notice.kind == .error ? "exclamationmark.triangle" : "checkmark.circle")
                .foregroundStyle(notice.kind == .error ? PrimaColor.accent : PrimaColor.goldText)
            Text(notice.text)
                .font(PrimaFont.small)
                .foregroundStyle(PrimaColor.ink)
            Spacer()
            Button(action: dismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(PrimaColor.secondary)
            }
        }
        .padding(14)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(notice.kind == .error ? PrimaColor.accent.opacity(0.28) : PrimaColor.border, lineWidth: 1)
        )
    }
}

struct LoadingOverlay: View {
    var body: some View {
        ZStack {
            PrimaColor.surface.opacity(0.65).ignoresSafeArea()
            ProgressView()
                .controlSize(.large)
                .tint(PrimaColor.accent)
                .padding(24)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .shadow(color: .black.opacity(0.12), radius: 18, y: 8)
        }
    }
}

struct EmptyState: View {
    let text: String

    var body: some View {
        Text(text)
            .font(PrimaFont.body)
            .foregroundStyle(PrimaColor.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .primaCard()
    }
}

struct FormField: View {
    let title: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var axis: Axis = .horizontal

    var body: some View {
        if axis == .vertical {
            TextField(title, text: $text, axis: .vertical)
                .lineLimit(3...6)
                .font(PrimaFont.body)
                .foregroundStyle(PrimaColor.ink)
                .fieldShell()
                .keyboardType(keyboardType)
        } else {
            TextField(title, text: $text)
                .font(PrimaFont.body)
                .foregroundStyle(PrimaColor.ink)
                .fieldShell()
                .keyboardType(keyboardType)
        }
    }
}
