// English defaults for the admin-editable content pages. The localized
// copies live in messages/<locale>.json and take precedence when present.
export const DEFAULT_PAGE_CONTENT = {
  faq: `### What is Link Unlocker?
Link Unlocker turns any link or file into a short unlock page. You choose the steps a visitor must complete — following a channel, liking a video, joining a Discord server, leaving a comment or simply visiting a page — and the content is revealed only after those steps are done. You keep one short link to share instead of a giveaway spreadsheet, a pile of screenshots or a manual check of every entry.

### Is Link Unlocker really free?
Yes. Creating links, protecting files, collecting email addresses, the bio page and the analytics dashboard are all included. There are no premium tiers, credits, trials or per-unlock fees. We do not charge visitors either.

### How does a visitor unlock my content?
The flow is the same for every link:
- The visitor opens your short link and sees the actions you configured.
- We create a private session that lasts two hours.
- The visitor completes each action in order and returns to the card.
- When every required step is complete, the content opens: a destination URL, a file download, or a message shown on the page.
The visitor never needs a Link Unlocker account unless the link asks for one.

### Which platforms and actions can I use?
The built-in catalog covers YouTube, Instagram, Facebook, TikTok, Discord, Spotify and any other website. It includes 17 actions, such as subscribe, like, comment, watch, follow, join a server, boost a server, listen to a track and visit a page. You can combine several actions on one link and ask for an email address as an extra step.

### Are the actions verified?
No. Every step is completed by the visitor: they open the link, wait the time the creator set, and mark the step as done. We do not check whether a subscription, like, comment, share or view actually happened on YouTube or anywhere else, and we never ask a visitor to sign in to Google or connect an account. The card records a step as completed, not verified.

### What does the visitor have to share?
Nothing beyond what a step asks for — an email address, only if the creator added the optional email step. There is no Google sign-in, no account connection and no password.

### What happens if a link expires or is paused?
You can set an expiry date on any link. Once a link expires, or while it is paused, the unlock page stops immediately and tells the visitor that the link is no longer available. You can re-enable a paused link from your dashboard at any time. An expired session cannot be extended from the browser; the visitor starts again with a fresh session.

### Who can see the content I protect?
Only a visitor whose session completed every required step. The server checks the session on every request and refuses incomplete sessions, so a copied unlock URL on its own does not reveal anything. Downloads are issued per session. A destination URL is visible to the visitor once it is unlocked, so treat it as shareable and do not put secrets in a URL you hand out.

### Can I collect email addresses?
Yes, as an optional action. Visitors see why the address is requested and must actively consent before it is stored. Addresses are kept per link, visible only to you, and can be exported as a CSV file or deleted from the dashboard. We never sell them or share them with other creators.

### Do I need an account to use Link Unlocker?
You can publish one link as a guest; the browser keeps a signed cookie so you can still manage that link. A free account is required for additional links, file uploads, email lists, analytics, milestones and the bio page.

### Can I protect a file instead of a website link?
Yes. Upload a file from the dashboard, choose the file-download mode when you create the link, and the file is streamed only after the visitor completes the steps. Files are private by default and must match the type and size limits set by the operator of this installation.

### What analytics will I see?
You get counts of views, unlock starts, completed actions and completed unlocks for each link, a 14-day chart and a per-link conversion table. These are aggregate counts attached to the link, not profiles of individual visitors. We do not sell analytics or pass them to advertisers.

### How long does a link last?
A link stays available until you delete it, unless you set an expiry date. Each unlock session lasts two hours, which is usually enough to complete the steps without keeping a session open indefinitely.

### What is not allowed?
No malware, phishing, pirated content, harassment, impersonation, scams, or anything that breaks the rules of the platform you are using. Do not ask visitors for passwords, payment details or identity documents. Do not use the service to collect email addresses for spam. We can disable links and accounts that generate credible abuse reports.

### How do I report a link?
Use the report link shown on the unlock page, or send us the short link through the contact page. Reports are reviewed first and are not shown to the link owner. If you include an email address we can reply when the report is resolved.

### Can I delete my data?
Deleting a link also deletes its unlock sessions, analytics and collected email addresses. You can delete individual addresses from your email list at any time. To close your account and remove your profile data, contact us — there is no self-service delete button yet, so we handle it manually.

### What if a platform changes its API?
Our steps do not depend on a platform API: the visitor opens the link, waits and marks the step done. If a target page stops working, the creator can update it. No step claims to be verified, so a platform change cannot invalidate a completed step.

### How do I get help?
Email [support@linkunlock.app](mailto:support@linkunlock.app) for product questions or account help, and use the report link on an unlock page for abuse. Including the short link and the step you are stuck on helps us answer faster.`,
  privacy: `## Who this policy covers
Link Unlocker is operated by the team behind this website ("we", "us"). This policy explains what happens to personal data when you browse the public site, unlock a link, create links as a creator or contact us. It applies to this installation of the service, not to the social platforms you interact with — those platforms have their own policies, and completing an action there is also governed by their rules.

## Data we collect
- **Account data:** your name, email address and a hashed password when you register, plus profile details such as an avatar if you add them.
- **Link and file data:** the links you create, their configuration, the destination URLs you paste, uploaded cover images and any files you protect.
- **Email leads:** addresses visitors submit to you through the optional email action, together with the time they consented.
- **Unlock and analytics data:** views, unlock starts, completed actions, completed unlocks, and technical data such as a hashed IP address, browser user-agent and referring page.
- **Abuse reports:** the link you report, the reason and details you provide, an optional email address, and a hashed IP address.
- **Support messages:** whatever you send us when you ask for help.
We do not ask for payment details because the service has no paid plans.

## How we use the data
We use account and link data to run, secure and support the service; analytics data to show creators how their links perform; email leads to deliver the addresses a visitor chose to share with that creator; and abuse reports to investigate misuse. Technical data is used for rate limiting, fraud prevention and keeping sessions working. We do not use your data to build advertising profiles about you.

## Legal bases
Where data protection law requires a legal basis, we rely on:
- **Contract:** to provide the service you asked for.
- **Legitimate interests:** to secure the service, prevent abuse and understand aggregate performance.
- **Consent:** for optional email collection and for any non-essential cookie that asks for one. A visitor gives this consent directly to the creator.
- **Legal obligation:** to respond to valid legal requests or to defend legal claims.

## Cookies and local storage
- **Session cookie:** keeps a signed-in creator signed in. It is HTTP-only and same-site.
- **Guest cookie:** remembers the one free link created by a guest so the same browser can still manage it.
- **Locale cookie:** remembers the language you chose.
- **Theme preference:** may be stored in your browser so light or dark mode survives a reload.
These are used to make the service work. If the operator enables an advertising unit, that ad may load resources from its own provider and may set its own cookies; we do not pass your account details or collected email addresses to advertisers.

## Unlock sessions and visitor data
When a visitor opens a link, we create a short-lived session that expires after two hours. For unlock analytics and rate limiting we store the visitor's IP address only as a salted hash, together with the browser user-agent and referring page. Sign-in sessions may also record an IP address and browser so an account holder can review access. We use this data to keep the service available and to investigate abuse, not to follow visitors around the web.

## Email addresses collected by creators
The email action is optional and only appears when a creator adds it to a link. The address is stored with the time of consent, only the owner of that link can see or export it, and it is deleted when the link is deleted or when the owner removes it. Creators are responsible for using those addresses lawfully and for honouring any withdrawal of consent they receive.

## Completed steps, not account checks
Some steps point at a social platform, but we do not connect to the visitor's account there. A step is recorded as completed when the visitor opens it, waits the time the creator configured and marks it done. We store the completion time per step and session. We do not verify that a subscription, like, comment, share or view actually happened, and we do not ask for a Google sign-in.

## Files and uploads
Files and images you upload are stored by the service and delivered only to sessions that completed the link's steps. File names, sizes and MIME types are stored so the file can be streamed and shown in the dashboard. Deleting a file disables the links that referenced it.

## Sharing and processors
We do not sell personal data. We share the minimum necessary with:
- Hosting and database providers that run the service.
- Email delivery providers, when a password-reset or contact email has to be sent.
- Platform APIs used for optional checks the operator has enabled.
- Authorities or other parties when the law requires it, or when it is necessary to investigate credible abuse.
These providers process data on our instructions or under their own terms, and may operate in countries other than yours. Where required, we rely on appropriate safeguards for those transfers.

## Retention
Unlock sessions expire after two hours. Analytics events are kept while the link exists so a creator can see historical totals. Email leads are kept until the link or the individual address is deleted. Abuse reports are kept as long as needed to resolve the report and prevent repeat abuse. Rate-limit records are short-lived. Deleting a link removes its sessions, events and leads with it. Backup copies may remain for a short period before they are overwritten.

## Security
Passwords are hashed, traffic is served over HTTPS, session cookies are HTTP-only, and access to another creator's links is checked on the server. We apply rate limits to sensitive actions. No service can promise perfect security, but we keep the surface small: we do not store payment details, and verification reads are limited to the single fact an action needs.

## Your rights
Depending on where you live, you may have the right to access, correct, export, restrict or delete your personal data, to object to some processing, and to withdraw consent. You can exercise most of these from the dashboard. For anything else, contact us and we will respond within the time required by law. You also have the right to complain to your local data-protection authority.

## Children
The service is not intended for children below the age at which they can consent to data processing in their country. We do not knowingly collect data from children. If you believe a child has created an account, contact us and we will remove it.

## Changes to this policy
We update this page when the way we handle data changes. The date at the top shows when it was last reviewed. If a change is material, we will announce it on the site or by email to account holders.

## Contact
Questions, requests or complaints: [support@linkunlock.app](mailto:support@linkunlock.app). We answer privacy requests first.`,
  terms: `## Agreement to these terms
By using Link Unlocker — as a creator, a visitor or a reporter — you agree to these terms. If you do not agree, do not use the service. If you use the service for an organisation, you confirm that you are allowed to accept these terms for it.

## What the service does
Link Unlocker lets a creator publish a short link whose content is revealed after a visitor completes configured actions, such as following a channel or joining a server. The service is free and has no paid plans. We do not charge visitors and do not pay creators; there is no reward, sweepstake or prize connected to the service.

## Accounts and guest links
You can create one link as a guest. Additional links and features such as files, email lists, analytics and the bio page require a free account. Keep your credentials secure and tell us promptly if you believe someone else has access to your account. You are responsible for activity under your account.

## Your responsibilities as a creator
You must:
- own or have permission to share the content you protect;
- describe the protected content honestly and deliver what the page promises;
- ask only for actions you are entitled to request, and respect each platform's rules;
- collect email addresses only with clear consent and use them lawfully;
- keep your links and their destinations up to date, and remove content you no longer have the right to share.
You are the controller of the email addresses you collect through your links. Link Unlocker stores and displays them to you but does not use them for its own marketing.

## Prohibited uses
Do not use Link Unlocker to:
- distribute malware, phishing pages, pirated material or content that infringes someone else's rights;
- harass, threaten, impersonate or deceive people;
- run scams, fake giveaways or engagement schemes that break a platform's rules;
- ask visitors for passwords, payment card details, government identifiers or other sensitive credentials;
- collect email addresses for spam, resale or unrelated marketing;
- probe, overload or attempt to bypass the service's security or rate limits.
We may remove content or disable links and accounts that breach these rules.

## Third-party platforms
The actions in a link happen on third-party platforms. We do not control those platforms, their availability, their rules or their data practices. Completing an action does not create any relationship between you and us beyond these terms, and a platform may change its API, permissions or limits at any time. Steps are self-reported: a step counts once the visitor opens it and the configured wait has passed. We do not confirm that a subscription, like, comment, share or view actually happened, and we do not ask visitors to connect a Google account.

## Content and ownership
You keep the rights you already hold in the content you upload or link to. You give us a limited licence to store, display and deliver that content for the purpose of running your links and showing them in your dashboard. You confirm that you have the rights needed to grant that licence. We own the service, its software and its branding; these terms do not transfer any of that ownership to you.

## Visitors and consent
Visitors must complete the steps themselves. Creators must not complete actions on a visitor's behalf, automate them, or misrepresent what will be unlocked. Email collection requires an affirmative consent from the visitor; pre-ticked boxes, bundled consent or a requirement hidden in unrelated copy do not count. Creators must honour withdrawal of consent and applicable marketing law in the visitor's country.

## Files and limits
Uploaded files must match the allowed types and size limits shown in the dashboard, which the operator can change. Do not use file delivery to distribute material you do not have the right to share. We may disable a file and any links that depend on it if it breaches these terms or generates an abuse report.

## Availability and changes
The service is provided on an as-is and as-available basis. We may add, change or discontinue features, set usage limits, or suspend the service for maintenance. Where a change materially affects your links, we will try to give reasonable notice on the site or by email. We do not guarantee that a link will stay online forever.

## Suspension and termination
You can stop using the service at any time and delete your links. We may suspend or terminate access if you breach these terms, if your links generate credible abuse reports, or if the law requires it. Where practical, we will explain the reason. Content that is illegal, harmful or the subject of a valid complaint may be removed immediately.

## Disclaimers
We do not promise a particular number of followers, views, clicks, unlocks or revenue, and we do not guarantee that a platform will recognise or verify an action. The service is provided without warranties to the extent permitted by law. Nothing in these terms excludes rights that consumers have under mandatory local law.

## Limitation of liability
To the extent permitted by law, we are not liable for indirect or consequential loss, loss of profit, loss of data, or loss caused by a third-party platform, a visitor's conduct or content you chose to protect. Where liability cannot be excluded, it is limited to the amount you paid us in the twelve months before the claim — which, because the service is free, is zero. This does not limit liability for fraud, wilful misconduct or anything else that cannot be limited by law.

## Indemnity
You agree to indemnify us against claims and costs arising from content you protected, actions you asked visitors to complete, or your breach of these terms or of a third party's rights, to the extent permitted by law. We will tell you about a claim and let you take part in the defence.

## Governing law and disputes
These terms are governed by the laws that apply to the operator of this site, without regard to conflict-of-law rules. If you are a consumer, you keep the protection of the mandatory laws of your country of residence and may bring a claim there. Before starting a formal dispute, contact us so we can try to resolve it.

## Changes to these terms
We may update these terms as the service evolves. The date at the top shows the current version. If a change is material, we will announce it on the site or by email to account holders. Continuing to use the service after the change means you accept the updated terms.

## Contact
Questions about these terms: [support@linkunlock.app](mailto:support@linkunlock.app). For a link that breaks these rules, use the report link on its unlock page.`,
  contact: `Questions about a link, your account or the platform? Email us at [support@linkunlock.app](mailto:support@linkunlock.app).
Abuse reports are triaged first. Include the public link URL so we can investigate quickly.`,
} as const
