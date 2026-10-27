# UI/UX Design Specification — Pulse AI Agent Management Platform

## 1. Design Direction

Create a premium, modern SaaS platform inspired by the provided Pulse AI Agent Management Dashboard reference.

The design must preserve the reference's core visual identity:
- Vibrant neon-lime green as the primary accent.
- Deep black and charcoal surfaces.
- Compact, information-dense dashboard layouts.
- Rounded rectangular panels with subtle borders.
- Minimal, high-contrast typography.
- Thin data visualizations, circular progress indicators, and activity heatmaps.
- A dark, permanently fixed sidebar in the admin panel.
- A consistent design system across the admin panel and public website.

The result should feel like a sophisticated AI operations platform, not a generic admin template.

**Important:** Reproduce the reference's design language and visual hierarchy, not necessarily its exact content or metrics.

## 2. Color Palette

Use the following palette as the foundation. Values are suggested approximations based on the reference image and should be fine-tuned against the original image.

### Primary colors

| Token | Hex | Usage |
|---|---|---|
| Pulse Lime | `#D5FF2F` | Primary accent, key metrics, progress highlights |
| Lime Hover | `#C5F522` | Hover and active states |
| Lime Soft | `#E8FF91` | Secondary highlights |
| Pure Black | `#050505` | Main dark background |
| Sidebar Black | `#090A08` | Persistent admin sidebar |
| Panel Dark | `#151614` | Dashboard cards and containers |
| Panel Elevated | `#1D1E1B` | Elevated panels and interactive surfaces |
| Border Dark | `#292A26` | Borders and separators |
| White | `#FFFFFF` | Primary dark-mode text |
| Muted Gray | `#92958C` | Secondary text, labels, descriptions |
| Success Green | `#64E69A` | Successful executions and positive status |
| Error Red | `#FF666D` | Failed executions and error indicators |
| Warning Amber | `#F4C66A` | Warnings and attention states |

### Light-mode colors

The light theme must retain the same Pulse identity rather than introduce a different brand palette.

| Token | Hex | Usage |
|---|---|---|
| Main Background | `#F6F7F2` | Main page background |
| Surface | `#FFFFFF` | Cards and content panels |
| Elevated Surface | `#F0F1EA` | Secondary panels and hover backgrounds |
| Primary Text | `#171812` | Headings and important text |
| Secondary Text | `#66685F` | Descriptions and metadata |
| Border | `#E3E5DA` | Dividers and card borders |
| Primary Accent | `#C9F72A` | Primary buttons and highlighted metrics |
| Accent Text | `#171812` | Text displayed on lime surfaces |

Avoid replacing the lime accent with blue or purple. Lime green is the platform's signature color.

## 3. Theme Architecture

### Admin panel

Support both light and dark modes.

**Permanent sidebar rule:** The admin sidebar must always remain dark, regardless of the selected theme.

- Sidebar background: `#090A08`.
- Sidebar text: muted light gray.
- Active navigation item: neon-lime background with dark text.
- Active icons: dark icons on the lime background.
- Inactive icons: muted gray.
- Hover states: subtle charcoal surface.
- Sidebar brand mark: lime accent.

In dark mode, the main content uses black and charcoal surfaces.

In light mode, the main content uses off-white backgrounds, white cards, dark text, and the same lime accents. The sidebar remains unchanged.

### Public website

Support both light and dark modes across the entire public-facing website.

- Reuse the same brand colors, typography, buttons, radii, and interaction styles.
- Dark mode uses near-black backgrounds and charcoal surfaces.
- Light mode uses off-white backgrounds and white surfaces.
- Maintain readable contrast in both themes.
- Provide a visible theme switcher in the header or user menu.
- Support system theme preference by default, with a saved manual override.

The public website must feel like the same product as the admin dashboard, while using more spacious layouts appropriate for marketing pages.

## 4. Typography

Use a clean modern sans-serif font.

Recommended typefaces:
- **Primary:** Inter.
- **Alternative:** Geist or Manrope.
- Use a monospace font only for technical data, identifiers, execution logs, and code.

### Typography hierarchy

| Element | Recommended style |
|---|---|
| Main dashboard heading | 24–28 px, semibold |
| Page title | 28–36 px, semibold |
| Hero headline | 48–64 px, bold |
| Section heading | 18–22 px, semibold |
| Large KPI number | 44–56 px, bold |
| Card title | 13–15 px, medium |
| Body text | 13–15 px |
| Metadata and labels | 10–12 px |
| Buttons | 12–14 px, semibold |

Keep dashboard labels compact. Use larger typography on the public website's hero section.

Use tight heading line heights and clear differences between primary information and metadata.

## 5. Layout and Spacing

### Admin dashboard

Create a dense desktop-first operations interface.

- Fixed sidebar width: approximately 120–150 px for the compact reference-inspired layout, or 220–240 px for a more readable expanded navigation.
- Main content fills the remaining viewport.
- Right-side activity panel: approximately 200–250 px when the screen allows.
- Dashboard grid: 12-column responsive layout.
- Standard card radius: 12–16 px.
- Large highlighted panel radius: 16–20 px.
- Card padding: 14–20 px.
- Gaps between cards: 8–12 px.
- Thin borders and restrained shadows.
- Avoid excessive empty space between dashboard widgets.

The reference uses a compact sidebar and tightly arranged data panels. Preserve that density on desktop without making text illegible.

### Public website

Use a more spacious layout:
- Maximum content width: 1200–1440 px.
- Centered content container.
- Section spacing: 72–112 px on desktop.
- Responsive spacing on mobile.
- Strong visual hierarchy between hero, product features, use cases, and calls to action.

## 6. Admin Panel Structure

### Persistent sidebar

Include:
- Pulse logo and wordmark.
- Dashboard.
- Agents.
- Runs.
- Analytics.
- Prompts.
- Integrations.
- Settings.
- User profile or account menu.
- Usage or credit balance near the bottom.
- Upgrade or plan action when applicable.

The active navigation item must use a lime background and dark text. Keep inactive items visually quiet.

On smaller screens, convert the sidebar into a collapsible drawer while preserving its dark appearance.

### Top navigation

Include:
- Contextual page title or greeting.
- Search input.
- Time-range selector.
- Notifications.
- User avatar and account menu.
- Theme switcher.

Use compact controls with charcoal or neutral surfaces. Avoid oversized pill buttons and excessive decoration.

## 7. Dashboard Components

### A. Primary KPI hero panel

This is the most visually prominent component in the reference.

Design:
- Large neon-lime surface.
- Dark text.
- Large bold metric.
- Small descriptive label.
- Percentage comparison or trend indicator.
- Circular progress indicator on the right.
- Subtle oversized concentric circles or abstract line patterns in the background.
- Dark pill-shaped action button.

Example content:
- Tasks completed today.
- Total executions.
- Daily usage target.
- Successful runs.

The lime panel should occupy a prominent area in the upper dashboard and visually anchor the entire interface.

### B. KPI and analytics cards

Use dark charcoal cards in dark mode and clean white cards in light mode.

Possible metrics:
- Token usage.
- Total runs.
- Success rate.
- Failed runs.
- Active agents.
- Average execution time.
- Monthly usage.

Each card should have:
- Compact title.
- Main value.
- Optional comparison or trend.
- Small chart or progress indicator when useful.

Avoid putting a separate decorative icon in every card. Let the data and typography carry the design.

### C. Line and area charts

Use thin, smooth lines with subtle area fills.

- Lime for primary performance series.
- Gray or white for neutral series.
- Red for failures.
- Minimal gridlines.
- Small axis labels.
- Small tooltips.
- Clear active data points.

Charts should remain visually restrained and fit naturally within the cards.

### D. Circular progress indicators

Use thick circular strokes with rounded ends.

- Dark track on lime surfaces.
- Muted track on neutral surfaces.
- Lime progress on dark cards.
- Dark progress on lime cards.
- Large percentage in the center.
- Small supporting label beneath.

### E. Activity heatmap

Build a compact execution-activity grid.

- Small square cells.
- Multiple shades of lime based on activity intensity.
- Dark neutral cells for periods with no activity.
- Minimal day and weekday labels.
- Tooltip on hover or tap.

### F. Active agents list

Display agent activity in a compact vertical list.

Each row contains:
- Small circular avatar or initial.
- Agent name.
- Model or category.
- Status badge.
- Task count or execution count.

Suggested statuses:
- Running.
- Idle.
- Failed.
- Paused.

Use subtle colored status indicators rather than large colorful badges.

### G. Recent activity feed

Show recent agent events, execution results, errors, and completed tasks.

- Compact timestamp.
- Agent or task name.
- Short event description.
- Small status indicator.
- Subtle separators.

Keep the feed dense and scannable.

### H. Agent performance cards

Include:
- Agent name and avatar.
- Number of tasks.
- Current status.
- Short performance chart.
- Trend percentage.
- Last execution time.

Charts should use a consistent visual style while differentiating series by meaning, not arbitrary colors.

### I. Model distribution

Display the usage share of different AI models using horizontal progress bars.

- Model name on the left.
- Percentage on the right.
- Thin horizontal track.
- Lime primary bar.
- Muted secondary bars where needed.

## 8. Agents, Runs, Analytics, Prompts, and Settings

All admin pages must use the same design system.

### Agents
- Search and filter controls.
- Agent list or compact table.
- Status, model, executions, and last activity.
- Clear primary action to create an agent.
- Agent detail page with configuration, activity, and performance.

### Runs
- Execution history.
- Searchable, filterable data table.
- Status, duration, agent, model, and timestamp.
- Execution detail page with logs and error information.
- Clear differentiation between successful, running, and failed executions.

### Analytics
- Summary KPIs.
- Usage and cost charts.
- Success-rate trends.
- Agent and model comparisons.
- Date-range filtering.

### Prompts
- Prompt list and search.
- Version history.
- Editing interface.
- Readable code or prompt text area.
- Save and publish actions.
- Clear distinction between draft and active versions.

### Integrations
- Integration list.
- Connection status.
- Setup and configuration screens.
- Compact connection indicators.
- Clear connect, disconnect, and configure actions.

### Settings
- Profile and account settings.
- Preferences and theme.
- API keys and security.
- Usage and plan information.
- Team and permissions, if supported.

## 9. Public Website Design

The public website must share the admin panel's visual identity without looking like a dashboard copied onto a marketing page.

### Header
- Pulse logo.
- Navigation links.
- Product or features menu where needed.
- Sign in.
- Primary lime call-to-action button.
- Light/dark theme switcher.

### Hero section
- Strong, concise headline.
- Supporting description.
- Primary lime CTA.
- Secondary understated CTA.
- Product preview or dashboard visualization.
- Dark and light versions of the preview must follow the selected theme.

### Features section
Present the key capabilities of the platform:
- AI agent management.
- Execution monitoring.
- Analytics and performance.
- Prompt management.
- Integrations.
- Usage and cost visibility.

Use a mixture of text-led sections, large product screenshots, charts, and occasional feature panels. Do not make every feature a repetitive rounded card.

### How it works
Use a clear three- or four-step process with concise explanations and a visual demonstration where useful.

### Use cases
Show relevant workflows and practical examples rather than generic AI marketing statements.

### Final CTA
Use a strong lime accent panel with a concise headline and one clear primary action.

### Footer
Include product links, documentation, legal pages, social links, and a restrained brand signature.

## 10. Buttons and Form Controls

### Primary button
- Lime background.
- Dark text.
- Semibold label.
- Rounded corners.
- Compact height.
- Subtle hover transition.

### Secondary button
- Dark or white surface depending on theme.
- Neutral border.
- High-contrast text.
- Lime hover accent where appropriate.

### Inputs
- Compact height.
- Rounded corners.
- Clear focus state.
- Subtle borders.
- Appropriate placeholder contrast.
- Visible validation messages.

### Toggle switches
Use lime for the enabled state and neutral gray for the disabled state.

### Tooltips and menus
Use compact panels with consistent shadows, border colors, and typography.

## 11. Interaction and Motion

Keep animation subtle and purposeful.

- Short transitions for hover and focus.
- Smooth chart loading.
- Gentle progress animations.
- Clear dropdown and modal transitions.
- Small state changes for agent execution.
- Reduced-motion support.

Avoid excessive glow, neon shadows, bouncing elements, or distracting animations.

## 12. Responsive Requirements

### Desktop
- Full dashboard grid.
- Persistent dark sidebar.
- Right-side activity panel when space permits.
- Multiple analytics widgets visible together.

### Tablet
- Collapsible sidebar.
- Two-column dashboard layouts.
- Right-side panels move below the primary content when necessary.

### Mobile
- Sidebar becomes a dark navigation drawer.
- Single-column dashboard.
- KPI cards stack vertically.
- Charts remain readable and horizontally contained.
- Tables become responsive lists or horizontally scrollable data regions.
- Theme switcher remains accessible.
- No horizontal overflow on the public website.

Do not simply shrink the desktop interface. Reorganize components according to their importance.

## 13. Accessibility and Contrast

- Maintain readable contrast in both themes.
- Never rely on color alone to communicate status.
- Provide visible keyboard focus states.
- Ensure buttons and interactive controls have accessible labels.
- Use semantic heading levels.
- Respect reduced-motion preferences.
- Keep text legible at normal zoom.

## 14. Design System and Component Reuse

Define reusable design tokens for:
- Colors.
- Typography.
- Spacing.
- Radii.
- Borders.
- Shadows.
- Chart styles.
- Status indicators.
- Buttons.
- Inputs.
- Navigation.
- Cards.
- Theme variables.

Implement the light and dark themes using centralized semantic tokens instead of manually styling every component.

The admin sidebar must use its own permanent dark-theme tokens and must not change when the main admin theme switches.

## 15. Strict Design Constraints

**Must preserve**
- Neon-lime brand accent.
- Black and charcoal dark surfaces.
- Permanent dark admin sidebar.
- Clean typography and compact dashboard hierarchy.
- Rounded, restrained panels.
- Minimal charts and high-contrast data.
- Consistent light and dark themes.
- Cohesive public and admin design language.

**Must avoid**
- Generic blue/purple SaaS palettes.
- Excessive card duplication.
- Oversized padding in dashboard widgets.
- Heavy shadows and glowing neon effects.
- Unnecessary gradients.
- Excessive decorative icons.
- Large empty dashboard regions.
- Unreadable tiny text.
- Different visual identities between the public website and admin panel.
- A light sidebar when the admin panel is in light mode.

## 16. Final Deliverables

The designer should deliver:

1. Admin dashboard — dark theme.
2. Admin dashboard — light theme with permanent dark sidebar.
3. Agents, Runs, Analytics, Prompts, Integrations, and Settings screens.
4. Public homepage — dark theme.
5. Public homepage — light theme.
6. Public feature and product-detail page templates.
7. Responsive desktop, tablet, and mobile layouts.
8. Reusable component library.
9. Color, typography, spacing, and component specifications.
10. Interactive prototype showing theme switching, navigation, dropdowns, and representative dashboard interactions.

**Final design objective:** Build a cohesive Pulse-branded AI management platform that closely follows the supplied reference's neon-lime, near-black, compact, data-driven visual language while providing a polished light mode for both the admin panel and public website.
