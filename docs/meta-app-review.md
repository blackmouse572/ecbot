# Meta App Review: submission pack

Everything needed to take the Ecbot Meta app (ID `607269115734707`, business portfolio "Necter Inc" `214031077659842`) from Development mode to Live with Advanced access. Status as of 2026-10-11.

## 1. Order of work

Meta gates each step on the one before it.

| #   | Step                                                                                 | Who                                         | Status       |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------- | ------------ |
| 1   | Business verification of Necter Inc                                                  | A person with full control of the portfolio | Not started  |
| 2   | Fix the app settings in section 2                                                    | App admin                                   | Not done     |
| 3   | Deploy this branch (data deletion callback, trimmed permissions, data deletion page) | Engineering                                 | In PR        |
| 4   | Publish the privacy policy and terms (they are still drafts with placeholders)       | Legal                                       | Not done     |
| 5   | Record the screencasts in section 5 on production                                    | Product                                     | Not done     |
| 6   | Submit App Review for Messenger (section 4)                                          | App admin                                   | Not started  |
| 7   | Access verification as a Tech Provider, then WhatsApp review                         | App admin                                   | Blocked on 1 |
| 8   | Switch the app to Live                                                               | App admin                                   | Blocked on 6 |

Business verification takes days to weeks, so start it first. It needs the business registration certificate, the legal name and address exactly as on that certificate, a phone number, and proof of the `ecbot.dev` domain (DNS TXT record or meta tag).

## 2. App settings to fix before submitting

In **App settings, Basic**:

- **User data deletion**: choose "Data deletion callback URL" and set
  `https://api-prod.ecbot.dev/api/v1/public/data-deletion/facebook`.
  The current value, `https://app.ecbot.dev/accounts/unlink`, answers Meta with a 404.
- **App domains**: remove `eccho-app.ngocvlqt1995.workers.dev`. Keep `ecbot.dev`.
- **Contact email**: use a company mailbox that can receive mail. `ecbot.dev` has no MX record today, so `support@`, `privacy@` and `security@` bounce. Fix the MX record first.
- **Privacy policy URL** and **Terms of service URL**: keep pointing at `ecbot.dev`, but the pages must be final. Reviewers reject drafts and placeholders such as "[Company legal name]".
- **App icon**: 1024 x 1024, no Meta trademarks.

In **Facebook Login for Business, Settings**: confirm the only valid OAuth redirect URI is the production account callback (the value of `VITE_FACEBOOK_REDIRECT_URI` in the app build).

## 3. What can be reviewed today

| Channel   | Reviewable   | Why                                                                                                                                                                                                                                                                                                               |
| --------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Messenger | Yes          | Connect, receive, AI reply, operator reply and handoff all work.                                                                                                                                                                                                                                                  |
| WhatsApp  | After step 7 | The adapter and Embedded Signup work, but Meta requires Tech Provider access verification first.                                                                                                                                                                                                                  |
| Instagram | No           | `InstagramPlatformAdapter` is a stub that throws 501 and the channel is disabled in the UI. Meta needs a screencast of a working feature. Build the adapter first, on Instagram Login (`instagram_business_basic`, `instagram_business_manage_messages`). The current link uses the retired Basic Display scopes. |

Requesting a permission the product cannot demonstrate gets the whole submission rejected, so submit Messenger alone first.

## 4. Permissions to request

### Messenger submission

| Permission or feature              | Where Ecbot uses it                                                                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages_show_list`                  | List the Pages the person manages so they can pick which to connect (`GET /me/accounts`).                                                                   |
| `pages_read_engagement`            | Read the name, picture, link and follower count of the chosen Page to show it in the channel list.                                                          |
| `pages_manage_metadata`            | Subscribe the Page to the app webhook so new messages arrive (`POST /{page-id}/subscribed_apps`).                                                           |
| `pages_messaging`                  | Receive customer messages and send the AI agent's and the operator's replies (`POST /{page-id}/messages`), and read recent conversation history on connect. |
| `business_management`              | Include Pages the person manages through a business portfolio in the Page list.                                                                             |
| Business Asset User Profile Access | Show the customer's first name, last name and profile picture next to the conversation.                                                                     |

Do not request anything else. The login no longer asks for `pages_manage_posts`, `pages_manage_ads`, `pages_manage_engagement`, `pages_read_user_content` or the deprecated `pages_messaging_subscriptions`. Remove them from the app's permission list too.

### WhatsApp submission (after Tech Provider verification)

| Permission                     | Where Ecbot uses it                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `whatsapp_business_management` | Read the WhatsApp Business account and phone numbers shared through Embedded Signup, and subscribe the app to its webhook. |
| `whatsapp_business_messaging`  | Receive customer messages and send replies from the connected number.                                                      |

## 5. Submission text

Paste one block per permission. Meta wants: what the permission is for, how a person benefits, and where to see it in the screencast.

**pages_show_list**

> Ecbot is a customer service inbox with an AI agent for businesses. When a business owner connects Facebook, Ecbot lists the Pages they manage so they can choose which Page the agent should answer for. We only read the list of Pages and never post on them. In the screencast, the list appears right after the Facebook login dialog (0:25).

**pages_read_engagement**

> After the owner picks a Page, Ecbot reads the Page name, profile picture and link and shows them in the Channels screen, so the team can tell their connected Pages apart. We do not read posts, comments or insights. In the screencast, the connected Page card shows this data (0:40).

**pages_manage_metadata**

> Ecbot subscribes the selected Page to our webhook so that new Messenger messages reach the inbox in real time. Without it the business would not receive any customer message in Ecbot. We do not change any Page setting. In the screencast, a message sent to the Page appears in the Ecbot inbox within seconds (1:05).

**pages_messaging**

> This is the core of the product. When a customer messages the Page, Ecbot shows the conversation in a shared inbox, an AI agent drafts and sends an answer from the business's own knowledge base, and a staff member can take over and reply by hand at any time. Replies are only sent in response to a customer message, inside the standard messaging window. In the screencast, the customer message arrives (1:05), the AI agent replies (1:20), and a staff member takes over and replies (1:45).

**business_management**

> Many of our customers manage their Pages through a business portfolio rather than as personal Page admins. Ecbot uses this permission only to include those Pages in the list the owner chooses from when connecting a channel. We do not read or change ad accounts, catalogs, people or any other business asset. In the screencast, a Page owned by a business portfolio appears in the Page list (0:25).

**Business Asset User Profile Access**

> Ecbot shows the customer's name and profile picture next to their conversation so staff know who they are talking to and can greet them by name. The data is shown only to members of the workspace that owns the Page. In the screencast, the customer's name and picture appear in the conversation header (1:10).

**whatsapp_business_management**

> Businesses connect their WhatsApp number through Embedded Signup. Ecbot uses this permission to read the WhatsApp Business account and phone numbers the business chose to share, and to subscribe to message webhooks for that account. In the screencast, the shared number appears in Channels after signup (0:45).

**whatsapp_business_messaging**

> Ecbot receives messages sent to the connected WhatsApp number, shows them in the shared inbox, and sends the AI agent's or a staff member's reply. Replies are sent only inside the customer service window opened by the customer. In the screencast, a WhatsApp message arrives (1:00) and is answered (1:20).

Timestamps are placeholders. Replace them with the real ones after recording.

## 6. Screencast scripts

Record on production (`https://app.ecbot.dev`) in English, 1080p, with the browser address bar visible. Show the Facebook login dialog in full, including the permission list. No cuts between the login and the first reply.

### Messenger (about 2 minutes)

1. Sign in to Ecbot with the reviewer account. Show the workspace.
2. Open **Channels**, choose **Connect a channel**, then Facebook.
3. In the Facebook dialog, log in, show every permission requested, pick the test Page, and confirm.
4. Back in Ecbot, show the Page list and the connected Page card (name, picture).
5. In a second window, as a different Facebook user, send "Hi, what are your opening hours?" to the Page.
6. In Ecbot, open **Conversations**. Show the message, the customer's name and picture.
7. Show the AI agent's reply arriving in both Ecbot and Messenger.
8. Take over the conversation in Ecbot and send a manual reply. Show it arrive in Messenger.
9. Open **Channels**, remove the Page, and show that it is gone.

### WhatsApp (about 2 minutes)

1. In **Channels**, choose WhatsApp. Complete Embedded Signup with the test business and number.
2. Show the number listed in Channels.
3. From a personal phone, send a message to the number. Show it in Ecbot.
4. Show the AI reply, then a manual reply, arriving on the phone.

## 7. Reviewer access

Meta asks for a working login. Prepare:

- A dedicated reviewer account on production with a verified email, in a workspace that already has one agent with a small knowledge base.
- A test Facebook Page whose admin is a test user the reviewer can log in as, or step-by-step notes that the reviewer may use their own Page.
- Turnstile must not block the reviewer. If it does, note it in the instructions.

Enter the credentials in Meta's form yourself. Do not commit them.

## 8. Known gaps that do not block the first review

- **24-hour window**: staff cannot reply to a Messenger customer after 24 hours. Supporting it needs the Human Agent feature and the `HUMAN_AGENT` message tag, which is a separate permission and screencast.
- **Deauthorize callback**: not implemented. The data deletion callback covers the review requirement; a deauthorize callback would also mark the channel disconnected when someone removes the app without asking for deletion.
- **Confirmation code lookup**: the code is written to the API log with the Facebook user id. There is no status table yet, so support looks a code up in the logs.
